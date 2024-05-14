import {addOrder} from '@functions/repositories/orderRepository';

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function handleOrder(ctx) {
  const {apiData, shop} = ctx.state;
  const {id: shopId} = shop;
  const order = JSON.parse(apiData.requestBody);
  ctx.body = await addOrder(shopId, order);
}
