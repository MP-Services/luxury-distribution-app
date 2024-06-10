import {FieldValue, Firestore} from '@google-cloud/firestore';
import {chunk} from '@avada/utils';
import {createProductQueues} from '@functions/repositories/productQueueRepository';

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
    const categoriesChunks = chunk(retailerCategories, 30);
    const shopifyProductQueries = [];
    for (const categoriesChunk of categoriesChunks) {
      shopifyProductQueries.push(
        collection
          .where('shopifyId', '==', shopifyId)
          .where('product_category_id', 'in', categoriesChunk)
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
    if (shopifyProductQueriesDocsData.length) {
      return createProductQueues(shopifyId, shopifyProductQueriesDocsData, false, 'update');
    }
  }
}
