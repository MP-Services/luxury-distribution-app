import {FieldValue, Firestore} from '@google-cloud/firestore';
import {batchDelete} from '@functions/repositories/helper';

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

/**
 *
 * @returns {Promise<void>}
 */
export async function deleteProductWebhookLog() {
  try {
    const docs = await collection.get();
    await batchDelete(firestore, docs.docs);
  } catch (e) {
    console.log(e);
  }
}
