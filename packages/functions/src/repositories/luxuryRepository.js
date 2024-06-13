import {
  CURRENCY_API_URL,
  CURRENCY_WITH_NAME_API_URL,
  LUXURY_API_V1_URL,
  LUXURY_API_V2_URL
} from '@functions/const/app';
import {FieldValue, Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {api} from '@functions/helpers/api';
import {runMetafieldDelete, runMetafieldsQuery} from '@functions/services/shopify/graphqlService';

const firestore = new Firestore();
const collection = firestore.collection('luxuryShopInfos');

const CURRENCY_API_KEY = 'cur_live_VdJkKvqmHQul2RNVCxxIad7KGe8SU8uprCSH7Iw2';

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
 * @param headerParams
 * @returns {Promise<any>}
 */
export async function sendRequestCurrency(headerParams) {
  const result = await api(CURRENCY_API_URL, {
    method: 'GET',
    options: {
      headers: {...headerParams, apiKey: CURRENCY_API_KEY}
    }
  });

  if (result?.data) {
    return Object.values(result.data).map(obj => ({code: obj.code, value: obj.value}));
  }

  return [];
}

/**
 *
 * @param headerParams
 * @returns {Promise<any>}
 */
export async function sendRequestCurrencyWithName(headerParams) {
  const result = await api(CURRENCY_WITH_NAME_API_URL, {
    method: 'GET',
    options: {
      headers: {...headerParams, apiKey: CURRENCY_API_KEY}
    }
  });

  if (result?.data) {
    return Object.values(result.data).map(obj => ({
      code: obj.code,
      name: obj.name,
      symbol_native: obj.symbol_native
    }));
  }

  return [];
}

/**
 *
 * @param url
 * @param shopInfo
 * @returns {Promise<*|null>}
 */
async function sendStockListRequest({url, shopInfo}) {
  try {
    const token = await getLuxuryToken(shopInfo);
    const resp = await api(url, {
      options: {
        headers: {Authorization: `Bearer ${token}`}
      }
    });
    if (
      resp.hasOwnProperty('custom_code') &&
      resp.hasOwnProperty('data') &&
      resp.custom_code === '00'
    ) {
      return resp['data'];
    }
  } catch (e) {
    console.log(e);
  }

  return null;
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
 * @param url
 * @param shopInfo
 * @param method
 * @param data
 * @returns {Promise<*|null>}
 */
async function sendRequest({url, shopInfo, method = 'GET', data = null}) {
  try {
    const token = await getLuxuryToken(shopInfo);
    return await api(url, {
      method,
      options: {
        headers: {Authorization: `Bearer ${token}`}
      },
      data
    });
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
  const stockResponse = await sendRequest({
    url: LUXURY_API_V2_URL + `/stocks/${stockId}`,
    shopInfo
  });
  if (stockResponse) {
    if (!stockResponse?.data && stockResponse?.custom_code && stockResponse.custom_code === '45') {
      return {};
    }
    return stockResponse.data;
  }

  return null;
}

/**
 *
 * @param shopInfo
 * @param offset
 * @returns {Promise<*|null>}
 */
export async function getLuxuryStockList({shopInfo, offset = 0}) {
  return await sendStockListRequest({
    url: LUXURY_API_V2_URL + `/stocks?limit=1000&offset=${offset}`,
    shopInfo
  });
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
      if (creationTimestamp + 10 * 60 * 1000 < currentTimestamp) {
        tokenResult = await sendTokenRequest(data);
        if (tokenResult) {
          await updateLuxuryData(data.shopifyId, {
            token: tokenResult,
            tokenCreationTime: FieldValue.serverTimestamp()
          });
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
 * @param {string} id
 * @returns {Promise<FirebaseFirestore.DocumentData>}
 */
export async function getLuxuryShopInfoDocByShopifyId(id) {
  const docs = await collection
    .where('shopifyId', '==', id)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  return docs.docs[0];
}

/**
 *
 * @returns {Promise<*|null>}
 */
export async function getLuxuryShops(pause = false) {
  const docs = await collection.where('pause', '==', pause).get();
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
      tokenCreationTime: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      pause: false
    });
    if (luxuryRef) {
      const luxuryDoc = await collection.doc(luxuryRef.id).get();

      return {id: luxuryDoc.id, ...presentDataAndFormatDate(luxuryDoc)};
    }
  }
}

/**
 *
 * @param shopifyId
 * @param data
 * @returns {Promise<*>}
 */
export async function updateLuxuryData(shopifyId, data) {
  const luxuryDocs = await collection
    .where('shopifyId', '==', shopifyId)
    .limit(1)
    .get();
  const luxuryDoc = luxuryDocs.docs[0];
  if (!luxuryDoc) {
    throw new Error('No luxury found');
  }

  return luxuryDoc.ref.update({...data});
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

/**
 *
 * @param shop
 * @returns {Promise<void>}
 */
export async function deleteMetafields(shop) {
  const metafieldsQuery = await runMetafieldsQuery({shop});
  if (metafieldsQuery) {
    return Promise.all(
      metafieldsQuery.map(edge => {
        return runMetafieldDelete({
          shop,
          variables: {
            id: edge?.node?.id,
            deleteAllAssociatedMetafields: true
          }
        });
      })
    );
  }
}

/**
 *
 * @param shopifyId
 * @param errors
 * @returns {Promise<void>}
 */
export async function addMessageWhenPause(shopifyId, errors) {
  let errorMessage = '';
  for (const error of errors) {
    if (
      error?.message &&
      error.message.includes('Daily variant creation limit reached. Please try again later.')
    ) {
      errorMessage = error.message;
    }
  }
  if (errorMessage) {
    const lxShopDoc = await getLuxuryShopInfoDocByShopifyId(shopifyId);
    if (lxShopDoc) {
      return lxShopDoc.ref.update({
        pauseMessage: errorMessage,
        pause: true,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
}

/**
 *
 * @param luxuryShop
 * @returns {Promise<*>}
 */
export async function unPauseLuxuryShop(luxuryShop) {
  const updatedAtTimestamp = Date.parse(luxuryShop.updatedAt);
  const currentTimestamp = Date.now();
  if (updatedAtTimestamp + 24 * 60 * 60 * 1000 <= currentTimestamp) {
    return collection.doc(luxuryShop.id).update({
      pause: false,
      pauseMessage: '',
      updatedAt: FieldValue.serverTimestamp()
    });
  }
}
