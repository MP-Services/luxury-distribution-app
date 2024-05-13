import {getShopByField} from '../repositories/shopRepository';
import {createWebhooks, initShopify} from './shopifyService';
import appConfig from '../config/app';

/**
 * @param {object} ctx
 * @return {Promise<void>}
 */
export async function installApp(ctx) {
  const shopifyDomain = ctx.state.shopify.shop;
  console.log('Installing shop', shopifyDomain);
  const shop = await getShopByField(shopifyDomain);
  const shopify = initShopify(shop);

  await createWebhooks(shopify);
}

/**
 * @param {object} ctx
 * @return {Promise<void>}
 */
export async function afterLogin(ctx) {
  try {
    const shopifyDomain = ctx.state.shopify.shop;
    if (
      appConfig.baseUrl !== 'luxury-distribution.io' &&
      appConfig.baseUrl.includes('trycloudflare')
    ) {
      const shop = await getShopByField(shopifyDomain);
      const shopify = initShopify(shop);
      await createWebhooks(shopify);
    }
  } catch (e) {
    console.error(e);
  }
}
