import {getCurrentShop} from '@functions/helpers/auth';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';
import {addProducts, syncProducts} from '@functions/repositories/productRepository';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function sync(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);
    await syncProducts(shopId, luxuryShopInfo);
    return (ctx.body = {
      success: true
    });
  } catch (e) {
    console.error(e);
  }
  return (ctx.body = {
    success: false
  });
}
