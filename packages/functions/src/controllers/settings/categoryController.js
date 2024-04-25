import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  getShopifyCollections,
  saveCategoryMapping,
  getRetailerCategory,
  getMappingData
} from '@functions/repositories/settings/categoryRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function save(ctx) {
  const postData = ctx.req.body;
  const {shopID, shopifyDomain} = getCurrentUser(ctx);
  ctx.body = await saveCategoryMapping(shopID, shopifyDomain, postData);
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function getDropShipperCategory(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const shopifyCollections = await getShopifyCollections(shopId);
    ctx.body = {success: true, data: shopifyCollections.data};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function getRetailerCat(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);
    const data = await getRetailerCategory(luxuryShopInfo);
    ctx.body = {success: true, data};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}

export async function get(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const mappingData = await getMappingData(shopId);
    ctx.body = {success: true, data: mappingData};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}
