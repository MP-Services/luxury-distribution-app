import {updateProductBulkWhenSaveGeneralSetting} from '../../repositories/shopifyProductRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeGeneralSettingSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, generalSettingBefore, generalSettingAfter} = data;
    const luxuryInfo = await getLuxuryShopInfoByShopifyId(shopId);
    if (!luxuryInfo?.deleteApp && luxuryInfo?.completeInitQueueAction) {
      await updateProductBulkWhenSaveGeneralSetting(
        shopId,
        generalSettingBefore,
        generalSettingAfter
      );
    }
  } catch (e) {
    console.error(e);
  }
}
