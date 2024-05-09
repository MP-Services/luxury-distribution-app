import {productWebhook} from '@functions/repositories/productRepository';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function update(ctx) {
  try {
    const hookResult = await productWebhook(ctx.req.body);
    ctx.body = {
      success: hookResult
    };
  } catch (e) {
    console.error(e);
  }
  ctx.body = {
    success: false
  };
}
