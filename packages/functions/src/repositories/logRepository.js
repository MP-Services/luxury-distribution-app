import {FieldValue, Firestore} from '@google-cloud/firestore';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('log');

/**
 *
 * @param shopifyDomain
 * @param data
 * @returns {Promise<void>}
 */
export async function addLog(shopifyDomain, data) {
  try {
    await collection.add({shopifyDomain, ...data, createdAt: FieldValue.serverTimestamp()});
  } catch (e) {
    console.log(e);
  }
}
