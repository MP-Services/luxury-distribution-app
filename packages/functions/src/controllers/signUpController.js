import {getLuxuryToken, addLuxuryShopInfo} from '@functions/repositories/luxuryRepository';
import {getShopById} from '@functions/repositories/shopRepository';
import {getCurrentShop} from '@functions/helpers/auth';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function signUp(ctx) {
  try {
    const {shopifyDomain, ...luxuryAuthInfo} = {...ctx.req.body};
    const tokenResult = await getLuxuryToken(ctx.req.body);
    if (tokenResult) {
      const shopId = getCurrentShop(ctx);
      const shop = await getShopById(shopId);
      if (shop.shopifyDomain === shopifyDomain) {
        const luxuryInfos = await addLuxuryShopInfo(shopId, {
          shopifyDomain: shop.shopifyDomain,
          token: tokenResult,
          ...luxuryAuthInfo
        });
        if (luxuryInfos) {
          return (ctx.body = {
            success: true
          });
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return (ctx.body = {
    success: false
  });
}
