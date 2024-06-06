import {updateProductBulkWhenSaveGeneralSetting} from '../../repositories/productQueueRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeGeneralSettingSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, generalSettingBefore, generalSettingAfter} = data;
    await updateProductBulkWhenSaveGeneralSetting(
      shopId,
      generalSettingBefore,
      generalSettingAfter
    );
  } catch (e) {
    console.error(e);
  }
}
