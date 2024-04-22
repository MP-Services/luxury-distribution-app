import {getShopById} from '@functions/repositories/shopRepository';
import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  getBrandSettingShopId,
  getLXBrandList,
  saveBrandSetting
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
  ctx.body = await saveSyncSetting(shopID, shopifyDomain, data);
}

export async function get(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const brandSetting = await getBrandSettingShopId(shopId);

    return (ctx.body = {
      data: brandSetting,
      success: true
    });
  } catch (e) {
    ctx.status = 404;
    return (ctx.body = {
      data: {},
      success: false
    });
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
    const token = await getLuxuryToken(luxuryShopInfo);
    if (token) {
      const lxBrandList = await getLXBrandList(token);
      if (lxBrandList) {
        return (ctx.body = {success: true, data: lxBrandList});
      }
    }
  } catch (e) {
    console.log(e);
  }
  return (ctx.body = {success: false});
}
