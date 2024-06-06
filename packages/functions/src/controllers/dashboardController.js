import {getCurrentShop} from '../helpers/auth';
import {getQueueCount} from '@functions/repositories/productQueueRepository';
import {getTotalProducts} from '@functions/repositories/shopifyProductRepository';

/**
 * @param ctx
 * @returns {Promise<{shop, shopInfo: *}>}
 */
export async function getDashboardInfo(ctx) {
  const shopifyId = getCurrentShop(ctx);

  const [totalProducts, createQueues, updateQueues, deleteQueues] = await Promise.all([
    getTotalProducts(shopifyId),
    getQueueCount(shopifyId, 'create'),
    getQueueCount(shopifyId, 'update'),
    getQueueCount(shopifyId, 'delete')
  ]);

  ctx.body = {
    success: true,
    totalsProductCount: totalProducts,
    createQueueProductCount: createQueues,
    updateQueueProductCount: updateQueues,
    deleteQueueProductCount: deleteQueues
  };
}
