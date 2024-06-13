import {FieldValue, Firestore} from '@google-cloud/firestore';
import {
  getLuxuryShopInfoByShopifyId,
  getLuxuryShops,
  getLuxuryStockList,
  getStockById,
  updateLuxuryData
} from '@functions/repositories/luxuryRepository';
import {getBrandSettingShopId} from '@functions/repositories/settings/brandRepository';
import {getSyncSettingShopId} from '@functions/repositories/settings/syncRepository';
import {batchCreate, batchDelete, batchUpdate} from '@functions/repositories/helper';
import {
  getLocationQuery,
  getOnlineStorePublication,
  getProductMediaQuery,
  getProductVariants as getProductVariantsGraphQl,
  METAFIELDS_DELETE_VALUE_MUTATION,
  runDeleteProductMutation,
  runFileDeleteMutation,
  runMetafieldDefinitionMutation,
  runMetafieldDelete,
  runMetafieldsSetMutation,
  runProductAdjustQuantitiesMutation,
  runProductCreateMutation,
  runProductOptionUpdateMutation,
  runProductUpdateMutation,
  runProductVariantsBulkMutation,
  UPDATE_PRODUCT_VARIANTS_BULK_MUTATION
} from '@functions/services/shopify/graphqlService';
import {getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {getMappingDataWithoutPaginate} from '@functions/repositories/settings/categoryRepository';
import productMetafields from '@functions/const/productMetafields';
import {getGeneralSettingShopId} from '@functions/repositories/settings/generalRepository';
import {getAttributeMappingData} from '@functions/repositories/settings/attributeMappingRepository';
import {getCurrencies} from '@functions/repositories/currencyRepository';
import {chunk} from '@avada/utils';
import {
  addLuxuryProducts,
  convertLuxuryProductFromTemp,
  deleteLuxuryProductByShopifyId,
  deleteLuxuryProductShops,
  saveLuxuryProduct
} from '@functions/repositories/luxuryProductRepository';
import {importSizes} from '@functions/repositories/sizeRepository';
import {
  getShopifyProductByDoc,
  getShopifyProductDoc,
  getShopifyProductDocsWithLimit,
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
      .where('status', 'not-in', ['success', 'failed'])
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
      !queueQuery ||
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
              return actionQueueDelete({shop, queueDoc, luxuryInfo, queueData});
            case 'create':
              return actionQueueCreate({
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
            case 'update':
              return actionQueueUpdate({
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
      brand: productData.brand,
      product_category_id: productData.product_category_id,
      hasOptionOutOfStock: sizesQuantityDelta.some(size => !Number(Object.values(size)[0])),
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
    product_category_id: stock.product_category_id,
    brand: stock.brand,
    sizes: [],
    hasOptionOutOfStock: stockSizeQuantity.some(size => !Number(Object.values(size)[0]))
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
async function updateQueueDoc(queueDoc, queueData, status = '') {
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
      const categoryMappingData = categoryMapping.data();
      productVariables.product.collectionsToJoin = [categoryMappingData.dropShipperId];
      margin =
        categoryMappingData?.margin && categoryMappingData.margin
          ? Number(categoryMappingData?.margin)
          : 1;
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
 * @param luxuryShop
 * @returns {Promise<Awaited<unknown>[]|boolean>}
 */
export async function deleteProductsWhenUninstallByShopId(luxuryShop) {
  const {shopifyId: shopId} = luxuryShop;
  const shop = await getShopByIdIncludeAccessToken(shopId);
  const luxuryInfo = await getLuxuryShopInfoByShopifyId(shopId);
  if (!luxuryInfo?.deleteApp) {
    return true;
  }
  const shopifyProductDocs = await getShopifyProductDocsWithLimit(shopId, 10);
  return Promise.all(
    shopifyProductDocs.map(doc => Promise.all([deleteShopifyProduct(doc, shop), doc.ref.delete()]))
  );
}

/**
 *
 * @param luxuryInfo
 * @returns {Promise<Awaited<boolean|*>[]|*>}
 */
export async function initQueues(luxuryInfo) {
  const {shopifyId} = luxuryInfo;
  const brandSettings = await getBrandSettingShopId(shopifyId);
  if (!luxuryInfo?.completeInitQueueAction && brandSettings) {
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
 * @param status
 * @returns {Promise<boolean>}
 */
export async function createProductQueues(
  shopId,
  stockList,
  filterBrand = true,
  status = 'create'
) {
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
            status,
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
          status,
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
export async function getQueueStockIdByStatus(shopifyId, status) {
  const docs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('status', '==', status)
    .get();
  if (docs.empty) {
    return [];
  }

  return docs.docs.map(doc => doc.data().stockId);
}

/**
 *
 * @param shopId
 * @returns {Promise<FirebaseFirestore.WriteResult|null>}
 */
export async function deleteProductQueueWhenUninstall(shopId) {
  const docs = await collection.where('shopifyId', '==', shopId).get();
  if (docs.empty) {
    return null;
  }

  return batchDelete(firestore, docs.docs);
}

/**
 *
 * @returns {Promise<void>}
 */
export async function deleteQueueSuccess() {
  try {
    const docs = await collection.where('status', '==', 'success').get();
    await batchDelete(firestore, docs.docs);
  } catch (e) {
    console.log(e);
  }
}
