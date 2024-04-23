import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  getGeneralSettingShopId,
  saveGeneralSetting
} from '@functions/repositories/settings/generalRepository';

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
