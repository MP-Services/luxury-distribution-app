// import * as shopRepository from '../repositories/shopRepository';
// import * as avadaioService from '../services/avadaioService';
// import {SNIPPET_JOY_VALUE} from '../config/assets';
// import {getMainThemeId, initShopify} from './shopifyService';
//
// /**
//  * Remove some information about shop after uninstalling app
//  *
//  * @param {object} ctx
//  * @return {Promise<void>}
//  */
// export async function uninstallApp(ctx) {
//   const domain = ctx.get('X-Shopify-Shop-Domain');
//   const shop = await shopRepository.getShopByField(domain);
//   const shopify = initShopify(shop);
//   if (shop !== null && shop.accessToken !== null) {
//     await Promise.all([
//       shopRepository.updateShopData(shop.id, {
//         hasUninstalled: true,
//         status: false
//       }),
//       removeAssets(shopify, shop.id, false)
//     ]);
//
//     if (!shop.hasUninstalled) {
//       await avadaioService.uninstallApp({
//         recipient: shop.email,
//         plan: shop.plan,
//         customer: {
//           tags: 'joy'
//         }
//       });
//     }
//   }
// }
//
// /**
//  *
//  * @param shopify
//  * @param shopId
//  * @param isUpdateShop
//  * @returns {Promise<{success: boolean, error}|{success: boolean, error: string}|{success: boolean}>}
//  */
// export async function removeAssets(shopify, shopId, isUpdateShop = false) {
//   try {
//     const themeId = await getMainThemeId(shopify);
//     if (!themeId) {
//       return {success: false, error: 'No theme found'};
//     }
//     const theme = await shopify.asset.get(themeId, {'asset[key]': 'layout/theme.liquid'});
//
//     const handlers = [];
//
//     // restore theme.liquid by removing avada-seo snippet
//     if (theme.value.includes(SNIPPET_JOY_VALUE)) {
//       const value = theme.value.replace(SNIPPET_JOY_VALUE, '');
//       handlers.push(shopify.asset.update(themeId, {key: 'layout/theme.liquid', value}));
//     }
//
//     if (isUpdateShop) {
//       // handlers.push(updateShopData(shopId, {isUseBlockOsForData: true}));
//     }
//
//     await Promise.all(handlers);
//
//     return {success: true};
//   } catch (e) {
//     return {success: false, error: e.message};
//   }
// }
