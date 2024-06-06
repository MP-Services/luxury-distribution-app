import {chunk} from '@avada/utils';
import {getLuxuryShops} from '@functions/repositories/luxuryRepository';
import {initQueues} from '@functions/repositories/productQueueRepository';

const CHUNK_SIZE = 50;

/**
 *
 * @returns {Promise<void>}
 */
export default async function initProductQueueData() {
  try {
    const shops = await getLuxuryShops();
    console.log('found shops to init product queue');
    const shopChunks = chunk(shops, CHUNK_SIZE);
    for (const shopChunk of shopChunks) {
      await Promise.all(
        shopChunk.map(luxuryShop => {
          return initQueues(luxuryShop);
        })
      );
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
