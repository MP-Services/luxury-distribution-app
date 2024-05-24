import {updateProductBulkWhenSaveAttributeMapping} from '../../repositories/productRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeAttributeMappingSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, saveDataBefore, saveDataAfter} = data;
    await updateProductBulkWhenSaveAttributeMapping(shopId, saveDataBefore, saveDataAfter);
  } catch (e) {
    console.error(e);
  }
}
