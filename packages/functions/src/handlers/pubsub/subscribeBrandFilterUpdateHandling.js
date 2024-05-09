import {
  addProducts,
  deleteProductsInQueueWhenChangeBrandFilter
} from '../../repositories/productRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeBrandFilterUpdateHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId} = data;
    await deleteProductsInQueueWhenChangeBrandFilter(shopId);
    await addProducts(shopId);
  } catch (e) {
    console.error(e);
  }
}
