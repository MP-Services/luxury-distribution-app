import {getLuxuryShops, unPauseLuxuryShop} from '@functions/repositories/luxuryRepository';
import {chunk} from '@avada/utils';
const CHUNK_SIZE = 50;
/**
 *
 * @returns {Promise<void>}
 */
export default async function UnPauseShopSchedule() {
  try {
    const shopsPause = await getLuxuryShops(true);
    console.log('found shops to unpause');
    if (shopsPause) {
      const shopChunks = chunk(shopsPause, CHUNK_SIZE);
      for (const shopChunk of shopChunks) {
        await Promise.all(
          shopChunk.map(luxuryShop => {
            return unPauseLuxuryShop(luxuryShop);
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
