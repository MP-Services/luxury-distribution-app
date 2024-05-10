import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  getBrandSettingShopId,
  getLXBrandList,
  saveBrandFilterSetting
} from '@functions/repositories/settings/brandRepository';
import {
  getLuxuryShopInfoByShopifyId,
  getLuxuryToken
} from '@functions/repositories/luxuryRepository';

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function save(ctx) {
  const data = ctx.req.body;
  const {shopID, shopifyDomain} = getCurrentUser(ctx);
  ctx.body = await saveBrandFilterSetting(shopID, shopifyDomain, data);
}

export async function get(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const brandSetting = await getBrandSettingShopId(shopId);

    ctx.body = {success: true, data: brandSetting ? brandSetting.brands : []};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}

/**
 *
 * @param ctx
 * @returns {Promise<{success: boolean}|{data: (*|boolean), success: boolean}>}
 */

export async function getLXBrand(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);
    if (luxuryShopInfo) {
      const lxBrandList = await getLXBrandList(luxuryShopInfo);
      if (lxBrandList) {
        return (ctx.body = {success: true, data: lxBrandList});
      }
    }
  } catch (e) {
    console.log(e);
  }
  return (ctx.body = {success: false});
}
