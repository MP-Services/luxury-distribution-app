import fetch from 'node-fetch';
import {LUXURY_API_V1_URL} from '@functions/const/app';
import {Firestore, FieldValue} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';

const firestore = new Firestore();
const luxuryInfosRef = firestore.collection('luxuryShopInfos');

export async function getLuxuryToken(data) {
  try {
    const {username, identifier, publicKey, shopifyUrl} = {...data};
    const resp = await fetch(LUXURY_API_V1_URL + '/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', key: publicKey},
      body: JSON.stringify({credentials: {username, identifier}})
    });
    const result = await resp.json();
    if (result.hasOwnProperty('custom_code') && result.custom_code === '00') {
      return {
        success: true,
        token: result.data.token
      };
    }
  } catch (e) {
    console.error(e);
  }

  return {
    success: false
  };
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
      shopId,
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
