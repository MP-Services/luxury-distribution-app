import {FieldValue, Firestore} from '@google-cloud/firestore';
import {
  deleteMetafields,
  getLuxuryShopInfoByShopifyId,
  getLuxuryShops,
  getLuxuryStockList,
  getStockById,
  updateLuxuryData
} from '@functions/repositories/luxuryRepository';
import {getBrandSettingShopId} from '@functions/repositories/settings/brandRepository';
import {getSyncSettingShopId} from '@functions/repositories/settings/syncRepository';
import {
  batchCreate,
  batchDelete,
  batchUpdate,
  hasCommonElement
} from '@functions/repositories/helper';
import {
  getLocationQuery,
  getOnlineStorePublication,
  runDeleteProductMutation,
  runMetafieldDefinitionMutation,
  runProductAdjustQuantitiesMutation,
  runProductCreateMutation,
  runProductVariantsBulkMutation,
  runProductUpdateMutation,
  runMetafieldsSetMutation,
  UPDATE_PRODUCT_VARIANTS_BULK_MUTATION,
  getProductMediaQuery,
  runFileDeleteMutation,
  runProductOptionUpdateMutation,
  runMetafieldDelete,
  METAFIELDS_DELETE_VALUE_MUTATION,
  getProductVariants as getProductVariantsGraphQl
} from '@functions/services/shopify/graphqlService';
import {getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {getMappingDataWithoutPaginate} from '@functions/repositories/settings/categoryRepository';
import productMetafields from '@functions/const/productMetafields';
import {getGeneralSettingShopId} from '@functions/repositories/settings/generalRepository';
import {getAttributeMappingData} from '@functions/repositories/settings/attributeMappingRepository';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getCurrencies} from '@functions/repositories/currencyRepository';
import {chunk, delay} from '@avada/utils';
import {
  addLuxuryProduct,
  addLuxuryProducts,
  convertLuxuryProductFromTemp,
  deleteLuxuryProductByShopifyId,
  deleteLuxuryProductShops,
  getLuxuryProducts,
  saveLuxuryProduct
} from '@functions/repositories/luxuryProductRepository';
import {importSizes} from '@functions/repositories/sizeRepository';
import {
  getShopifyProductDoc,
  getShopifyProductByDoc,
  saveShopifyProduct
} from '@functions/repositories/shopifyProductRepository';
import {addStockTemps, getStockTemps} from '@functions/repositories/luxuryStockTempRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('productQueues');

/**
 *
 * @param shopId
 * @returns {Promise<number>}
 */
export async function getProductsCount(shopId) {
  try {
    const productCounts = await collection
      .where('shopifyId', '==', shopId)
      .count()
      .get();
    return productCounts.data().count;
  } catch (e) {
    console.error(e);
    return 0;
  }
}

/**
 *
 * @param shopId
 * @param limit
 * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>|boolean>}
 */
export async function getQueueQuery(shopId, limit = 0) {
  try {
    return await collection
      .where('shopifyId', '==', shopId)
      .where('status', '!=', ['success', 'failed'])
      .where('locked', '==', false)
      .orderBy('createdAt')
      .limit(limit)
      .get();
  } catch (e) {
    console.log(e);
  }

  return false;
}

/**
 *
 * @param shopId
 * @returns {Promise<*[]>}
 */
export async function syncProducts(shopId) {
  let queues = null;
  try {
    const [luxuryInfo, shop] = await Promise.all([
      getLuxuryShopInfoByShopifyId(shopId),
      getShopByIdIncludeAccessToken(shopId)
    ]);

    if (luxuryInfo?.deleteApp || !luxuryInfo?.completeInitQueueAction) {
      return true;
    }
    const [
      syncSetting,
      generalSetting,
      categoryMappings,
      brandFilterSetting,
      queueQuery,
      sizeAttributeMapping,
      defaultLocationId
    ] = await Promise.all([
      getSyncSettingShopId(shopId),
      getGeneralSettingShopId(shopId),
      getMappingDataWithoutPaginate(shopId),
      getBrandSettingShopId(shopId),
      getQueueQuery(shopId, 10),
      getAttributeMappingData(shopId),
      getLocationQuery({shop})
    ]);

    if (
      queueQuery.empty ||
      !defaultLocationId ||
      !brandFilterSetting ||
      brandFilterSetting.brands.length === 0
    ) {
      return [];
    }
    queues = queueQuery;
    const [newQueueQueryDocs, excludeDocs] = filterQueueDocs(queueQuery);
    const actionsBeforeSync = [getOnlineStorePublication({shop}), lockQueues(queueQuery)];
    if (excludeDocs.length) {
      actionsBeforeSync.push(bulkUpdateSuccess(excludeDocs));
    }
    const beforeActionsResult = await Promise.all(actionsBeforeSync);
    const onlineStore = beforeActionsResult[0];
    if (newQueueQueryDocs.length) {
      await Promise.all(
        newQueueQueryDocs.map(async queueDoc => {
          const queueData = queueDoc.data();
          switch (queueData.status) {
            case 'delete':
              await actionQueueDelete({shop, queueDoc, luxuryInfo, queueData});
              break;
            case 'create':
              await actionQueueCreate({
                shop,
                categoryMappings,
                syncSetting,
                generalSetting,
                sizeAttributeMapping,
                defaultLocationId,
                onlineStore,
                queueDoc,
                queueData,
                luxuryInfo,
                brandFilterSetting
              });
              break;
            case 'update':
              await actionQueueUpdate({
                shop,
                syncSetting,
                generalSetting,
                categoryMappings,
                sizeAttributeMapping,
                defaultLocationId,
                onlineStore,
                queueDoc,
                queueData,
                luxuryInfo,
                brandFilterSetting
              });
          }
        })
      );
    }
  } catch (e) {
    console.log(e);
  }

  if (queues) {
    return lockQueues(queues, false);
  }

  return true;
}

/**
 *
 */
export async function lockQueues(queueQuery, locked = true) {
  return batchUpdate(firestore, queueQuery.docs, {locked});
}

/**
 *
 * @param queueQuery
 * @returns {*[]}
 */
function filterQueueDocs(queueQuery) {
  const docs = [];
  const excludeDocs = [];
  const stockIds = [];
  for (const doc of queueQuery.docs) {
    const queue = doc.data();
    if (
      queue.status === 'delete' ||
      (queue.status !== 'delete' && !stockIds.includes(queue.stockId))
    ) {
      docs.push(doc);
      stockIds.push(queue.stockId);
    } else {
      excludeDocs.push(doc);
    }
  }

  return [docs, excludeDocs];
}

/**
 *
 * @param shop
 * @param categoryMappings
 * @param syncSetting
 * @param generalSetting
 * @param sizeAttributeMapping
 * @param defaultLocationId
 * @param onlineStore
 * @param queueDoc
 * @param queueData
 * @param luxuryInfo
 * @param brandFilterSetting
 * @returns {Promise<*|void|undefined>}
 */
async function actionQueueCreate({
  shop,
  categoryMappings,
  syncSetting,
  generalSetting,
  sizeAttributeMapping,
  defaultLocationId,
  onlineStore,
  queueDoc,
  queueData,
  luxuryInfo,
  brandFilterSetting
}) {
  const {id: shopifyId} = shop;
  const stock = await getStockById(queueData.stockId, luxuryInfo);
  if (!stock) {
    return updateQueueDoc(queueDoc, queueData);
  }
  if (stock && !stock?.id) {
    return updateQueueDoc(queueDoc, queueData, 'success');
  }
  const shopifyProductCreatedDoc = await getShopifyProductDoc(shopifyId, queueData.stockId);
  const brandsFilter =
    brandFilterSetting?.brands && brandFilterSetting.brands.length
      ? brandFilterSetting.brands.map(brand => brand.toUpperCase())
      : null;
  if (
    !shopifyProductCreatedDoc &&
    brandsFilter &&
    brandsFilter.includes(stock.brand.toUpperCase())
  ) {
    return Promise.all([
      saveLuxuryProduct(shopifyId, stock),
      actionCreateShopifyProduct({
        shop,
        categoryMappings,
        syncSetting,
        generalSetting,
        sizeAttributeMapping,
        defaultLocationId,
        onlineStore,
        queueDoc,
        queueData,
        luxuryInfo,
        productData: stock
      })
    ]);
  }
  if (
    shopifyProductCreatedDoc &&
    brandsFilter &&
    brandsFilter.includes(stock.brand.toUpperCase())
  ) {
    // Action update shopify product
    return Promise.all([
      saveLuxuryProduct(shopifyId, stock),
      actionUpdateShopifyProduct({
        shop,
        syncSetting,
        generalSetting,
        categoryMappings,
        sizeAttributeMapping,
        defaultLocationId,
        onlineStore,
        queueDoc,
        queueData,
        luxuryInfo,
        brandFilterSetting,
        shopifyProductCreatedDoc,
        stock
      })
    ]);
  }
  if (
    shopifyProductCreatedDoc &&
    (!brandsFilter || !brandsFilter.includes(stock.brand.toUpperCase()))
  ) {
    // Action delete shopify product
    return actionQueueDelete({
      shop,
      queueDoc,
      luxuryInfo,
      queueData,
      isDeleteLxProduct: false
    });
  }
}

/**
 *
 * @param shop
 * @param categoryMappings
 * @param syncSetting
 * @param generalSetting
 * @param sizeAttributeMapping
 * @param defaultLocationId
 * @param onlineStore
 * @param queueDoc
 * @param queueData
 * @param luxuryInfo
 * @param productData
 * @returns {Promise<void|*>}
 */
async function actionCreateShopifyProduct({
  shop,
  categoryMappings,
  syncSetting,
  generalSetting,
  sizeAttributeMapping,
  defaultLocationId,
  onlineStore,
  queueDoc,
  queueData,
  luxuryInfo,
  productData
}) {
  let sizesQuantityDelta = productData.size_quantity.filter(item => !Array.isArray(item));
  if (generalSetting?.deleteOutStock) {
    if (Number(productData.qty) === 0) {
      return updateQueueDoc(queueDoc, queueData, 'success');
    } else {
      sizesQuantityDelta = sizesQuantityDelta.filter(item => Number(Object.values(item)[0]));
    }
  }
  const {productVariables, margin} = addCollectionsToProductVariables(
    categoryMappings,
    syncSetting,
    productData,
    getProductVariables({
      generalSetting,
      syncSetting,
      productData,
      sizeAttributeMapping,
      onlineStore,
      sizesQuantityDelta
    })
  );
  const shopifyProduct = await runProductCreateMutation({
    shop,
    variables: productVariables
  });

  if (shopifyProduct) {
    const sizes = sizesQuantityDelta.map(item => Object.keys(item)[0]);
    const shopifyProductSave = {
      shopifyProductId: shopifyProduct.id,
      stockId: queueData.stockId,
      product_category_id: productData.product_category_id,
      sizes
    };
    let productAdjustQuantitiesVariables = null;
    const productVariantsVariables = await getProductVariantsVariables({
      shopifyProductId: shopifyProduct.id,
      productData,
      productOptionId: shopifyProduct.options[0].id,
      optionValuesProduct: shopifyProduct.options[0].optionValues,
      margin,
      generalSetting
    });
    const {productVariants: productVariantsReturn} = await runProductVariantsBulkMutation({
      shop,
      variables: productVariantsVariables
    });
    if (productVariantsReturn) {
      productAdjustQuantitiesVariables = getProductAdjustQuantitiesVariables(
        productVariantsReturn,
        sizesQuantityDelta,
        defaultLocationId
      );
      await runProductAdjustQuantitiesMutation({
        shop,
        variables: productAdjustQuantitiesVariables.variables
      });
    }
    shopifyProductSave.productOptionsAfterMap = sizeOptionMapping(
      sizes,
      sizeAttributeMapping,
      shopifyProduct.options[0].optionValues,
      productAdjustQuantitiesVariables ? productAdjustQuantitiesVariables.variants : null,
      shopifyProduct.options[0].id
    );
    return Promise.all([
      saveShopifyProduct(shop.id, shopifyProductSave),
      updateQueueDoc(queueDoc, queueData, 'success')
    ]);
  } else {
    return updateQueueDoc(queueDoc, queueData);
  }
}

/**
 *
 * @param shop
 * @param syncSetting
 * @param generalSetting
 * @param categoryMappings
 * @param sizeAttributeMapping
 * @param defaultLocationId
 * @param onlineStore
 * @param queueDoc
 * @param queueData
 * @param luxuryInfo
 * @param brandFilterSetting
 * @returns {Promise<void>}
 */
async function actionQueueUpdate({
  shop,
  syncSetting,
  generalSetting,
  categoryMappings,
  sizeAttributeMapping,
  defaultLocationId,
  onlineStore,
  queueDoc,
  queueData,
  luxuryInfo,
  brandFilterSetting
}) {
  const {id: shopifyId} = shop;
  const [stock, shopifyProductCreatedDoc] = await Promise.all([
    getStockById(queueData.stockId, luxuryInfo),
    getShopifyProductDoc(shopifyId, queueData.stockId)
  ]);
  if (!stock) {
    return updateQueueDoc(queueDoc, queueData);
  }
  const brandsFilter =
    brandFilterSetting?.brands && brandFilterSetting.brands.length
      ? brandFilterSetting.brands.map(brand => brand.toUpperCase())
      : null;
  if (!shopifyProductCreatedDoc && stock?.id && brandsFilter.includes(stock.brand.toUpperCase())) {
    return Promise.all([
      saveLuxuryProduct(shopifyId, stock),
      actionCreateShopifyProduct({
        shop,
        categoryMappings,
        syncSetting,
        generalSetting,
        sizeAttributeMapping,
        defaultLocationId,
        onlineStore,
        queueDoc,
        queueData,
        luxuryInfo,
        productData: stock
      })
    ]);
  }
  if (shopifyProductCreatedDoc && !brandsFilter.includes(stock.brand.toUpperCase())) {
    return actionQueueDelete({shop, queueDoc, queueData, luxuryInfo, isDeleteLxProduct: false});
  }
  if (shopifyProductCreatedDoc && !stock?.id) {
    return actionQueueDelete({shop, queueDoc, queueData, luxuryInfo});
  }
  return Promise.all([
    saveLuxuryProduct(shopifyId, stock),
    actionUpdateShopifyProduct({
      shop,
      syncSetting,
      generalSetting,
      categoryMappings,
      sizeAttributeMapping,
      defaultLocationId,
      onlineStore,
      queueDoc,
      queueData,
      luxuryInfo,
      brandFilterSetting,
      shopifyProductCreatedDoc,
      stock
    })
  ]);
}

/**
 *
 * @param shop
 * @param syncSetting
 * @param generalSetting
 * @param categoryMappings
 * @param sizeAttributeMapping
 * @param defaultLocationId
 * @param onlineStore
 * @param queueDoc
 * @param queueData
 * @param luxuryInfo
 * @param brandFilterSetting
 * @param shopifyProductCreatedDoc
 * @param stock
 */
export async function actionUpdateShopifyProduct({
  shop,
  syncSetting,
  generalSetting,
  categoryMappings,
  sizeAttributeMapping,
  defaultLocationId,
  onlineStore,
  queueDoc,
  queueData,
  luxuryInfo,
  brandFilterSetting,
  shopifyProductCreatedDoc,
  stock
}) {
  const stockSizeQuantity = stock.size_quantity.filter(item => !Array.isArray(item));
  const shopifyProductCreated = shopifyProductCreatedDoc.data();
  const productId = shopifyProductCreated.shopifyProductId;
  const productOptionId = shopifyProductCreated?.productOptionsAfterMap[0]?.productOptionId;
  const fileIdsToDelete = await getFileIdsToDelete(shop, productId);
  if (fileIdsToDelete) {
    await runFileDeleteMutation({shop, variables: {fileIds: fileIdsToDelete}});
  }
  const productMediaData = getProductMediaData(stock);
  const initProductVariables = {
    product: {
      id: productId,
      title: generalSetting?.includeBrand ? `${stock.name} ${stock.brand}` : stock.name,
      descriptionHtml: syncSetting?.description ? stock.description : ''
    },
    media: syncSetting?.images ? productMediaData : []
  };
  const {productVariables, margin} = addCollectionsToProductVariables(
    categoryMappings,
    syncSetting,
    shopifyProductCreated,
    initProductVariables
  );

  let productOptionsAfterMap = shopifyProductCreated?.productOptionsAfterMap;
  const metafieldsData = getMetafieldsData(shopifyProductCreated);
  const metafieldsDelete = metafieldsData.filter(metafield => !metafield.value);
  const metafieldsUpdate = metafieldsData.filter(metafield => metafield.value);
  if (metafieldsDelete.length) {
    const metafieldsVariableDelete = metafieldsDelete.map(item => {
      const {key, namespace, ownerId} = item;
      return {key, namespace, ownerId};
    });
    await runMetafieldDelete({
      shop,
      variables: {metafields: metafieldsVariableDelete},
      query: METAFIELDS_DELETE_VALUE_MUTATION
    });
  }
  const [productUpdateMutation, metafieldsSetMutation] = await Promise.all([
    runProductUpdateMutation({
      shop,
      variables: productVariables
    }),
    runMetafieldsSetMutation({
      shop,
      variables: {metafields: metafieldsUpdate}
    })
  ]);
  const shopifyProductSave = {
    stockId: queueData.stockId,
    product_category_id: queueData.product_category_id,
    sizes: []
  };
  const sizesNeedAdd = getSizesNeedAdd(stock, shopifyProductCreated);
  const sizesNeedUpdate = getSizesNeedUpdate(stock, shopifyProductCreated);
  const sizesNeedDelete = getSizesNeedDelete(stock, shopifyProductCreated, generalSetting);
  const optionValuesToUpdate = getOptionValuesToUpdate(sizesNeedUpdate, sizeAttributeMapping);
  const optionValuesToAdd = getOptionValuesToAdd(sizesNeedAdd, sizeAttributeMapping);
  const optionValuesToDelete = getOptionValuesToDelete(sizesNeedDelete);
  let productVariantsReturn = [];
  let hasProductAdjustQuantitiesUpdate = true;
  const productOptionUpdate = await runProductOptionUpdateMutation({
    shop,
    variables: {
      productId,
      option: {
        id: productOptionId
      },
      optionValuesToUpdate,
      optionValuesToAdd,
      optionValuesToDelete
    }
  });
  shopifyProductSave.sizes = stockSizeQuantity.map(item => Object.keys(item)[0]);
  if (
    productOptionUpdate &&
    productOptionUpdate?.options &&
    productOptionUpdate.options.length &&
    productOptionUpdate?.options[0]?.optionValues
  ) {
    const optionsValues = productOptionUpdate.options[0].optionValues;
    const variantsNeedAdd = optionsValues.filter(option => !option.hasVariants);
    const variantsNeedUpdate = optionsValues.filter(option => option.hasVariants);
    // Add Variant
    if (variantsNeedAdd.length) {
      const productVariantsVariables = await getProductVariantsVariables({
        shopifyProductId: productId,
        productData: stock,
        productOptionId,
        optionValuesProduct: variantsNeedAdd,
        margin,
        generalSetting
      });
      const {productVariants: productVariantsAddReturn} = await runProductVariantsBulkMutation({
        shop,
        variables: productVariantsVariables
      });
      if (productVariantsAddReturn) {
        productVariantsReturn = [...productVariantsReturn, ...productVariantsAddReturn];
      }
    }
    // Update Variant
    if (variantsNeedUpdate.length) {
      const productVariantsUpdateVariables = await getProductVariantsUpdateVariables(
        stock,
        productId,
        sizesNeedUpdate,
        margin,
        generalSetting
      );
      const {productVariants: productVariantsUpdateReturn} = await runProductVariantsBulkMutation({
        shop,
        variables: productVariantsUpdateVariables,
        query: UPDATE_PRODUCT_VARIANTS_BULK_MUTATION,
        key: 'productVariantsBulkUpdate'
      });
      if (productVariantsUpdateReturn) {
        productVariantsReturn = [...productVariantsReturn, ...productVariantsUpdateReturn];
      }
    }
    if (productVariantsReturn.length) {
      const variantsToMap = productVariantsReturn.map(item => ({
        id: item.id,
        title: item.title,
        inventoryItem: item.inventoryItem
      }));
      productOptionsAfterMap = sizeOptionMapping(
        stockSizeQuantity.map(item => Object.keys(item)[0]),
        sizeAttributeMapping,
        optionsValues,
        variantsToMap,
        productOptionId
      );
      shopifyProductSave.productOptionsAfterMap = productOptionsAfterMap;
      const productVariantsWithQuantityBefore = await getProductVariantsGraphQl({
        shop,
        variables: {query: `product_id:${productId.replace('gid://shopify/Product/', '')}`}
      });
      if (productVariantsWithQuantityBefore) {
        const productAdjustQuantitiesUpdate = getProductAdjustQuantitiesUpdate(
          stockSizeQuantity,
          productOptionsAfterMap,
          productVariantsWithQuantityBefore.allVariants,
          defaultLocationId
        );
        const adjustQuantities = await runProductAdjustQuantitiesMutation({
          shop,
          variables: productAdjustQuantitiesUpdate.variables
        });
        if (!adjustQuantities) {
          hasProductAdjustQuantitiesUpdate = false;
        }
      } else {
        hasProductAdjustQuantitiesUpdate = false;
      }
    }
  }
  const actions = [];
  if (
    !productUpdateMutation ||
    !metafieldsSetMutation ||
    !productVariantsReturn.length ||
    !hasProductAdjustQuantitiesUpdate
  ) {
    actions.push(updateQueueDoc(queueDoc, queueData));
  } else {
    actions.push(updateQueueDoc(queueDoc, queueData, 'success'));
  }
  if (productUpdateMutation) {
    actions.push(saveShopifyProduct(shop.id, shopifyProductSave));
  }

  return Promise.all(actions);
}

/**
 *
 * @param productData
 * @returns {*}
 */
function getProductMediaData(productData) {
  return productData?.images
    ? productData.images.map(item => ({
        mediaContentType: 'IMAGE',
        originalSource: item.replace(/\s/g, '%20')
      }))
    : [];
}

/**
 *
 * @param shop
 * @param shopifyProductId
 * @returns {Promise<*|null>}
 */
async function getFileIdsToDelete(shop, shopifyProductId) {
  const mediaFiles = await getProductMediaQuery({
    shop,
    variables: {
      id: shopifyProductId
    }
  });
  if (mediaFiles && mediaFiles.length) {
    return mediaFiles.map(file => file.node.id);
  }

  return null;
}

/**
 *
 * @param options
 * @returns {*}
 */
function getOptionValuesToDelete(options) {
  return options.map(option => option.productOptionValueId);
}

/**
 *
 * @param options
 * @param sizeAttributeMapping
 * @returns {*}
 */
function getOptionValuesToAdd(options, sizeAttributeMapping) {
  const sizes = options.map(item => ({name: Object.keys(item)[0]}));
  return convertOptionMappingToSizeValue(sizes, sizeAttributeMapping);
}

/**
 *
 * @param options
 * @param sizeAttributeMapping
 * @returns {*}
 */
function getOptionValuesToUpdate(options, sizeAttributeMapping) {
  return options.map(option => {
    let value = option.mappingValue;
    if (sizeAttributeMapping) {
      const sizeOptionMapping = sizeAttributeMapping[0]?.optionsMapping ?? [];
      const sizeOption = sizeOptionMapping.find(
        item => item.retailerOptionName === option.originalOption
      );
      value = sizeOption?.dropshipperOptionName ?? option.mappingOption;
    }
    return {id: option.productOptionValueId, name: value};
  });
}

/**
 *
 * @param stock
 * @param shopifyProductCreated
 * @returns {*}
 */
function getSizesNeedAdd(stock, shopifyProductCreated) {
  return stock.size_quantity.filter(size => {
    return !shopifyProductCreated.productOptionsAfterMap.find(
      option => Object.keys(size)[0] === option.originalOption
    );
  });
}

/**
 *
 * @param stock
 * @param shopifyProductCreated
 * @returns {*}
 */
function getSizesNeedUpdate(stock, shopifyProductCreated) {
  return shopifyProductCreated.productOptionsAfterMap.filter(option => {
    return stock.size_quantity.find(size => option.originalOption === Object.keys(size)[0]);
  });
}

/**
 *
 * @param stock
 * @param shopifyProductCreated
 * @param generalSetting
 * @returns {*}
 */
function getSizesNeedDelete(stock, shopifyProductCreated, generalSetting) {
  return shopifyProductCreated.productOptionsAfterMap.filter(option => {
    const size = stock.size_quantity.find(item => option.originalOption === Object.keys(item)[0]);

    return !size || (generalSetting?.deleteOutStock && size && !Number(Object.values(size)[0]));
  });
}

/**
 *
 * @param shop
 * @param queue
 * @param luxuryInfo
 * @param queueDoc
 * @returns {Promise<google.firestore.v1beta1.WriteResult>}
 */
async function actionQueueDelete({
  shop,
  queueDoc,
  luxuryInfo,
  queueData,
  isDeleteLxProduct = true
}) {
  const {id: shopifyId} = shop;
  const {stockId} = queueData;
  const shopifyProductDoc = await getShopifyProductDoc(shopifyId, stockId);
  const actions = [];
  if (isDeleteLxProduct) {
    actions.push(deleteLuxuryProductByShopifyId(shopifyId, stockId));
  }
  if (shopifyProductDoc) {
    const deleteResult = await deleteShopifyProduct(shopifyProductDoc, shop);
    if (
      (deleteResult.length === 1 && !deleteResult[0]) ||
      (deleteResult.length === 2 && !deleteResult[1])
    ) {
      return updateQueueDoc(queueDoc, queueData);
    }
    actions.push(shopifyProductDoc.ref.delete());
  }
  actions.push(updateQueueDoc(queueDoc, queueData, 'success'));
  return Promise.all(actions);
}

/**
 *
 * @returns {Promise<Awaited<unknown>[]>}
 */
export async function deleteShopifyProduct(shopifyProductDoc, shop) {
  const shopifyProduct = getShopifyProductByDoc(shopifyProductDoc);
  const productFilesToDelete = await getFileIdsToDelete(shop, shopifyProduct.shopifyProductId);
  const deleteActions = [];
  if (productFilesToDelete) {
    deleteActions.push(runFileDeleteMutation({shop, variables: {fileIds: productFilesToDelete}}));
  }
  deleteActions.push(
    runDeleteProductMutation({
      shop,
      variables: {
        product: {
          id: shopifyProduct.shopifyProductId
        }
      }
    })
  );
  return Promise.all(deleteActions);
}

/**
 *
 * @param queueDoc
 * @param queueData
 * @param status
 * @returns {*}
 */
function updateQueueDoc(queueDoc, queueData, status = '') {
  if (!status) {
    if (queueData.retry >= 3) {
      return queueDoc.ref.update({status: 'failed', updatedAt: FieldValue.serverTimestamp()});
    }
    return queueDoc.ref.update({retry: queueData.retry++, updatedAt: FieldValue.serverTimestamp()});
  }
  return queueDoc.ref.update({status, updatedAt: FieldValue.serverTimestamp()});
}

/**
 *
 * @param docs
 * @returns {Promise<void>}
 */
function bulkUpdateSuccess(docs) {
  return batchUpdate(firestore, docs, {status: 'success'});
}

/**
 *
 * @param categoryMappings
 * @param syncSetting
 * @param productData
 * @param productVariables
 * @returns {{margin: number, productVariables}}
 */
function addCollectionsToProductVariables(
  categoryMappings,
  syncSetting,
  productData,
  productVariables
) {
  let margin = 1;
  if (!categoryMappings.empty && syncSetting?.categories) {
    const categoryMapping = categoryMappings.docs.find(
      e => e.data().retailerId == productData.product_category_id
    );

    if (categoryMapping) {
      productVariables.product.collectionsToJoin = [categoryMapping.dropShipperId];
      margin = categoryMapping?.margin || 1;
    }
  }

  return {productVariables, margin};
}

/**
 *
 * @param generalSetting
 * @param syncSetting
 * @param productData
 * @param sizeAttributeMapping
 * @param onlineStore
 * @param sizesQuantityDelta
 * @returns {{product: {metafields: *, productOptions: [{values: *, name: string}], descriptionHtml: (*|string), title: (string|*), collectionsToJoin: *[], status: (string), publications: ([{publicationId}]|*[])}, media: (*|*[])}}
 */
function getProductVariables({
  generalSetting,
  syncSetting,
  productData,
  sizeAttributeMapping,
  onlineStore,
  sizesQuantityDelta
}) {
  const sizeOptionsMap = convertOptionMappingToSizeValue(
    sizesQuantityDelta.map(item => ({name: Object.keys(item)[0]})),
    sizeAttributeMapping
  );
  const productOptionsData = [
    {
      name: 'Size',
      values: sizeOptionsMap
    }
  ];
  const productMediaData = getProductMediaData(productData);

  const metafieldsData = getMetafieldsData(productData);
  return {
    product: {
      title: generalSetting?.includeBrand
        ? `${productData.name} ${productData.brand}`
        : productData.name,
      descriptionHtml: syncSetting?.description ? productData.description : '',
      metafields: metafieldsData,
      productOptions: productOptionsData,
      collectionsToJoin: [],
      status: generalSetting?.productAsDraft ? 'DRAFT' : 'ACTIVE',
      publications: onlineStore ? [{publicationId: onlineStore}] : []
    },
    media: syncSetting?.images ? productMediaData : []
  };
}

/**
 *
 * @param productData
 * @returns {{type: *, value: *, key: *}[]}
 */
function getMetafieldsData(productData) {
  if (!productData.shopifyProductId) {
    return productMetafields.map(metafield => ({
      key: metafield.key,
      value: getMetafieldValue(productData, metafield),
      namespace: 'luxury'
    }));
  } else {
    return productMetafields.map(metafield => ({
      key: metafield.key,
      value: getMetafieldValue(productData, metafield),
      namespace: 'luxury',
      type: metafield.type,
      ownerId: productData.shopifyProductId
    }));
  }
}

/**
 *
 * @param productData
 * @param metafield
 * @returns {*|string|string}
 */
function getMetafieldValue(productData, metafield) {
  const metafieldKey = metafield.key;
  if (!productData[metafieldKey]) {
    return '';
  }
  if (metafieldKey === 'season_one' || metafieldKey === 'season_two') {
    return productData[metafieldKey]?.name ?? '';
  }

  return productData[metafieldKey];
}

/**
 *
 * @param shopifyProductId
 * @param productData
 * @param productOptionId
 * @param optionValuesProduct
 * @param margin
 * @param generalSetting
 * @returns {Promise<{productId, variants: *}>}
 */
async function getProductVariantsVariables({
  shopifyProductId,
  productData,
  productOptionId,
  optionValuesProduct,
  margin,
  generalSetting
}) {
  const currencyValue = await getCurrencyValue(generalSetting);
  const productVariants = optionValuesProduct.map((optionValue, index) => ({
    sku: productData.sku,
    price: roundingPrice(productData.selling_price * margin * currencyValue, generalSetting),
    compareAtPrice: roundingPrice(productData.original_price * currencyValue, generalSetting),
    optionValues: [
      {
        optionId: productOptionId,
        id: optionValue.id
      }
    ]
  }));
  return {
    productId: shopifyProductId,
    variants: productVariants
  };
}

/**
 *
 * @param price
 * @param generalSetting
 * @returns {*|number}
 */
function roundingPrice(price, generalSetting) {
  let priceRounding = price;
  if (generalSetting?.pricesRounding) {
    if (generalSetting.pricesRounding === 'xxx9.00') {
      priceRounding = Math.round(price);
    }
    if (generalSetting.pricesRounding === 'XXXX.00 up') {
      priceRounding = Math.ceil(price);
    }
  }

  return Number(priceRounding);
}

/**
 *
 * @param generalSetting
 * @returns {Promise<number|*|number>}
 */
async function getCurrencyValue(generalSetting) {
  const currencies = await getCurrencies();
  if (!currencies || !generalSetting?.currency) {
    return 1;
  }
  const currency = currencies.data.find(item => item.code === generalSetting.currency);
  return currency?.value ?? 1;
}

/**
 *
 * @param stock
 * @param productId
 * @param sizesNeedUpdate
 * @param margin
 * @param generalSetting
 * @returns {Promise<{productId: (string|*), variants: *}>}
 */
async function getProductVariantsUpdateVariables(
  stock,
  productId,
  sizesNeedUpdate,
  margin,
  generalSetting
) {
  const currencyValue = await getCurrencyValue(generalSetting);
  const productVariants = sizesNeedUpdate.map(item => ({
    price: roundingPrice(stock.selling_price * margin * currencyValue, generalSetting),
    compareAtPrice: roundingPrice(stock.original_price * currencyValue, generalSetting),
    id: item.productVariantId
  }));
  return {
    productId,
    variants: productVariants
  };
}

/**
 *
 * @param productVariantsReturn
 * @param sizeQuantityDelta
 * @param defaultLocationId
 * @returns {{variables: {input: {reason: string, changes: *, name: string}, locationId}}}
 */
function getProductAdjustQuantitiesVariables(
  productVariantsReturn,
  sizeQuantityDelta,
  defaultLocationId
) {
  let variants = [];
  const changesData = productVariantsReturn.map((item, index) => {
    variants = [
      ...variants,
      ...[{id: item.id, title: item.title, inventoryItem: item.inventoryItem}]
    ];

    return {
      inventoryItemId: item.inventoryItem.id,
      delta: Number(Object.values(sizeQuantityDelta[index])[0]),
      locationId: defaultLocationId
    };
  });

  return {
    variables: {
      locationId: defaultLocationId,
      input: {
        changes: changesData,
        reason: 'correction',
        name: 'available'
      }
    },
    variants
  };
}

/**
 *
 * @param stockSizeQuantity
 * @param sizesNeedUpdate
 * @param productVariantsWithQuantityBefore
 * @param defaultLocationId
 * @returns {{variables: {input: {reason: string, changes: *, name: string}, locationId}}}
 */
function getProductAdjustQuantitiesUpdate(
  stockSizeQuantity,
  sizesNeedUpdate,
  productVariantsWithQuantityBefore,
  defaultLocationId
) {
  const changesData = sizesNeedUpdate.map(item => {
    const variantBefore = productVariantsWithQuantityBefore.find(variant => {
      return variant.id == item.productVariantId;
    });
    const sizeQty = stockSizeQuantity.find(
      stockSize => Object.keys(stockSize)[0] === item.originalOption
    );
    return {
      inventoryItemId: item.inventoryItemId,
      delta:
        variantBefore && sizeQty
          ? Number(Object.values(sizeQty)[0] - variantBefore.inventoryQuantity)
          : 0,
      locationId: defaultLocationId
    };
  });
  return {
    variables: {
      locationId: defaultLocationId,
      input: {
        changes: changesData,
        reason: 'correction',
        name: 'available'
      }
    }
  };
}

/**
 *
 * @param id
 * @param updateData
 * @returns {Promise<void>}
 */
export async function updateProduct(id, updateData) {
  await collection.doc(id).update({...updateData, updatedAt: FieldValue.serverTimestamp()});
}

/**
 *
 * @param shopifyId
 * @param mappingData
 * @returns {Promise<void>}
 */
export async function updateProductBulkWhenSaveMapping(shopifyId, mappingData) {
  if (mappingData.length) {
    const retailerCategories = mappingData.map(mappingRow => Number(mappingRow.retailerId));
    const docs = await collection
      .where('shopifyId', '==', shopifyId)
      .where('shopifyProductId', '!=', '')
      .where('queueStatus', '==', 'synced')
      .where('syncStatus', 'in', ['success', 'failed'])
      .where('product_category_id', 'in', retailerCategories)
      .get();
    if (!docs.empty) {
      await batchUpdate(firestore, docs.docs, {
        queueStatus: 'update',
        syncStatus: 'new',
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
}

/**
 *
 * @param shopId
 * @param saveDataBefore
 * @param saveDataAfter
 * @returns {Promise<void>}
 */
export async function updateProductBulkWhenSaveAttributeMapping(
  shopId,
  saveDataBefore,
  saveDataAfter
) {
  if (!saveDataBefore) {
    if (saveDataAfter?.optionsMapping && saveDataAfter.optionsMapping.length) {
      await productQueueUpdateWhenChangeOptionMapping(shopId, saveDataAfter.optionsMapping);
    }
  } else {
    if (saveDataBefore?.optionsMapping && saveDataAfter?.optionsMapping) {
      const optionMappingChange = filterByRetailerOptionName(
        saveDataBefore.optionsMapping,
        saveDataAfter.optionsMapping
      );
      await productQueueUpdateWhenChangeOptionMapping(shopId, optionMappingChange);
    }
  }
}

/**
 *
 * @param shopId
 * @param optionsMapping
 * @returns {Promise<void>}
 */
async function productQueueUpdateWhenChangeOptionMapping(shopId, optionsMapping) {
  const retailerOptionNames = optionsMapping.map(
    attributeOption => attributeOption.retailerOptionName
  );
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .where('shopifyProductId', '!=', '')
    .where('queueStatus', '==', 'synced')
    .where('syncStatus', 'in', ['success', 'failed'])
    .get();
  if (!docs.empty) {
    const docsNeedUpdate = docs.docs.filter(doc => {
      const stockItem = doc.data();
      if (stockItem?.productOptionsAfterMap && stockItem.productOptionsAfterMap.length) {
        const originalValues = stockItem.productOptionsAfterMap.map(item => item.originalOption);
        return hasCommonElement(retailerOptionNames, originalValues);
      }
      return false;
    });
    if (docsNeedUpdate.length) {
      await batchUpdate(firestore, docsNeedUpdate, {
        queueStatus: 'update',
        syncStatus: 'new',
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
}

/**
 *
 * @param a
 * @param b
 * @returns {*}
 */
function filterByRetailerOptionName(a, b) {
  const aSet = new Set(a.map(item => item.retailerOptionName));
  const filteredB = b.filter(bItem => {
    const {retailerOptionName, dropshipperOptionName} = bItem;
    if (!aSet.has(retailerOptionName)) {
      return true;
    }
    const matchingAItem = a.find(aItem => aItem.retailerOptionName === retailerOptionName);
    return matchingAItem && matchingAItem.dropshipperOptionName !== dropshipperOptionName;
  });
  return filteredB;
}

/**
 *
 * @param shopifyId
 * @param generalSettingBefore
 * @param generalSettingAfter
 * @returns {Promise<void>}
 */
export async function updateProductBulkWhenSaveGeneralSetting(
  shopifyId,
  generalSettingBefore,
  generalSettingAfter
) {
  if (
    !generalSettingBefore ||
    (generalSettingBefore &&
      (generalSettingBefore?.currency !== generalSettingAfter?.currency ||
        generalSettingBefore?.pricesRounding !== generalSettingAfter?.pricesRounding ||
        (!generalSettingBefore?.deleteOutStock && generalSettingAfter?.deleteOutStock)))
  ) {
    if (generalSettingAfter?.deleteOutStock) {
      const actions = [];
      const outOfStockDocsCreate = await collection
        .where('shopifyId', '==', shopifyId)
        .where('queueStatus', '==', 'create')
        .where('qty', '==', 0)
        .get();
      const outOfStockDocsSynced = await collection
        .where('shopifyId', '==', shopifyId)
        .where('qty', '==', 0)
        .where('shopifyProductId', '!=', '')
        .get();
      if (!outOfStockDocsCreate.empty) {
        actions.push(batchDelete(firestore, outOfStockDocsCreate.docs));
      }
      if (!outOfStockDocsSynced.empty) {
        actions.push(
          batchUpdate(firestore, outOfStockDocsSynced.docs, {
            queueStatus: 'delete',
            syncStatus: 'new',
            updatedAt: FieldValue.serverTimestamp()
          })
        );
      }
      await Promise.all(actions);
    }

    const docsNeedUpdate = await collection
      .where('shopifyId', '==', shopifyId)
      .where('shopifyProductId', '!=', '')
      .where('queueStatus', '==', 'synced')
      .get();

    if (!docsNeedUpdate.empty) {
      await batchUpdate(firestore, docsNeedUpdate.docs, {
        queueStatus: 'update',
        syncStatus: 'new',
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
}

/**
 *
 * @param shopId
 * @returns {Promise<void>}
 */
export async function createMetafields(shopId) {
  const shop = await getShopByIdIncludeAccessToken(shopId);
  await Promise.all(
    productMetafields.map(metafield =>
      runMetafieldDefinitionMutation({shop, variables: {definition: metafield}})
    )
  );
}

/**
 *
 * @param sizes
 * @param sizeAttributeMapping
 * @returns {*}
 */
function convertOptionMappingToSizeValue(sizes, sizeAttributeMapping) {
  if (sizeAttributeMapping) {
    const sizeOptionMapping = sizeAttributeMapping[0]?.optionsMapping;

    if (sizeOptionMapping) {
      return sizes.map(size => {
        const sizeOption = sizeOptionMapping.find(
          option => option.retailerOptionName === size.name
        );
        return sizeOption?.dropshipperOptionName
          ? {name: sizeOption.dropshipperOptionName}
          : {name: size.name};
      });
    }
  }

  return sizes;
}

/**
 *
 * @param sizes
 * @param sizeAttributeMapping
 * @param productOptions
 * @param productVariants
 * @param productOptionId
 * @returns {*}
 */
function sizeOptionMapping(
  sizes,
  sizeAttributeMapping,
  productOptions,
  productVariants,
  productOptionId
) {
  if (sizeAttributeMapping) {
    const sizeOptionMapping = sizeAttributeMapping[0].optionsMapping;
    if (sizeOptionMapping) {
      return sizes.map(size => {
        const sizeOption = sizeOptionMapping.find(option => option.retailerOptionName === size);
        return sizeOption?.dropshipperOptionName
          ? {
              type: 'size',
              originalOption: size,
              mappingOption: sizeOption.dropshipperOptionName,
              productOptionValueId: getProductOptionIdByName(
                productOptions,
                sizeOption.dropshipperOptionName
              ),
              productVariantId: productVariants
                ? getVariantIdByTitle(productVariants, sizeOption.dropshipperOptionName)
                : '',
              inventoryItemId: productVariants
                ? getInventoryItemIdByTitle(productVariants, sizeOption.dropshipperOptionName)
                : '',
              productOptionId
            }
          : {
              type: 'size',
              originalOption: size,
              mappingOption: size,
              productOptionValueId: getProductOptionIdByName(productOptions, size),
              productVariantId: productVariants ? getVariantIdByTitle(productVariants, size) : '',
              inventoryItemId: productVariants
                ? getInventoryItemIdByTitle(productVariants, size)
                : '',
              productOptionId
            };
      });
    }
  }

  return sizes.map(size => ({
    type: 'size',
    originalOption: size,
    mappingOption: size,
    productOptionValueId: getProductOptionIdByName(productOptions, size),
    productVariantId: productVariants ? getVariantIdByTitle(productVariants, size) : '',
    inventoryItemId: productVariants ? getInventoryItemIdByTitle(productVariants, size) : '',
    productOptionId
  }));
}

/**
 *
 *
 * @param productVariants
 * @param title
 * @returns {*|string}
 */
function getInventoryItemIdByTitle(productVariants, title) {
  const productVariant = productVariants.find(variant => {
    return variant.title === title;
  });
  return productVariant?.inventoryItem?.id ?? '';
}

/**
 *
 *
 * @param productVariants
 * @param title
 * @returns {*|string}
 */
function getVariantIdByTitle(productVariants, title) {
  const productVariant = productVariants.find(variant => {
    return variant.title === title;
  });
  return productVariant?.id ?? '';
}

/**
 *
 * @param productOptions
 * @param optionName
 * @returns {*|string}
 */
function getProductOptionIdByName(productOptions, optionName) {
  const productOption = productOptions.find(option => {
    return option.name === optionName;
  });
  return productOption?.id ?? '';
}

/**
 *
 * @param shopId
 * @param stockList
 * @returns {Promise<boolean>}
 */
export async function addProducts(shopId, stockList) {
  try {
    // const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);
    // const stockListResult = await getLuxuryStockList(luxuryShopInfo);
    // if (stockList) {
    const brandFilter = await getBrandSettingShopId(shopId);
    const stockIdsExclude = await getStockIdsExclude(shopId);
    const products = stockList
      .filter(
        stockItem =>
          brandFilter.brands.includes(stockItem.brand) &&
          (!stockIdsExclude || (stockIdsExclude && !stockIdsExclude.includes(stockItem.id)))
      )
      .map(item => {
        let sizeQuantity = [];
        if (item.hasOwnProperty('size_quantity')) {
          sizeQuantity = item.size_quantity.filter(item => !Array.isArray(item));
        }
        const {id, ...data} = item;

        return {
          ...data,
          stockId: id,
          shopifyId: shopId,
          syncStatus: 'new',
          queueStatus: 'create',
          shopifyProductId: '',
          size_quantity: sizeQuantity,
          size_quantity_delta: sizeQuantity,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
      });

    await batchCreate(firestore, collection, products);
    // }
    return true;
  } catch (e) {
    console.log(e);
  }

  return false;
}

/**
 *
 * @param shopId
 * @param stockData
 * @returns {Promise<boolean>}
 */
export async function addProduct(shopId, stockData) {
  try {
    const brandFilter = await getBrandSettingShopId(shopId);
    const productsCount = await getProductsCount(shopId);
    if (stockData && brandFilter && productsCount && brandFilter.brands.includes(stockData.brand)) {
      let sizeQuantity = [];
      if (stockData.hasOwnProperty('size_quantity')) {
        sizeQuantity = stockData.size_quantity.filter(item => !Array.isArray(item));
      }
      const {id, ...data} = stockData;
      return collection.add({
        ...data,
        queueStatus: 'create',
        syncStatus: 'new',
        shopifyId: shopId,
        stockId: id,
        shopifyProductId: '',
        size_quantity: sizeQuantity,
        size_quantity_delta: sizeQuantity,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.log(e);
  }

  return false;
}

/**
 *
 * @param shopifyId
 * @param queueStatus
 * @returns {Promise<number>}
 */
export async function getQueueCount(shopifyId, queueStatus) {
  try {
    const docs = await collection
      .where('shopifyId', '==', shopifyId)
      .where('status', '==', queueStatus)
      .count()
      .get();

    return docs.data().count;
  } catch (e) {
    console.error(e);
    return 0;
  }
}

/**
 *
 * @param shopId
 * @returns {Promise<{data: {deleteQueueProductCount: number, updateQueueProductCount: number, createQueueProductCount: number, totalsProductCount: number}, success: boolean}>}
 */
export async function getProductCounts(shopId) {
  try {
    const [totalProduct, createQueue, updateQueue, deleteQueue] = await Promise.all([
      collection
        .where('shopifyId', '==', shopId)
        .where('shopifyProductId', '!=', '')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'create')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'update')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'delete')
        .count()
        .get()
    ]);

    return {
      success: true,
      data: {
        totalsProductCount: totalProduct.data().count,
        createQueueProductCount: createQueue.data().count,
        updateQueueProductCount: updateQueue.data().count,
        deleteQueueProductCount: deleteQueue.data().count
      }
    };
  } catch (e) {
    console.log(e);
    return {
      success: true,
      data: {
        totalsProductCount: 0,
        createQueueProductCount: 0,
        updateQueueProductCount: 0,
        deleteQueueProductCount: 0
      }
    };
  }
}

/**
 *
 * @param shopId
 * @returns {Promise<{shopId: *}[]>}
 */
export async function getStockIdsExclude(shopId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .where('shopifyProductId', '!=', '')
    .get();

  if (docs.empty) {
    return null;
  }

  return docs.docs.map(doc => {
    const {stockId} = doc.data();
    return stockId;
  });
}

/**
 *
 * @param shopId
 * @param brandFilterData
 * @returns {Promise<boolean>}
 */

export async function deleteProductsInQueueWhenChangeBrandFilter(shopId, brandFilterData) {
  try {
    if (brandFilterData) {
      const brands = brandFilterData.brands;
      const docsQuery = collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'create');
      if (Array.isArray(brands) && brands.length) {
        docsQuery.where('brand', 'not-in', brandFilterData.brands);
      }
      const docs = await docsQuery.get();
      await batchDelete(firestore, docs.docs);
    }

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param webhookData
 * @returns {Promise<boolean>}
 */
export async function productWebhook(webhookData) {
  try {
    const {event, record: stockId} = webhookData;
    const shops = await getLuxuryShops();
    if (shops) {
      const completeInitShops = shops.filter(shop => shop?.completeInitQueueAction);
      const notCompleteInitShops = shops.filter(shop => !shop?.completeInitQueueAction);
      const actions = [];
      if (shops.length) {
        switch (event) {
          case 'ProductCreate':
            actions.push(queueProductBulk({shops, stockId, status: 'create'}));
            break;
          case 'ProductUpdate':
            actions.push(queueProductBulk({shops, stockId, status: 'update'}));
            break;
          case 'ProductDelete':
            actions.push(queueProductBulk({shops, stockId, status: 'delete'}));
            if (!completeInitShops.length) {
              actions.push(deleteLuxuryProductShops(completeInitShops, stockId));
            }
            break;
        }
      }
      if (notCompleteInitShops.length) {
        actions.push(addStockTemps(notCompleteInitShops, {stockId, event}));
      }
      await Promise.all(actions);
      return true;
    }
  } catch (e) {
    console.log(e);
  }
  return false;
}

/**
 *
 * @param stockId
 * @param shopInfo
 * @returns {Promise<void>}
 */
async function updateSizesHook(stockId, shopInfo) {
  let sizes = [];
  const stock = await getStockById(stockId, shopInfo);
  if (stock && stock?.size_quantity) {
    const sizeQuantity = stock.size_quantity.filter(item => !Array.isArray(item));
    sizes = sizeQuantity.map(size => Object.keys(size)[0]);
  }

  return importSizes(shopInfo.shopifyId, sizes);
}

/**
 *
 * @param a
 * @param b
 * @returns {*}
 */

function getSizeQuantityDelta(a, b) {
  return b.map(itemB => {
    const keyB = Object.keys(itemB)[0];
    const valueB = parseInt(itemB[keyB]);
    const itemA = a.find(item => Object.keys(item)[0] === keyB);

    if (itemA) {
      const valueA = parseInt(itemA[keyB]);
      const newValue = valueB - valueA;
      return {[keyB]: newValue.toString()};
    }

    return itemB;
  });
}

/**
 *
 * @param stockId
 * @param shopifyId
 * @returns {Promise<{[p: string]: FirebaseFirestore.DocumentFieldValue, uid: string}|null>}
 */
async function getProductByStockId(stockId, shopifyId) {
  const docs = await collection
    .where('stockId', '==', stockId)
    .where('shopifyId', '==', shopifyId)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  const doc = docs.docs[0];
  return {uid: doc.id, ...doc.data()};
}

/**
 *
 * @param shops
 * @param stockId
 * @param queueStatus
 * @returns {Promise<void>}
 */
export async function queueProductBulk({shops, stockId, status}) {
  const shopChunks = chunk(shops, 1000);

  for (const shopChunk of shopChunks) {
    const createQueues = shopChunk.map(shop => ({
      shopifyId: shop.shopifyId,
      stockId,
      status,
      locked: false,
      retry: 0,
      createdAt: FieldValue.serverTimestamp()
    }));
    return batchCreate(firestore, collection, createQueues);
  }
}

/**
 *
 * @param shopifyId
 * @param stockId
 * @param data
 * @returns {Promise<WriteResult>}
 */
export async function updateQueue(shopifyId, stockId, data) {
  const docs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('stockId', '==', stockId)
    .get();
  if (!docs.empty) {
    return docs.docs[0].ref.update({...data, updatedAt: FieldValue.serverTimestamp()});
  }
}

/**
 *
 * @param id
 * @returns {Promise<void>}
 */
async function deleteProductInQueue(id) {
  await collection.doc(id).delete();
}

/**
 *
 * @param shopId
 * @param shopifyProductId
 * @returns {Promise<any|null>}
 */
export async function getProductByShopifyProductId(shopId, shopifyProductId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .where('shopifyProductId', '==', `gid://shopify/Product/${shopifyProductId}`)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  const [doc] = docs.docs;
  return presentDataAndFormatDate(doc);
}

/**
 *
 * @param luxuryShop
 * @returns {Promise<void|null>}
 */
export async function deleteProductsWhenUninstallByShopId(luxuryShop) {
  const {shopifyId: shopId} = luxuryShop;
  const shop = await getShopByIdIncludeAccessToken(shopId);
  const luxuryInfo = await getLuxuryShopInfoByShopifyId(shopId);
  if (!luxuryInfo?.deleteApp) {
    return true;
  }
  const docs = await collection.where('shopifyId', '==', shopId).get();
  if (docs.empty) {
    return null;
  }

  const docsCounts = await collection
    .where('shopifyId', '==', shopId)
    .where('shopifyProductId', '!=', '')
    .count()
    .get();

  if (!docsCounts.data().count) {
    await deleteMetafields(shop);
    return batchDelete(firestore, docs.docs);
  }
  const docsSynced = await collection
    .where('shopifyId', '==', shopId)
    .where('shopifyProductId', '!=', '')
    .limit(10)
    .get();
  if (!docsSynced.empty) {
    await Promise.all(
      docsSynced.docs.map(doc => {
        return actionQueueDelete(shop, doc.id, doc.data());
      })
    );
  }
}

/**
 *
 * @param luxuryInfo
 * @returns {Promise<Awaited<boolean|*>[]|*>}
 */
export async function initQueues(luxuryInfo) {
  const {shopifyId} = luxuryInfo;
  if (!luxuryInfo?.completeInitQueueAction) {
    if (!luxuryInfo?.totalProductCountInit) {
      const stockListResult = await getLuxuryStockList({shopInfo: luxuryInfo});
      if (stockListResult && stockListResult?.data && stockListResult.data.length) {
        return initQueueActions({shopifyId, stockListResult, nextOffset: 1000});
      }
    } else {
      if (luxuryInfo.nextOffset < luxuryInfo.totalProductCountInit) {
        const stockListResult = await getLuxuryStockList({
          shopInfo: luxuryInfo,
          offset: luxuryInfo.nextOffset
        });
        if (stockListResult && stockListResult?.data && stockListResult.data.length) {
          return initQueueActions({
            shopifyId,
            stockListResult,
            nextOffset: luxuryInfo.nextOffset + 1000
          });
        }
      } else {
        const stocksTemp = await getStockTemps(shopifyId);
        return Promise.all([
          convertLuxuryProductFromTemp(shopifyId, stocksTemp),
          convertQueueFromTemp(shopifyId, stocksTemp),
          updateLuxuryData(shopifyId, {completeInitQueueAction: true})
        ]);
      }
    }
  }
}

/**
 *
 * @param shopifyId
 * @param stocksTemp
 * @returns {Promise<Awaited<boolean|void>[]|boolean>}
 */
export async function convertQueueFromTemp(shopifyId, stocksTemp) {
  const createQueueStockIds = [];
  const deleteQueueStockIds = [];
  let createQueues = [];
  for (const stockTemp of stocksTemp) {
    if (
      (stockTemp.event === 'ProductCreate' || stockTemp.event === 'ProductUpdate') &&
      !createQueueStockIds.includes(stockTemp.stockId)
    ) {
      createQueues.push({stockId: stockTemp.stockId});
      createQueueStockIds.push(stockTemp.stockId);
    }
    if (stockTemp.event === 'ProductDelete') {
      deleteQueueStockIds.push(stockTemp.stockId);
    }
  }
  createQueues = createQueues.filter(queue => !deleteQueueStockIds.includes(queue.stockId));
  let createQueuesToDelete = [];
  const createQueuesChunks = chunk(createQueues, 30);
  const createQueuesDocsArr = await Promise.all(
    createQueuesChunks.map(createQueuesChunk => {
      return collection
        .where('shopifyId', '==', shopifyId)
        .where(
          'stockId',
          'in',
          createQueuesChunk.map(queue => queue.stockId)
        )
        .where('status', 'in', ['create', 'update'])
        .get();
    })
  );
  for (const createQueuesDocs of createQueuesDocsArr) {
    if (!createQueuesDocs.empty) {
      createQueuesToDelete = [...createQueuesToDelete, ...createQueuesDocs.docs];
    }
  }
  if (createQueuesToDelete.length) {
    return Promise.all([
      createProductQueues(shopifyId, createQueues, false),
      batchDelete(firestore, createQueuesToDelete)
    ]);
  }
  return createProductQueues(shopifyId, createQueues, false);
}

/**
 *
 * @param shopifyId
 * @param stockListResult
 * @param nextOffset
 */
async function initQueueActions({shopifyId, stockListResult, nextOffset}) {
  let sizesToImport = [];
  stockListResult.data.map(stock => {
    const sizeQuantity = stock.size_quantity.filter(item => !Array.isArray(item));
    const sizes = sizeQuantity.map(size => Object.keys(size)[0]);
    sizesToImport = [...new Set([...sizesToImport, ...sizes])];
  });
  return Promise.all([
    importSizes(shopifyId, sizesToImport),
    addLuxuryProducts(shopifyId, stockListResult.data),
    createProductQueues(shopifyId, stockListResult.data),
    updateLuxuryData(shopifyId, {totalProductCountInit: stockListResult.total, nextOffset})
  ]);
}

/**
 *
 * @param shopId
 * @param stockList
 * @param filterBrand
 * @returns {Promise<boolean>}
 */
export async function createProductQueues(shopId, stockList, filterBrand = true) {
  try {
    const brandFilter = await getBrandSettingShopId(shopId);
    let products = [];
    if (filterBrand && brandFilter) {
      const brands = brandFilter.brands.map(brand => brand.toUpperCase());
      products = stockList
        .filter(stockItem => brands.includes(stockItem.brand.toUpperCase()))

        .map(item => {
          return {
            stockId: item?.stockId ?? item.id,
            shopifyId: shopId,
            status: 'create',
            locked: false,
            retry: 0,
            createdAt: FieldValue.serverTimestamp()
          };
        });
    } else {
      products = stockList.map(item => {
        return {
          stockId: item?.stockId ?? item.id,
          shopifyId: shopId,
          status: 'create',
          locked: false,
          retry: 0,
          createdAt: FieldValue.serverTimestamp()
        };
      });
    }
    await batchCreate(firestore, collection, products);
    return true;
  } catch (e) {
    console.log(e);
  }

  return false;
}

/**
 *
 * @param shopifyId
 * @param status
 * @returns {Promise<null|(*&{uid: *})[]>}
 */
export async function getQueueByStatus(shopifyId, status) {
  const docs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('status', '==', status)
    .get();
  if (docs.empty) {
    return null;
  }

  return docs.docs.map(doc => ({uid: doc.id, ...doc.data()}));
}
