import {FieldValue, Firestore} from '@google-cloud/firestore';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('productWebhookLogs');

/**
 *
 * @param data
 * @returns {Promise<void>}
 */
export async function addLog(data) {
  try {
    await collection.add({...data, createdAt: FieldValue.serverTimestamp()});
  } catch (e) {
    console.log(e);
  }
}
