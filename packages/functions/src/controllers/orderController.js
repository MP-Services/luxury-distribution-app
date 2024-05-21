import {getCurrentShop} from '../helpers/auth';
import {getOrders} from '@functions/repositories/orderRepository';

/**
 * @param ctx
 * @returns {Promise<{shop, shopInfo: *}>}
 */
export async function getList(ctx) {
  const shopId = getCurrentShop(ctx);

  ctx.body = await getOrders(shopId, ctx.query);
}
