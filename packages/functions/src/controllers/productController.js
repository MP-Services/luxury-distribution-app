import {getCurrentShop} from '@functions/helpers/auth';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';
import {addProducts, createMetafields, syncProducts} from '@functions/repositories/productRepository';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function sync(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    // await addProducts(shopId);
    // await syncProducts(shopId, luxuryShopInfo);
    ctx.body = {
      success: true
    };
  } catch (e) {
    console.error(e);
  }
  ctx.body = {
    success: false
  };
}
