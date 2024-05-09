import {getCurrentShop} from '../../helpers/auth';
import {getSizeOptions} from '@functions/repositories/settings/attributeMappingRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 * @param ctx
 * @returns {Promise<{shop, shopInfo: *}>}
 */
export async function get(ctx) {
  const shopId = getCurrentShop(ctx);
  const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);

  ctx.body = {success: true, data: []};
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
