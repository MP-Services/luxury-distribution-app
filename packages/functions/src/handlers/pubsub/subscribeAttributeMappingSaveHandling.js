import {updateProductBulkWhenSaveAttributeMapping} from '../../repositories/productRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeAttributeMappingSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, saveDAta: attributeMappingData} = data;
    await updateProductBulkWhenSaveAttributeMapping(shopId, attributeMappingData);
  } catch (e) {
    console.error(e);
  }
}
