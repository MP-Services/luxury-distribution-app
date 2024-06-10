import {updateShopifyProductBulkWhenSaveBrand} from "@functions/repositories/shopifyProductRepository";
import {getLuxuryShopInfoByShopifyId} from "@functions/repositories/luxuryRepository";

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeBrandFilterUpdateHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId, brandDataBefore, brandDataAfter} = data;
    const luxuryInfo = await getLuxuryShopInfoByShopifyId(shopId);
    if (!luxuryInfo?.deleteApp && luxuryInfo?.completeInitQueueAction) {
      await updateShopifyProductBulkWhenSaveBrand(shopId, brandDataBefore, brandDataAfter);
    }
  } catch (e) {
    console.error(e);
  }
}
