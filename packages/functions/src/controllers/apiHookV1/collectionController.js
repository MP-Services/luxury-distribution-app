import {deleteCategoryMappingsByCollectionId} from '@functions/repositories/settings/categoryRepository';

/**
 *
 * @param ctx
 * @returns {Promise<void>}
 */
export async function handleCollection(ctx) {
  const {apiData, shop} = ctx.state;
  const {id: shopId} = shop;
  const collection = JSON.parse(apiData.requestBody);
  ctx.body = await deleteCategoryMappingsByCollectionId(shopId, collection.id);
}
