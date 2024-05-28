import * as shopRepository from '../repositories/shopRepository';
import {deleteLuxuryShop} from '@functions/repositories/luxuryRepository';
import {deleteOrdersByShopId} from '@functions/repositories/orderRepository';
import {deleteAttributeMapping} from '@functions/repositories/settings/attributeMappingRepository';
import {deleteBrandFilterByShopId} from '@functions/repositories/settings/brandRepository';
import {deleteGeneralSettingByShopId} from '@functions/repositories/settings/generalRepository';
import {deleteSyncSettingByShopId} from '@functions/repositories/settings/syncRepository';
import {deleteCategoryMappingsByShopId} from '@functions/repositories/settings/categoryRepository';

/**
 * Remove some information about shop after uninstalling app
 *
 * @param {object} ctx
 * @return {Promise<void>}
 */
export async function uninstallApp(ctx) {
  const domain = ctx.get('X-Shopify-Shop-Domain');
  const shop = await shopRepository.getShopByField(domain);
  if (shop !== null && shop.accessToken !== null) {
    const shopifyId = shop.id;

    await Promise.all([
      deleteLuxuryShop(shopifyId),
      deleteOrdersByShopId(shopifyId),
      deleteAttributeMapping(shopifyId),
      deleteBrandFilterByShopId(shopifyId),
      deleteCategoryMappingsByShopId(shopifyId),
      deleteGeneralSettingByShopId(shopifyId),
      deleteSyncSettingByShopId(shopifyId),
      shopRepository.updateShopData(shopifyId, {
        hasUninstalled: true,
        status: false
      })
    ]);
  }
}
