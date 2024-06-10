import {updateShopifyProductBulkWhenSaveSyncSetting} from '../../repositories/shopifyProductRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeSyncSettingsSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, syncDataBefore, syncDataAfter} = data;
    const luxuryInfo = await getLuxuryShopInfoByShopifyId(shopId);
    if (!luxuryInfo?.deleteApp && luxuryInfo?.completeInitQueueAction) {
      await updateShopifyProductBulkWhenSaveSyncSetting(shopId, syncDataBefore, syncDataAfter);
    }
  } catch (e) {
    console.error(e);
  }
}
