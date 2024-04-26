import {getCurrentShop, getCurrentUser} from '@functions/helpers/auth';
import {
  getShopifyCollections,
  saveCategoryMapping,
  getRetailerCategory,
  getMappingData,
  editCategoryMapping,
  removeCategoryMapping,
  deleteCategoryById
} from '@functions/repositories/settings/categoryRepository';
import {getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function save(ctx) {
  const {newMappingRows, editMappingRows} = ctx.req.body.data;
  const {shopID, shopifyDomain} = getCurrentUser(ctx);
  const [saveResult, editResult] = await Promise.all([
    saveCategoryMapping(shopID, shopifyDomain, newMappingRows),
    editCategoryMapping(shopID, shopifyDomain, editMappingRows)
  ]);

  ctx.body = {success: saveResult && editResult};
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function deleteOne(ctx) {
  const success = await deleteCategoryById(ctx.params.id);

  ctx.body = {success};
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function getDropShipperCategory(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const shopifyCollections = await getShopifyCollections(shopId);
    ctx.body = {success: true, data: shopifyCollections.data};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function getRetailerCat(ctx) {
  try {
    const shopId = getCurrentShop(ctx);
    const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);
    const data = await getRetailerCategory(luxuryShopInfo);
    ctx.body = {success: true, data};
  } catch (e) {
    ctx.body = {success: false, error: e.string};
  }
}

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function getList(ctx) {
  const shopId = getCurrentShop(ctx);
  ctx.body = await getMappingData(shopId, ctx.query);
}
