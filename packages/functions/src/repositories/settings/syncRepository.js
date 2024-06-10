import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import publishTopic from "@functions/helpers/pubsub/publishTopic";

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('syncSettings');

/**
 * Get shop info by given shop ID
 *
 * @param {string} id
 * @return {Promise<FirebaseFirestore.DocumentData>}
 */
export async function getSyncSettingShopId(id) {
  const docs = await collection
    .where('shopifyId', '==', id)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }
  const [doc] = docs.docs;
  return presentDataAndFormatDate(doc);
}

/**
 * Get shop info by given shop ID
 *
 * @param {string} shopId
 * @param data
 * @return {Promise<{success: boolean, error?: string}>}
 */
export async function saveSyncSetting(shopId, shopifyDomain, data) {
  try {
    const docs = await collection
      .where('shopifyId', '==', shopId)
      .limit(1)
      .get();
    if (docs.empty) {
      await collection.add({
        shopifyId: shopId,
        shopifyDomain,
        ...data
      });
      await publishTopic('syncSettingsSaveHandling', {
        shopId,
        syncDataBefore: null,
        syncDataAfter: data
      });
    } else {
      const doc = docs.docs[0];
      await doc.ref.update({...data});
      await publishTopic('syncSettingsSaveHandling', {
        shopId,
        syncDataBefore: doc.data(),
        syncDataAfter: data
      });
    }

    return {success: true};
  } catch (error) {
    console.log(error);
    return {success: false, error: error.message};
  }
}

/**
 *
 * @param shopId
 * @returns {Promise<*|null>}
 */
export async function deleteSyncSettingByShopId(shopId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  return docs.docs[0].ref.delete();
}
