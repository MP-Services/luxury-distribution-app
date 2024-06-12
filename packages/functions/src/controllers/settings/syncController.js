import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  getSyncSettingShopId,
  saveSyncSetting
} from '@functions/repositories/settings/syncRepository';

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
    const syncSetting = await getSyncSettingShopId(shopId);

    return (ctx.body = {
      data: syncSetting,
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
