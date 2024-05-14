import {Firestore} from '@google-cloud/firestore';
import {formatDateFields} from '@avada/firestore-utils';

/** @type Firestore */
const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('webhookLogs');

/**
 * @param shopifyDomain
 * @param webhookId
 * @returns {Promise<boolean>}
 */
export async function isWebhookLogExist(shopifyDomain, webhookId) {
  try {
    const docs = await collection
      .where('shopifyDomain', '==', shopifyDomain)
      .where('webhookId', '==', webhookId)
      .select()
      .limit(1)
      .get();

    return !docs.empty;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * @param shopifyDomain
 * @param webhookId
 * @param topic
 * @returns {Promise<FirebaseFirestore.DocumentReference>}
 */
export async function saveWebhookLog({shopifyDomain, webhookId, topic}) {
  try {
    return collection.add({
      shopifyDomain,
      webhookId,
      topic,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @param shopifyDomain
 * @returns {Promise<any[]|{data: *[]}>}
 */
export async function getAllWebhookLogs(shopifyDomain) {
  try {
    const docs = await collection.where('shopifyDomain', '==', shopifyDomain).get();

    return docs.docs.map(doc => ({id: doc.id, ...formatDateFields(doc.data())}));
  } catch (e) {
    console.error(e);
    return {data: []};
  }
}

/**
 *
 * @param webhookId
 * @param data
 * @returns {Promise<{success: boolean}|{success: boolean, error}>}
 */
export async function updateWebhookLogById(webhookId, data) {
  if (!webhookId) {
    return;
  }
  try {
    await collection.doc(webhookId).update(data);

    return {success: true};
  } catch (e) {
    console.log(e);
    return {success: false, error: e.message};
  }
}
