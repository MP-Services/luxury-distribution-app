import {
  addProducts,
  deleteProductsInQueueWhenChangeBrandFilter
} from '../../repositories/productQueueRepository';
import {getBrandSettingShopId} from "@functions/repositories/settings/brandRepository";

/**
 *
 * @param message
 * @returns {Promise<void>}
 */
export default async function subscribeBrandFilterUpdateHandling(message) {
  try {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const {shopId} = data;
    const brandFilterData = await getBrandSettingShopId(shopId);
    await deleteProductsInQueueWhenChangeBrandFilter(shopId, brandFilterData);
    await addProducts(shopId);
  } catch (e) {
    console.error(e);
  }
}
