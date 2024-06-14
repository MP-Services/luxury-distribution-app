import {chunk} from '@avada/utils';
import {getLuxuryShopsToSyncProducts} from '@functions/repositories/luxuryRepository';
import {syncProducts} from '@functions/repositories/productQueueRepository';

const CHUNK_SIZE = 50;

/**
 *
 * @returns {Promise<void>}
 */
export default async function syncProductData() {
  try {
    const shops = await getLuxuryShopsToSyncProducts();
    if (shops) {
      console.log('found shops to sync product');
      const shopChunks = chunk(shops, CHUNK_SIZE);
      for (const shopChunk of shopChunks) {
        await Promise.all(
          shopChunk.map(luxuryShop => {
            return syncProducts(luxuryShop.shopifyId);
          })
        );
      }
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
