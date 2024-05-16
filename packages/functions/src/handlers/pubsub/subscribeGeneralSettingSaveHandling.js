import {updateProductBulkWhenSaveGeneralSetting} from '../../repositories/productRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeGeneralSettingSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, generalSetting} = data;
    await updateProductBulkWhenSaveGeneralSetting(shopId, generalSetting);
  } catch (e) {
    console.error(e);
  }
}
