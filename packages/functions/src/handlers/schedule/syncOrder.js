import {chunk} from '@avada/utils';
import {getLuxuryShops} from '@functions/repositories/luxuryRepository';
import {syncOrder} from '@functions/repositories/orderRepository';

const CHUNK_SIZE = 50;

/**
 *
 * @returns {Promise<void>}
 */
export default async function syncOrderData() {
  try {
    const shops = await getLuxuryShops();
    console.log('found shops to sync order');
    const shopChunks = chunk(shops, CHUNK_SIZE);
    for (const shopChunk of shopChunks) {
      await Promise.all(
        shopChunk.map(shop => {
          return syncOrder(shop.shopifyId);
        })
      );
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
