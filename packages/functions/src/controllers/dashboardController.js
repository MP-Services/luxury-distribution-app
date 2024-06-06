import {getCurrentShop} from '../helpers/auth';
import {getProductCounts} from '@functions/repositories/productQueueRepository';

/**
 * @param ctx
 * @returns {Promise<{shop, shopInfo: *}>}
 */
export async function getDashboardInfo(ctx) {
  const shopId = getCurrentShop(ctx);

  ctx.body = await getProductCounts(shopId);
}
