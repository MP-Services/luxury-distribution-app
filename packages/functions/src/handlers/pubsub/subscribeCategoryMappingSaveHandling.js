import {updateProductBulkWhenSaveMapping} from '../../repositories/productQueueRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeCategoryMappingSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, mappingData} = data;
    await updateProductBulkWhenSaveMapping(shopId, mappingData);
  } catch (e) {
    console.error(e);
  }
}
