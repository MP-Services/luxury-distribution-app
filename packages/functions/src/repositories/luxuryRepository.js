import {LUXURY_API_V1_URL} from '@functions/const/app';
import {Firestore, FieldValue} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {api} from '@functions/helpers/api';

const firestore = new Firestore();
const luxuryInfosRef = firestore.collection('luxuryShopInfos');

/**
 *
 * @param data
 * @returns {Promise<any>}
 */
async function sendTokenRequest(data) {
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

async function getLXData(url, data, key = 'data') {
  try {
    const token = await getLuxuryToken(data);
    const resp = await api(url, {
      method: 'GET',
      options: {
        headers: {Authorization: `Bearer ${token}`}
      }
    });

    if (
      resp.hasOwnProperty('custom_code') &&
      resp.hasOwnProperty(key) &&
      resp.custom_code === '00'
    ) {
      return resp[key].data;
    }
  } catch (e) {
    console.log(e);
  }

  return [];
}

/**
 *
 * @param data
 * @returns {Promise<*|[]>}
 */
export async function getBrandList(data) {
  return await getLXData(LUXURY_API_V1_URL + '/brands', data, 'responseData');
}

export async function getLuxuryStockList(data) {
  return await getLXData(LUXURY_API_V1_URL + '/stocks', data);
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

      if (creationTimestamp + 59 * 60 * 60000 < currentTimestamp) {
        tokenResult = await sendTokenRequest(data);
      } else {
        tokenResult = token;
      }
    } else {
      tokenResult = await sendTokenRequest(data);
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
  const docs = await luxuryInfosRef
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
 * @param shopId
 * @param data
 * @returns {Promise<DocumentReference<FirebaseFirestore.DocumentData>|*>}
 */
export async function addLuxuryShopInfo(shopId, data) {
  const luxuryInfos = await getLuxuryShopInfoByShopifyId(shopId);
  if (!luxuryInfos) {
    const luxuryRef = await luxuryInfosRef.add({
      ...data,
      shopifyId: shopId,
      tokenCreationTime: FieldValue.serverTimestamp()
    });
    if (luxuryRef) {
      const luxuryDoc = await luxuryInfosRef.doc(luxuryRef.id).get();

      return presentDataAndFormatDate(luxuryDoc);
    }
  }
}

/**
 *
 * @param shopId
 * @param data
 * @returns {Promise<*>}
 */
export async function updateLuxuryToken(shopId, data) {
  const {username, identifier, publicKey} = {...data};
  const luxuryDocs = await luxuryInfosRef
    .where('shopId', shopId)
    .where('username', username)
    .where('identifier', identifier)
    .where('publicKey', publicKey)
    .limit(1)
    .get();
  const luxuryDoc = luxuryDocs[0];
  if (!luxuryDoc) {
    throw new Error('No setting found');
  }

  return luxuryDoc.ref.update(data);
}
