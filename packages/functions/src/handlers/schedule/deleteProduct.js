import {chunk} from '@avada/utils';
import {getLuxuryShops} from '@functions/repositories/luxuryRepository';
import {deleteProductsWhenUninstallByShopId} from '@functions/repositories/productRepository';

const CHUNK_SIZE = 50;

/**
 *
 * @returns {Promise<void>}
 */
export default async function deleteProductData() {
  try {
    const shops = await getLuxuryShops();
    console.log('found shops to delete product');
    const shopChunks = chunk(shops, CHUNK_SIZE);
    for (const shopChunk of shopChunks) {
      await Promise.all(
        shopChunk.map(luxuryShop => {
          return deleteProductsWhenUninstallByShopId(luxuryShop);
        })
      );
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
