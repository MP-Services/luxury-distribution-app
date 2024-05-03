import Shopify from 'shopify-api-node';
export const API_VERSION = '2024-04';

/**
 * @param {Shop} shop
 * @param apiVersion
 * @returns {Shopify}
 */
export function initShopify(shop, apiVersion = API_VERSION) {
  const {shopifyDomain, accessToken} = shop;

  return new Shopify({
    apiVersion,
    accessToken,
    shopName: shopifyDomain,
    autoLimit: {calls: 2, interval: 1000, bucketSize: 35}
  });
}

/**
 * Get all Custom and Smart collection from Shopify
 *
 * @param {Shopify} shopify
 * @param defaultParams
 * @return {Promise<{data: Shopify.ICollection[], error}>}
 */
export async function getAllCollections(shopify, defaultParams = {}) {
  try {
    const collections = [];
    let params = {...defaultParams, limit: 250};
    while (params !== undefined) {
      const list = await shopify.customCollection.list(params);
      collections.push(...list);
      params = list.nextPageParameters;
    }
    params = {...defaultParams, limit: 250};
    while (params !== undefined) {
      const list = await shopify.smartCollection.list(params);
      collections.push(...list);
      params = list.nextPageParameters;
    }
    return {data: collections};
  } catch (e) {
    console.error(e);
    return {data: []};
  }
}
