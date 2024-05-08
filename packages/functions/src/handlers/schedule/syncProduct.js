import {chunk} from '@avada/utils';
import {getLuxuryShops} from '@functions/repositories/luxuryRepository';
import {syncProducts} from '@functions/repositories/productRepository';

const CHUNK_SIZE = 50;

/**
 *
 * @returns {Promise<void>}
 */
export default async function syncProductData() {
  try {
    const shops = await getLuxuryShops();
    console.log('found shops to sync product');
    const shopChunks = chunk(shops, CHUNK_SIZE);
    for (const shopChunk of shopChunks) {
      await Promise.all(
        shopChunk.map(shop => {
          return syncProducts(shop.shopifyId);
        })
      );
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
