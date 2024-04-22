import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import fetch from 'node-fetch';
import {LUXURY_API_V1_URL} from '@functions/const/app';

const firestore = new Firestore();
/** @type CollectionReference */
const syncSettingsRef = firestore.collection('brandFilterSettings');

export async function getLXBrandList(token) {
  const resp = await fetch(LUXURY_API_V1_URL + '/brands', {
    method: 'GET',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`}
  });

  const result = await resp.json();
  if (
    result.hasOwnProperty('custom_code') &&
    result.hasOwnProperty('responseData') &&
    result.custom_code === '00'
  ) {
    return result.responseData.data;
  }

  return false;
}

/**
 * Get shop info by given shop ID
 *
 * @param {string} id
 * @return {Promise<FirebaseFirestore.DocumentData>}
 */
export async function getBrandSettingShopId(id) {
  const docs = await syncSettingsRef
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
export async function saveBrandSetting(shopId, shopifyDomain, data) {
  try {
    const docs = await syncSettingsRef
      .where('shopifyId', '==', shopId)
      .limit(1)
      .get();
    if (docs.empty) {
      await syncSettingsRef.add({
        shopifyId: shopId,
        shopifyDomain,
        ...data
      });
    } else {
      await docs.docs[0].ref.update({...data});
    }

    return {success: true};
  } catch (error) {
    console.log(error);
    return {success: false, error: error.message};
  }
}
