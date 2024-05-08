import {addProducts, deleteProductsInQueue} from '../../repositories/productRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeBrandFilterUpdateHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId} = data;
    await deleteProductsInQueue(shopId);
    await addProducts(shopId);
  } catch (e) {
    console.error(e);
  }
}
