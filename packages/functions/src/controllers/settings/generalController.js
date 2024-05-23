import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  getGeneralSettingShopId,
  saveGeneralSetting
} from '@functions/repositories/settings/generalRepository';
import {
  addCurrencies,
  getCurrencies as getCurrenciesData
} from '@functions/repositories/currencyRepository';

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
