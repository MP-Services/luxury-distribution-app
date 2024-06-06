import {productWebhook} from '@functions/repositories/productQueueRepository';
import {addLog} from '@functions/repositories/productWebhookLogRepository';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function webhook(ctx) {
  try {
    const hookResult = await productWebhook(ctx.req.body);
    await addLog(ctx.req.body);
    ctx.body = {
      success: hookResult
    };
  } catch (e) {
    console.error(e);
    ctx.body = {
      success: false
    };
  }
}
