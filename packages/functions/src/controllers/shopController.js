import {getCurrentShop} from '../helpers/auth';
import {getShopInfoByShopId} from '@functions/repositories/shopInfoRepository';
import {getShopById} from '@functions/repositories/shopRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 * @param ctx
 * @returns {Promise<{shop, shopInfo: *}>}
 */
export async function getUserShops(ctx) {
  const shopId = getCurrentShop(ctx);
  const [shop, shopInfo] = await Promise.all([getShopById(shopId), getShopInfoByShopId(shopId)]);
  ctx.body = {shop, shopInfo};
}

export async function luxuryInfos(ctx) {
  const shopId = getCurrentShop(ctx);
  const luxuryInfos = await getLuxuryShopInfoByShopifyId(shopId);
  ctx.body = {luxuryInfos};
}
