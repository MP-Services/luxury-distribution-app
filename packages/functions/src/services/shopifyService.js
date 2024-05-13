import Shopify from 'shopify-api-node';
import appConfig from '../config/app';
import {isEmpty} from '@avada/utils';
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

/**
 * @param shopify
 * @param baseUrl
 * @return {Promise<Shopify.IPaginatedResult<Shopify.IWebhook>>}
 */
export async function createWebhooks(shopify, baseUrl = appConfig.baseUrl) {
  const webhooks = [{topic: 'orders/create', path: 'orders'}];
  const currentWebhooks = await shopify.webhook.list();
  const unusedHooks = currentWebhooks.filter(webhook => !webhook.address.includes(baseUrl));
  if (!isEmpty(unusedHooks)) {
    await resolveAll(unusedHooks.map(hook => shopify.webhook.delete(hook.id)));
  }
  await Promise.all(
    webhooks.map(({topic, path}) => {
      const url = `https://${baseUrl}/app/api/v1/${path}`;
      if (currentWebhooks.find(webhook => webhook.address === url && topic === webhook.topic)) {
        return Promise.resolve();
      }
      console.log('create webhook');
      console.log(url);
      return shopify.webhook
        .create({
          topic,
          address: url
        })
        .catch(e => console.log('error create webhooks', topic, e.message));
    })
  );
  return await shopify.webhook.list();
}

function resolveAll(promises) {
  return Promise.all(promises.map(p => p.catch(e => console.error(e))));
}
