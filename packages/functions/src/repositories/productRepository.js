import {FieldValue, Firestore} from '@google-cloud/firestore';
import {
  getLuxuryShopInfoByShopifyId,
  getLuxuryShops,
  getLuxuryStockList,
  getStockById
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
  METAFIELDS_DELETE_VALUE_MUTATION
} from '@functions/services/shopify/graphqlService';
import {getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {getMappingDataWithoutPaginate} from '@functions/repositories/settings/categoryRepository';
import productMetafields from '@functions/const/productMetafields';
import {getGeneralSettingShopId} from '@functions/repositories/settings/generalRepository';
import {getAttributeMappingData} from '@functions/repositories/settings/attributeMappingRepository';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getCurrencies} from '@functions/repositories/currencyRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('products');

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
export async function getProductsQuery(shopId, limit = 0) {
  try {
    return await collection
      .where('shopifyId', '==', shopId)
      .where('queueStatus', '!=', 'synced')
      .orderBy('updatedAt')
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
  try {
    const syncSetting = await getSyncSettingShopId(shopId);
    const generalSetting = await getGeneralSettingShopId(shopId);
    const categoryMappings = await getMappingDataWithoutPaginate(shopId);
    const brandFilterSetting = await getBrandSettingShopId(shopId);
    const productsQuery = await getProductsQuery(shopId, 3);
    const shop = await getShopByIdIncludeAccessToken(shopId);
    const sizeAttributeMapping = await getAttributeMappingData(shopId);
    const defaultLocationId = await getLocationQuery({shop, variables: {}});
    if (
      productsQuery.empty ||
      !defaultLocationId ||
      !brandFilterSetting ||
      brandFilterSetting.brands.length === 0
    ) {
      return [];
    }
    const onlineStore = await getOnlineStorePublication({shop});
    await Promise.all(
      productsQuery.docs.map(async doc => {
        const productData = doc.data();
        const docId = doc.id;
        if (productData.queueStatus === 'delete' && productData?.productShopifyId) {
          return actionQueueDelete(shop, docId, productData);
        }
        if (productData.queueStatus === 'create' && !productData?.productShopifyId) {
          return actionQueueCreate({
            shop,
            categoryMappings,
            syncSetting,
            generalSetting,
            sizeAttributeMapping,
            defaultLocationId,
            onlineStore,
            docId,
            productData
          });
        }
        if (productData.queueStatus === 'update' && productData?.productShopifyId) {
          return actionQueueUpdate({
            shop,
            syncSetting,
            generalSetting,
            categoryMappings,
            sizeAttributeMapping,
            defaultLocationId,
            docId,
            productData
          });
        }
      })
    );
  } catch (e) {
    console.log(e);
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
 * @param docId
 * @param productData
 * @returns {Promise<void>}
 */
async function actionQueueCreate({
  shop,
  categoryMappings,
  syncSetting,
  generalSetting,
  sizeAttributeMapping,
  defaultLocationId,
  onlineStore,
  docId,
  productData
}) {
  const {productVariables, margin} = addCollectionsToProductVariables(
    categoryMappings,
    syncSetting,
    productData,
    getProductVariables({
      generalSetting,
      syncSetting,
      productData,
      sizeAttributeMapping,
      onlineStore
    })
  );
  const productShopify = await runProductCreateMutation({
    shop,
    variables: productVariables
  });

  if (productShopify) {
    const productVariantsVariables = await getProductVariantsVariables({
      productShopifyId: productShopify.id,
      productData,
      productOptionId: productShopify.options[0].id,
      optionValuesProduct: productShopify.options[0].optionValues,
      margin,
      generalSetting
    });
    const {productVariants: productVariantsReturn} = await runProductVariantsBulkMutation({
      shop,
      variables: productVariantsVariables
    });
    if (productVariantsReturn) {
      const productAdjustQuantitiesVariables = getProductAdjustQuantitiesVariables(
        productVariantsReturn,
        productData.size_quantity_delta,
        defaultLocationId
      );
      await runProductAdjustQuantitiesMutation({
        shop,
        variables: productAdjustQuantitiesVariables.variables
      });

      return updateProduct(docId, {
        productOptionsAfterMap: sizeOptionMapping(
          productData.size_quantity_delta.map(item => Object.keys(item)[0]),
          sizeAttributeMapping,
          productShopify.options[0].optionValues,
          productAdjustQuantitiesVariables.variants,
          productShopify.options[0].id
        ),
        productShopifyId: productShopify.id,
        queueStatus: 'synced',
        syncStatus: 'success',
        updatedAt: FieldValue.serverTimestamp(),
        size_quantity_delta: []
      });
    }
  } else {
    return updateProduct(docId, {
      productShopifyId: '',
      syncStatus: 'failed',
      updatedAt: FieldValue.serverTimestamp()
    });
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
 * @param docId
 * @param productData
 * @returns {Promise<void>}
 */
async function actionQueueUpdate({
  shop,
  syncSetting,
  generalSetting,
  categoryMappings,
  sizeAttributeMapping,
  defaultLocationId,
  docId,
  productData
}) {
  const productId = productData.productShopifyId;
  const productOptionId = productData?.productOptionsAfterMap[0]?.productOptionId;
  const fileIdsToDelete = await getFileIdsToDelete(shop, productId);
  if (fileIdsToDelete) {
    await runFileDeleteMutation({shop, variables: {fileIds: fileIdsToDelete}});
  }
  const productMediaData = getProductMediaData(productData);
  const initProductVariables = {
    product: {
      id: productId,
      title: generalSetting?.includeBrand
        ? `${productData.name} ${productData.brand}`
        : productData.name,
      descriptionHtml: syncSetting?.description ? productData.desscription : ''
    },
    media: syncSetting?.images ? productMediaData : []
  };

  const {productVariables, margin} = addCollectionsToProductVariables(
    categoryMappings,
    syncSetting,
    productData,
    initProductVariables
  );

  const sizesNeedAdd = getSizesNeedAdd(productData);
  const sizesNeedUpdate = getSizesNeedUpdate(productData);
  const sizesNeedDelete = generalSetting?.deleteOutStock ? getSizesNeedDelete(productData) : [];
  const optionValuesToUpdate = getOptionValuesToUpdate(sizesNeedUpdate, sizeAttributeMapping);
  const optionValuesToAdd = getOptionValuesToAdd(sizesNeedAdd, sizeAttributeMapping);
  const optionValuesToDelete = getOptionValuesToDelete(sizesNeedDelete);
  let productOptionsAfterMap = productData?.productOptionsAfterMap;
  const metafieldsData = getMetafieldsData(productData);
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

  await Promise.all([
    runProductUpdateMutation({
      shop,
      variables: productVariables
    }),
    runMetafieldsSetMutation({
      shop,
      variables: {metafields: metafieldsUpdate}
    })
  ]);
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

  if (productOptionUpdate && productOptionUpdate?.options?.optionValues) {
    const optionsValues = productOptionUpdate.options.optionValues;
    const variantsNeedAdd = optionsValues.filter(option => !option.hasVariants);
    const variantsNeedUpdate = optionsValues.filter(option => !option.hasVariants);
    let productVariantsReturn = [];

    // Add Variant
    if (variantsNeedAdd.length) {
      const productVariantsVariables = await getProductVariantsVariables({
        productShopifyId: productId,
        productData,
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
        productData,
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

    if (productData.size_quantity_delta.length && productVariantsReturn.length) {
      const variantsToMap = productVariantsUpdateReturn.map(item => ({
        id: item.id,
        title: item.title,
        inventoryItem: item.inventoryItem
      }));
      productOptionsAfterMap = sizeOptionMapping(
        productData.size_quantity_delta.map(item => Object.keys(item)[0]),
        sizeAttributeMapping,
        optionsValues,
        variantsToMap,
        productOptionId
      );
      const productAdjustQuantitiesUpdate = getProductAdjustQuantitiesUpdate(
        productOptionsAfterMap,
        productData.size_quantity_delta,
        defaultLocationId
      );

      await runProductAdjustQuantitiesMutation({
        shop,
        variables: productAdjustQuantitiesUpdate.variables
      });
    }
  }

  return updateProduct(docId, {
    syncStatus: 'success',
    queueStatus: 'synced',
    productOptionsAfterMap,
    updatedAt: FieldValue.serverTimestamp()
  });
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
 * @param productData
 * @returns {*}
 */
function getSizesNeedAdd(productData) {
  return productData.size_quantity_delta.filter(size => {
    return !productData.productOptionsAfterMap.find(
      option => Object.keys(size)[0] === option.originalOption
    );
  });
}

/**
 *
 * @param productData
 * @returns {*}
 */
function getSizesNeedUpdate(productData) {
  return productData.productOptionsAfterMap.filter(option => {
    return productData.size_quantity.find(size => option.originalOption === Object.keys(size)[0]);
  });
}

/**
 *
 * @param productData
 * @returns {*}
 */

function getSizesNeedDelete(productData) {
  return productData.productOptionsAfterMap.filter(option => {
    return !productData.size_quantity.find(size => option.originalOption === Object.keys(size)[0]);
  });
}

/**
 *
 * @param shop
 * @param docId
 * @param productData
 * @returns {Promise<void>}
 */
async function actionQueueDelete(shop, docId, productData) {
  const productFilesToDelete = await getFileIdsToDelete(shop, productData.productShopifyId);
  const deleteActions = [];
  if (productFilesToDelete) {
    deleteActions.push(runFileDeleteMutation({shop, variables: {fileIds: productFilesToDelete}}));
  }
  deleteActions.push(
    runDeleteProductMutation({
      shop,
      variables: {
        product: {
          id: productData.productShopifyId
        }
      }
    })
  );
  await Promise.all(deleteActions);
  return deleteProductInQueue(docId);
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
      e => e.data().retailerId == productData.categoryMapping
    );

    if (categoryMapping) {
      productVariables.product.collectionsToJoin = [categoryMapping.shopShipperId];
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
 * @returns {{product: {metafields: *, productOptions: [{values: *, name: string}], descriptionHtml: (*|string), title: (string|*), collectionsToJoin: *[], status: (string), publications: ([{publicationId}]|*[])}, media: (*|*[])}}
 */
function getProductVariables({
  generalSetting,
  syncSetting,
  productData,
  sizeAttributeMapping,
  onlineStore
}) {
  const sizeOptionsMap = convertOptionMappingToSizeValue(
    productData.size_quantity_delta.map(item => ({name: Object.keys(item)[0]})),
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
      descriptionHtml: syncSetting?.description ? productData.desscription : '',
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
  if (!productData.productShopifyId) {
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
      ownerId: productData.productShopifyId
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
 * @param productShopifyId
 * @param productData
 * @param productOptionId
 * @param optionValuesProduct
 * @param margin
 * @param generalSetting
 * @returns {Promise<{productId, variants: *}>}
 */
async function getProductVariantsVariables({
  productShopifyId,
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
    productId: productShopifyId,
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
 * @param productData
 * @param sizesNeedUpdate
 * @param margin
 * @param generalSetting
 * @returns {Promise<{productId: (string|*), variants: *}>}
 */
async function getProductVariantsUpdateVariables(
  productData,
  sizesNeedUpdate,
  margin,
  generalSetting
) {
  const currencyValue = await getCurrencyValue(generalSetting);
  const productVariants = sizesNeedUpdate.map(item => ({
    price: roundingPrice(productData.selling_price * margin * currencyValue, generalSetting),
    compareAtPrice: roundingPrice(productData.original_price * currencyValue, generalSetting),
    id: item.productVariantId
  }));
  return {
    productId: productData.productShopifyId,
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
 * @param sizesNeedUpdate
 * @param sizeQuantityDelta
 * @param defaultLocationId
 * @returns {{variables: {input: {reason: string, changes: *, name: string}, locationId}}}
 */
function getProductAdjustQuantitiesUpdate(sizesNeedUpdate, sizeQuantityDelta, defaultLocationId) {
  const changesData = sizesNeedUpdate.map(item => {
    const deltaItem = sizeQuantityDelta.find(size => {
      return Object.keys(size)[0] == item.originalOption;
    });
    return {
      inventoryItemId: item.inventoryItemId,
      delta: Number(Object.values(deltaItem)[0]),
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
      .where('productShopifyId', '!=', '')
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
    .where('productShopifyId', '!=', '')
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
    generalSettingBefore &&
    (generalSettingBefore?.currency !== generalSettingAfter?.currency ||
      generalSettingBefore?.pricesRounding !== generalSettingAfter?.pricesRounding)
  ) {
    const docsNeedUpdate = await collection
      .where('shopifyId', '==', shopifyId)
      .where('productShopifyId', '!=', '')
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

  if (
    (!generalSettingBefore && generalSettingAfter?.deleteOutStock) ||
    (generalSettingBefore &&
      generalSettingAfter?.deleteOutStock &&
      generalSettingAfter?.deleteOutStock &&
      !generalSettingBefore?.deleteOutStock)
  ) {
    const actions = [];
    const outOfStockDocsCreate = await collection
      .where('shopifyId', '==', shopifyId)
      .where('queueStatus', '==', 'create')
      .where('qty', '==', 0)
      .get();
    const outOfStockDocsSynced = await collection
      .where('shopifyId', '==', shopifyId)
      .where('qty', '==', 0)
      .where('productShopifyId', '!=', '')
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
              productVariantId: getVariantIdByTitle(
                productVariants,
                sizeOption.dropshipperOptionName
              ),
              inventoryItemId: getInventoryItemIdByTitle(
                productVariants,
                sizeOption.dropshipperOptionName
              ),
              productOptionId
            }
          : {
              type: 'size',
              originalOption: size,
              mappingOption: size,
              productOptionValueId: getProductOptionIdByName(productOptions, size),
              productVariantId: getVariantIdByTitle(productVariants, size),
              inventoryItemId: getInventoryItemIdByTitle(productVariants, size),
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
    productVariantId: getVariantIdByTitle(productVariants, size),
    inventoryItemId: getInventoryItemIdByTitle(productVariants, size),
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
 * @returns {Promise<boolean>}
 */

export async function addProducts(shopId) {
  try {
    const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);
    const stockList = await getLuxuryStockList(luxuryShopInfo);
    if (stockList) {
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
            productShopifyId: '',
            size_quantity: sizeQuantity,
            size_quantity_delta: sizeQuantity,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          };
        });

      await batchCreate(firestore, collection, products);
    }
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
        productShopifyId: '',
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
 * @param shopId
 * @returns {Promise<{data: {deleteQueueProductCount: number, updateQueueProductCount: number, createQueueProductCount: number, totalsProductCount: number}, success: boolean}>}
 */
export async function getProductCounts(shopId) {
  try {
    const [totalProduct, createQueue, updateQueue, deleteQueue] = await Promise.all([
      collection
        .where('shopifyId', '==', shopId)
        .where('productShopifyId', '!=', '')
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
    .where('productShopifyId', '!=', '')
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
    switch (event) {
      case 'ProductCreate':
        await Promise.all(
          shops.map(async shop => {
            const stockData = await getStockById(stockId, shop);
            return addProduct(shop.shopifyId, stockData);
          })
        );
        break;
      case 'ProductUpdate':
        await Promise.all(
          shops.map(async shop => {
            const {shopifyId} = shop;
            const productNeedUpdate = await getProductByStockId(stockId, shopifyId);
            if (productNeedUpdate) {
              const brandFilter = await getBrandSettingShopId(shopifyId);
              const newStockData = await getStockById(stockId, shop);
              const isExistInBrandFilter =
                brandFilter?.brands && brandFilter.brands.includes(newStockData.brand);
              const generalSetting = await getGeneralSettingShopId(shopifyId);
              if (
                !isExistInBrandFilter ||
                (generalSetting?.deleteOutStock && Number(newStockData.qty) === 0)
              ) {
                // If product is not in the brand filter or out of stock
                if (productNeedUpdate?.productShopifyId) {
                  return updateProduct(productNeedUpdate.uid, {
                    queueStatus: 'delete',
                    updatedAt: FieldValue.serverTimestamp()
                  });
                } else {
                  return deleteProductInQueue(productNeedUpdate.uid);
                }
              } else {
                if (productNeedUpdate?.productShopifyId) {
                  newStockData.size_quantity_delta = getSizeQuantityDelta(
                    newStockData.size_quantity,
                    productNeedUpdate.size_quantity
                  );
                  return updateProduct(productNeedUpdate.uid, {
                    ...newStockData,
                    queueStatus: 'update',
                    syncStatus: 'new',
                    updatedAt: FieldValue.serverTimestamp()
                  });
                } else {
                  return addProduct(shop.shopifyId, newStockData);
                }
              }
            }
          })
        );
        break;
      case 'ProductDelete':
        await queueProductBulkDelete(stockId);
        break;
    }

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
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
 * @param stockId
 * @returns {Promise<null>}
 */
async function queueProductBulkDelete(stockId) {
  const docsSync = await collection
    .where('stockId', '==', stockId)
    .where('queueStatus', '!=', 'create')
    .get();
  const docs = await collection
    .where('stockId', '==', stockId)
    .where('queueStatus', '==', 'create')
    .get();
  if (!docsSync.empty) {
    await batchUpdate(firestore, docsSync.docs, {
      queueStatus: 'delete',
      syncStatus: 'new',
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  if (!docs.empty) {
    await batchDelete(firestore, docs.docs);
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
 * @param productShopifyId
 * @returns {Promise<any|null>}
 */
export async function getProductByShopifyProductId(shopId, productShopifyId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .where('productShopifyId', '==', `gid://shopify/Product/${productShopifyId}`)
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
 * @param shopId
 * @param shop
 * @returns {Promise<void|null>}
 */
export async function deleteProductsWhenUninstallByShopId(shopId, shop) {
  const docs = await collection.where('shopifyId', '==', shopId).get();
  const docsSynced = await collection
    .where('shopifyId', '==', shopId)
    .where('productShopifyId', '!=', '')
    .get();
  if (docs.empty) {
    return null;
  }
  if (!docsSynced.empty) {
    await docsSynced.docs.map(doc => {
      return actionQueueDelete(shop, doc.id, doc.data());
    });
  }
  return batchDelete(firestore, docs.docs);
}
