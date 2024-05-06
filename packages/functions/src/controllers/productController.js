import {getCurrentShop} from '@functions/helpers/auth';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';
import {addProducts, getProducts, syncProducts} from '@functions/repositories/productRepository';

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

export async function getProductsInfo(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const products = await getProducts(shopId);

  } catch (e) {
    ctx.body = {
      success: false
    };
    console.error(e);
  }
}
