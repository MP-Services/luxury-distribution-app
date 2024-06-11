import {deleteQueueSuccess} from '@functions/repositories/productQueueRepository';
import {deleteProductWebhookLog} from '@functions/repositories/productWebhookLogRepository';
import {deleteWebhookLog} from '@functions/repositories/webhookLogRepository';

/**
 *
 * @returns {Promise<void>}
 */
export default async function deleteQueueAndWebhookLogData() {
  try {
    return Promise.all([deleteQueueSuccess(), deleteProductWebhookLog(), deleteWebhookLog()]);
  } catch (e) {
    console.error(e);
    return false;
  }
}
