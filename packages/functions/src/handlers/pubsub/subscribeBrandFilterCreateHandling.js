import {createMetafields} from '../../repositories/productQueueRepository';
import {getLuxuryShopInfoByShopifyId, getLuxuryStockList} from "@functions/repositories/luxuryRepository";

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeBrandFilterCreateHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId} = data;
    await createMetafields(shopId);
  } catch (e) {
    console.error(e);
  }
}
