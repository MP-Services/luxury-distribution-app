import {LUXURY_API_V1_URL, LUXURY_API_V2_URL} from '@functions/const/app';
import {Firestore, FieldValue} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {api} from '@functions/helpers/api';

const firestore = new Firestore();
const collection = firestore.collection('luxuryShopInfos');

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
export async function sendTokenRequest(data) {
  const {publicKey, username, identifier} = {...data};
  const tokenResult = await api(LUXURY_API_V1_URL + '/token', {
    method: 'POST',
    options: {
      headers: {key: publicKey}
    },
    data: {credentials: {username, identifier}}
  });

  if (tokenResult.hasOwnProperty('custom_code') && tokenResult.custom_code === '00') {
    return tokenResult.data.token;
  }

  return false;
}

/**
 *
 * @param url
 * @param shopInfo
 * @param key
 * @param method
 * @param data
 * @returns {Promise<*|null>}
 */
async function sendLXRequest({url, shopInfo, key = 'data', method = 'GET', data = null}) {
  try {
    const token = await getLuxuryToken(shopInfo);
    const resp = await api(url, {
      method,
      options: {
        headers: {Authorization: `Bearer ${token}`}
      },
      data
    });
    if (
      resp.hasOwnProperty('custom_code') &&
      resp.hasOwnProperty(key) &&
      resp.custom_code === '00'
    ) {
      return resp[key]?.data || resp[key];
    }
  } catch (e) {
    console.log(e);
  }

  return null;
}

/**
 *
 * @param shopInfo
 * @param data
 * @returns {Promise<*|null>}
 */
export async function createOrder(shopInfo, data) {
  return await sendLXRequest({
    url: LUXURY_API_V1_URL + '/test-order',
    shopInfo,
    data,
    method: 'POST'
  });
}

/**
 *
 * @param shopInfo
 * @returns {Promise<*|[]>}
 */
export async function getBrandList(shopInfo) {
  return await sendLXRequest({url: LUXURY_API_V1_URL + '/brands', shopInfo, key: 'responseData'});
}

/**
 *
 * @param stockId
 * @param shopInfo
 * @returns {Promise<*|*[]>}
 */
export async function getStockById(stockId, shopInfo) {
  return await sendLXRequest({url: LUXURY_API_V2_URL + `/stocks/${stockId}`, shopInfo});
}

/**
 *
 * @param shopInfo
 * @returns {Promise<*|[]>}
 */
export async function getLuxuryStockList(shopInfo) {
  return await sendLXRequest({url: LUXURY_API_V2_URL + '/stocks', shopInfo});
}

/**
 *
 * @param shopInfo
 * @returns {Promise<*|null>}
 */
export async function getCategories(shopInfo) {
  return await sendLXRequest({url: LUXURY_API_V1_URL + '/product-category', shopInfo});
}

/**
 *
 * @param data
 * @returns {Promise<*|boolean>}
 */
export async function getLuxuryToken(data) {
  try {
    const {token, tokenCreationTime} = {...data};
    let tokenResult = '';
    if (token && tokenCreationTime) {
      const creationTimestamp = Date.parse(tokenCreationTime);
      const currentTimestamp = Date.now();
      if (creationTimestamp + 15 * 60 * 1000 < currentTimestamp) {
        tokenResult = await sendTokenRequest(data);
        if (tokenResult) {
          await updateLuxuryToken(data, tokenResult);
        }
      } else {
        tokenResult = token;
      }
    }
    if (tokenResult) {
      return tokenResult;
    }
  } catch (e) {
    console.error(e);
  }

  return false;
}

/**
 *
 * @param {string} id
 * @returns {Promise<FirebaseFirestore.DocumentData>}
 */
export async function getLuxuryShopInfoByShopifyId(id) {
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
 *
 * @returns {Promise<*|null>}
 */
export async function getLuxuryShops() {
  const docs = await collection.get();
  if (docs.empty) {
    return null;
  }
  return docs.docs.map(doc => ({id: doc.id, ...presentDataAndFormatDate(doc)}));
}

/**
 *
 * @param shopId
 * @param data
 * @returns {Promise<DocumentReference<FirebaseFirestore.DocumentData>|*>}
 */
export async function addLuxuryShopInfo(shopId, data) {
  const luxuryInfos = await getLuxuryShopInfoByShopifyId(shopId);
  if (!luxuryInfos) {
    const luxuryRef = await collection.add({
      ...data,
      shopifyId: shopId,
      tokenCreationTime: FieldValue.serverTimestamp()
    });
    if (luxuryRef) {
      const luxuryDoc = await collection.doc(luxuryRef.id).get();

      return presentDataAndFormatDate(luxuryDoc);
    }
  }
}

/**
 *
 * @param data
 * @param updateData
 * @returns {Promise<*>}
 */
export async function updateLuxuryToken(data, updateData) {
  const {username, identifier, publicKey, shopifyId} = {...data};
  const luxuryDocs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('username', '==', username)
    .where('identifier', '==', identifier)
    .where('publicKey', '==', publicKey)
    .limit(1)
    .get();
  const luxuryDoc = luxuryDocs.docs[0];
  if (!luxuryDoc) {
    throw new Error('No luxury found');
  }

  return luxuryDoc.ref.update({token: updateData, tokenCreationTime: FieldValue.serverTimestamp()});
}

/**
 *
 * @param shopId
 * @returns {Promise<*|null>}
 */
export async function deleteLuxuryShop(shopId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  return docs.docs[0].ref.delete();
}
