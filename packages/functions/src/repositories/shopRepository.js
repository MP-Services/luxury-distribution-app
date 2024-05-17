import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import presentShop from '@functions/presenters/shopPresenter';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('shops');

/**
 * @param id
 * @returns {Promise<{Shop}>}
 */
export async function getShopById(id) {
  const doc = await collection.doc(id).get();
  return presentDataAndFormatDate(doc, presentShop);
}

/**
 * @param id
 * @returns {Promise<{Shop}>}
 */
export async function getShopByIdIncludeAccessToken(id) {
  const doc = await collection.doc(id).get();
  return presentDataAndFormatDate(doc);
}

/**
 * Get shop by field
 *
 * @param {string} value
 * @param {string} field
 * @returns {Promise<Shop|*>}
 */
export async function getShopByField(value, field = 'shopifyDomain') {
  const docs = await collection
    .where(field, '==', value)
    .limit(1)
    .get();

  if (docs.docs.length === 0) {
    return null;
  }

  const doc = docs.docs[0];
  return {id: doc.id, ...doc.data()};
}

/**
 * @param shopId
 * @param postData
 * @return {Promise<{success: boolean, error: *}>}
 */
export async function updateShopData(shopId, postData) {
  if (isEmpty(postData)) {
    return {success: true};
  }
  try {
    await collection.doc(shopId).update(postData);
    return {success: true};
  } catch (e) {
    console.error(e);
    return {success: false, error: e.message};
  }
}
