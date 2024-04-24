import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getBrandList} from "@functions/repositories/luxuryRepository";

const firestore = new Firestore();
/** @type CollectionReference */
const brandSettingsRef = firestore.collection('brandFilterSettings');

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
  const docs = await brandSettingsRef
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
    const docs = await brandSettingsRef
      .where('shopifyId', '==', shopId)
      .limit(1)
      .get();
    if (docs.empty) {
      await brandSettingsRef.add({
        shopifyId: shopId,
        shopifyDomain,
        brands: data
      });
    } else {
      await docs.docs[0].ref.update({brands: data});
    }

    return {success: true};
  } catch (error) {
    console.log(error);
    return {success: false, error: error.message};
  }
}
