import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  deleteGeneralSettingByShopId,
  getGeneralSettingShopId,
  saveGeneralSetting
} from '@functions/repositories/settings/generalRepository';
import {
  addCurrencies,
  getCurrencies as getCurrenciesData
} from '@functions/repositories/currencyRepository';
import {getShopById} from '@functions/repositories/shopRepository';
import {deleteLuxuryShop, deleteMetafields} from '@functions/repositories/luxuryRepository';
import {deleteProductsWhenUninstallByShopId} from '@functions/repositories/productRepository';
import {deleteOrdersByShopId} from '@functions/repositories/orderRepository';
import {deleteAttributeMapping} from '@functions/repositories/settings/attributeMappingRepository';
import {deleteBrandFilterByShopId} from '@functions/repositories/settings/brandRepository';
import {deleteCategoryMappingsByShopId} from '@functions/repositories/settings/categoryRepository';
import {deleteSyncSettingByShopId} from '@functions/repositories/settings/syncRepository';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function save(ctx) {
  const data = ctx.req.body;
  const {shopID, shopifyDomain} = getCurrentUser(ctx);
  ctx.body = await saveGeneralSetting(shopID, shopifyDomain, data);
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function get(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const generalSetting = await getGeneralSettingShopId(shopId);

    ctx.body = {success: true, data: generalSetting};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function getCurrencies(ctx) {
  try {
    const currencies = await getCurrenciesData();
    if (currencies) {
      return (ctx.body = {success: true, data: currencies?.data});
    } else {
      await addCurrencies();
      const newCurrenciesData = await getCurrenciesData();
      return (ctx.body = {
        success: true,
        data: newCurrenciesData?.data ? newCurrenciesData.data : []
      });
    }
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function clear(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const shop = await getShopById(shopId);
    await deleteProductsWhenUninstallByShopId(shopId, shop);
    await Promise.all([
      deleteLuxuryShop(shopId),
      deleteMetafields(shopId, shop),
      deleteOrdersByShopId(shopId),
      deleteAttributeMapping(shopId),
      deleteBrandFilterByShopId(shopId),
      deleteCategoryMappingsByShopId(shopId),
      deleteGeneralSettingByShopId(shopId),
      deleteSyncSettingByShopId(shopId)
    ]);
    ctx.body = {success: true};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}
