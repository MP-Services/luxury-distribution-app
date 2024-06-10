import {updateProductBulkWhenSaveAttributeMapping} from '../../repositories/shopifyProductRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeAttributeMappingSaveHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, saveDataBefore, saveDataAfter} = data;
    const luxuryInfo = await getLuxuryShopInfoByShopifyId(shopId);
    if (!luxuryInfo?.deleteApp && luxuryInfo?.completeInitQueueAction) {
      await updateProductBulkWhenSaveAttributeMapping(shopId, saveDataBefore, saveDataAfter);
    }
  } catch (e) {
    console.error(e);
  }
}
