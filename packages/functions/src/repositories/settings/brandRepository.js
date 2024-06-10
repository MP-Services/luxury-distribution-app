import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getBrandList} from '@functions/repositories/luxuryRepository';
import publishTopic from '../../helpers/pubsub/publishTopic';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('brandFilterSettings');

export async function getLXBrandList(data) {
  return await getBrandList(data);
}

/**
 * Get shop info by given shop ID
 *
 * @param {string} id
 * @return {Promise<FirebaseFirestore.DocumentData>}
 */
export async function getBrandSettingShopId(id) {
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
export async function saveBrandFilterSetting(shopId, shopifyDomain, data) {
  try {
    const docs = await collection
      .where('shopifyId', '==', shopId)
      .limit(1)
      .get();
    if (docs.empty) {
      await collection.add({
        shopifyId: shopId,
        shopifyDomain,
        brands: data
      });
      await publishTopic('brandFilterCreateHandling', {shopId});
    } else {
      const doc = docs.docs[0];
      const beforeData = doc.data().brands;
      await docs.docs[0].ref.update({brands: data});
      await publishTopic('brandFilterUpdateHandling', {
        shopId,
        brandDataBefore: beforeData,
        brandDataAfter: data
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
export async function deleteBrandFilterByShopId(shopId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  return docs.docs[0].ref.delete();
}
