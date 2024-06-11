import {FieldValue, Firestore} from '@google-cloud/firestore';
import {batchCreate, batchDelete} from '@functions/repositories/helper';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('luxuryStockTemps');

/**
 *
 * @param shops
 * @param data
 * @returns {Promise<void>}
 */
export async function addStockTemps(shops, data) {
  try {
    const createData = shops.map(shop => ({
      shopifyId: shop.shopifyId,
      ...data,
      createdAt: FieldValue.serverTimestamp()
    }));
    return batchCreate(firestore, collection, createData);
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @param shopifyId
 * @returns {Promise<void>}
 */
export async function getStockTemps(shopifyId) {
  try {
    const docs = await collection.where('shopifyId', '==', shopifyId).get();
    if (docs.empty) {
      return null;
    }
    return docs.docs.map(doc => ({uid: doc.id, ...doc.data()}));
  } catch (e) {
    console.error(e);
  }
  return null;
}

/**
 *
 * @param shopId
 * @returns {Promise<FirebaseFirestore.WriteResult|null>}
 */
export async function deleteStockTempWhenUninstall(shopId) {
  const docs = await collection.where('shopifyId', '==', shopId).get();
  if (docs.empty) {
    return null;
  }

  return batchDelete(firestore, docs.docs);
}
