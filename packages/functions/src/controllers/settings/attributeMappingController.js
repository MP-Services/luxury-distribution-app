import {getCurrentShop} from '../../helpers/auth';
import {
  getSizeOptions,
  getAttributeMappingData,
  saveAttributeMapping
} from '@functions/repositories/settings/attributeMappingRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 * @param ctx
 * @returns {Promise<{shop, shopInfo: *}>}
 */
export async function get(ctx) {
  const shopId = getCurrentShop(ctx);
  const attributeMappingData = await getAttributeMappingData(shopId);
  if (attributeMappingData) {
    return (ctx.body = {success: true, data: attributeMappingData});
  }

  return (ctx.body = {success: false});
}

/**
 * @param ctx
 * @returns {Promise<{shop, shopInfo: *}>}
 */
export async function getOptionsMapping(ctx) {
  const shopId = getCurrentShop(ctx);
  const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);

  ctx.body = await getSizeOptions(luxuryShopInfo);
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function save(ctx) {
  const shopId = getCurrentShop(ctx);
  ctx.body = await saveAttributeMapping(shopId, ctx.req.body.data);
}
