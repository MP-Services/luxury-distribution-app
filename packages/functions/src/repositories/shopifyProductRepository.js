import {FieldValue, Firestore} from '@google-cloud/firestore';
import {chunk} from '@avada/utils';
import {
  createProductQueues,
  getQueueByStatus
} from '@functions/repositories/productQueueRepository';

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
    const shopifyProductQueriesDocsData = await getDocsAfterChunks(
      retailerCategories,
      shopifyId,
      'product_category_id',
      'in'
    );
    if (shopifyProductQueriesDocsData.length) {
      return createProductQueues(shopifyId, shopifyProductQueriesDocsData, false, 'update');
    }
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
    const updateQueues = await getQueueByStatus(shopifyId, 'update');
    if (updateQueues) {
      const shopifyProductQueriesDocsData = await getDocsAfterChunks(
        updateQueues,
        shopifyId,
        'stockId',
        'not-in'
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
}

/**
 *
 * @param chunksData
 * @param shopifyId
 * @param field
 * @param condition
 * @returns {Promise<*[]>}
 */
export async function getDocsAfterChunks(chunksData, shopifyId, field, condition) {
  const categoriesChunks = chunk(chunksData, 30);
  const shopifyProductQueries = [];
  for (const categoriesChunk of categoriesChunks) {
    shopifyProductQueries.push(
      collection
        .where('shopifyId', '==', shopifyId)
        .where(field, condition, categoriesChunk)
        .get()
    );
  }
  const shopifyProductQueriesResult = await Promise.all(shopifyProductQueries);
  const shopifyProductQueriesDocsData = [];
  for (const shopifyProductQueryResult of shopifyProductQueriesResult) {
    if (!shopifyProductQueryResult.empty) {
      shopifyProductQueriesDocsData.push(shopifyProductQueryResult.docs().map(doc => doc.data()));
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
