import {FieldValue, Firestore} from '@google-cloud/firestore';
import {chunk} from '@avada/utils';
import {hasCommonElement} from '@functions/repositories/helper';
import {
  createProductQueues,
  getQueueStockIdByStatus, getQueueStockIdByStatus
} from '@functions/repositories/productQueueRepository';
import {getLuxuryProductByBrands} from "@functions/repositories/luxuryProductRepository";

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('shopifyProducts');

/**
 *
 * @param shopifyId
 * @returns {Promise<number>}
 */
export async function getTotalProducts(shopifyId) {
  try {
    const docs = await collection
      .where('shopifyId', '==', shopifyId)
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
 * @param shopifyId
 * @param stockId
 * @returns {Promise<{[p: string]: FirebaseFirestore.DocumentFieldValue, uid: string}|null>}
 */
export async function getShopifyProductDoc(shopifyId, stockId) {
  try {
    const docs = await collection
      .where('shopifyId', '==', shopifyId)
      .where('stockId', '==', stockId)
      .get();
    if (!docs.empty) {
      return docs.docs[0];
    }
  } catch (e) {
    console.error(e);
  }

  return null;
}

/**
 *
 * @param doc
 * @returns {*&{uid}}
 */
export function getShopifyProductByDoc(doc) {
  return {uid: doc.id, ...doc.data()};
}

/**
 *
 * @param shopifyId
 * @param data
 * @returns {Promise<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>>}
 */
export async function addShopifyProduct(shopifyId, data) {
  return await collection.add({
    shopifyId,
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
}

/**
 *
 * @param shopifyId
 * @param data
 * @returns {Promise<DocumentReference<T>|void>}
 */
export async function saveShopifyProduct(shopifyId, data) {
  const {stockId} = data;
  const docs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('stockId', '==', stockId)
    .get();
  if (docs.empty) {
    return collection.add({
      shopifyId,
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  return docs.docs[0].ref.update({...data, updatedAt: FieldValue.serverTimestamp()});
}

/**
 *
 * @param shopifyId
 * @param mappingData
 * @returns {Promise<void>}
 */
export async function updateShopifyProductBulkWhenSaveMapping(shopifyId, mappingData) {
  if (mappingData.length) {
    const retailerCategories = mappingData.map(mappingRow => Number(mappingRow.retailerId));
    let shopifyProductQueriesDocsData = await getDocsAfterChunks(
      retailerCategories,
      shopifyId,
      'product_category_id',
      'in'
    );

    if (shopifyProductQueriesDocsData.length) {
    const queueStockIds = await getQueueStockIdByStatus(shopifyId, 'update');
    if(queueStockIds.length) {
      shopifyProductQueriesDocsData = shopifyProductQueriesDocsData.filter(item => !queueStockIds.includes(item.stockId))
    }
      return createProductQueues(shopifyId, shopifyProductQueriesDocsData, false, 'update');
    }
  }
}

/**
 *
 * @param shopifyId
 * @param brandDataBefore
 * @param brandDataAfter
 * @returns {Promise<Awaited<unknown>[]>}
 */
export async function updateShopifyProductBulkWhenSaveBrand(
    shopifyId,
    brandDataBefore,
    brandDataAfter
) {
  const brandRemoved = brandDataBefore.filter(brand => !brandDataAfter.includes(brand));
  const brandAdded = brandDataAfter.filter(brand => !brandDataBefore.includes(brand));
  const action = [];
  if(brandRemoved.length) {
    let shopifyProductQueriesDocsData = await getDocsAfterChunks(
        brandRemoved,
        shopifyId,
        'sizes',
        ' array-contains-any'
    );
    if (shopifyProductQueriesDocsData.length) {
      const queueStockIds = await getQueueStockIdByStatus(shopifyId, 'update');
      if(queueStockIds.length) {
        shopifyProductQueriesDocsData = shopifyProductQueriesDocsData.filter(item => !queueStockIds.includes(item.stockId))
      }
      return createProductQueues(shopifyId, shopifyProductQueriesDocsData, false, 'update');
    }
  }
  if(brandAdded.length) {
    const lxProducts =  await getLuxuryProductByBrands(shopifyId, brandAdded);
    const queueStockIds = await getQueueStockIdByStatus(shopifyId, 'create');
    const newProductNeedAdd = lxProducts.map(lxproduct => !queueStockIds.includes(lxproduct.stockId));
    return createProductQueues(shopifyId, newProductNeedAdd, true, 'create');
  }
  if(action.length) {
    return Promise.all(action);
  }
}

/**
 *
 * @param shopifyId
 * @param syncDataBefore
 * @param syncDataAfter
 * @returns {Promise<Awaited<unknown>[]>}
 */
export async function updateShopifyProductBulkWhenSaveSyncSetting(
  shopifyId,
  syncDataBefore,
  syncDataAfter
) {
  if (!syncDataBefore || hasSyncSettingsValueChanged(syncDataBefore, syncDataAfter)) {
    return bulkCreateQueueWhenChangeConfig(shopifyId, 'stockId', 'not-in');
  }
}

/**
 *
 * @param chunksData
 * @param shopifyId
 * @param field
 * @param condition
 * @returns {Promise<*[]>}
 */
export async function getDocsAfterChunks(chunksData, shopifyId, field, condition, type = '') {
  const chunksArr = chunk(chunksData, 30);
  const shopifyProductQueries = [];
  switch (type) {
    case 'out-of-stock':
      for (const chunkArr of chunksArr) {
        shopifyProductQueries.push(
            collection
                .where('shopifyId', '==', shopifyId)
                .where('hasOptionOutOfStock', '==', true)
                .where(field, condition, chunkArr)
                .get()
        );
      }
      break;
    default:
      for (const chunkArr of chunksArr) {
        shopifyProductQueries.push(
            collection
                .where('shopifyId', '==', shopifyId)
                .where(field, condition, chunkArr)
                .get()
        );
      }
  }
  const shopifyProductQueriesResult = await Promise.all(shopifyProductQueries);
  const shopifyProductQueriesDocsData = [];
  for (const shopifyProductQueryResult of shopifyProductQueriesResult) {
    if (!shopifyProductQueryResult.empty) {
      shopifyProductQueriesDocsData.push(shopifyProductQueryResult.docs.map(doc => doc.data()));
    }
  }
  return shopifyProductQueriesDocsData;
}

/**
 *
 * @param syncDataBefore
 * @param syncDataAfter
 * @returns {*}
 */
function hasSyncSettingsValueChanged(syncDataBefore, syncDataAfter) {
  return Object.keys(syncDataBefore).some(key => syncDataBefore[key] !== syncDataAfter[key]);
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
  let shopifyProductQueriesDocsData = await getDocsAfterChunks(
    retailerOptionNames,
    shopId,
    'sizes',
    ' array-contains-any'
  );
  if (shopifyProductQueriesDocsData.length) {
    const queueStockIds = await getQueueStockIdByStatus(shopId, 'update');
    if(queueStockIds.length) {
      shopifyProductQueriesDocsData = shopifyProductQueriesDocsData.filter(item => !queueStockIds.includes(item.stockId))
    }
    return createProductQueues(shopId, shopifyProductQueriesDocsData, false, 'update');
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
        generalSettingBefore?.pricesRounding !== generalSettingAfter?.pricesRounding))
  ) {
    return bulkCreateQueueWhenChangeConfig(shopifyId, 'stockId', 'not-in');
  }

  if(generalSettingBefore?.deleteOutStock != generalSettingAfter?.deleteOutStock) {
    return bulkCreateQueueWhenChangeConfig(shopifyId, 'stockId', 'not-in', 'out-of-stock');
  }
}

/**
 *
 * @param shopifyId
 * @param field
 * @param condition
 * @param type
 * @returns {Promise<Awaited<unknown>[]>}
 */
export async function bulkCreateQueueWhenChangeConfig(shopifyId, field, condition, type) {
  const updateQueues = await getQueueStockIdByStatus(shopifyId, 'update');
  if(updateQueues) {
    const shopifyProductQueriesDocsData = await getDocsAfterChunks(
        updateQueues,
        shopifyId,
        field,
        condition,
        type
    );
    if (shopifyProductQueriesDocsData.length) {
      const shopifyProductQueriesDocsDataChunks = chunk(shopifyProductQueriesDocsData, 10000);
      return Promise.all(
          shopifyProductQueriesDocsDataChunks.map(shopifyProductQueriesDocsDataChunk =>
              createProductQueues(shopifyId, shopifyProductQueriesDocsDataChunk, false, 'update')
          )
      );
    }
  } else {
    const stockIdsDocs = await collection.where('shopifyId', '==', shopifyId).get();
    if (!stockIdsDocs.empty) {
      const stockIdsDocsChunks = chunk(stockIdsDocs, 10000);
      return Promise.all(
          stockIdsDocsChunks.map(stockIdsDocsChunk =>
              createProductQueues(shopifyId, stockIdsDocsChunk, false, 'update')
          )
      );
    }
  }
}
