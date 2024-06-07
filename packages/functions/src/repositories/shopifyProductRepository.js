import {FieldValue, Firestore} from '@google-cloud/firestore';

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
