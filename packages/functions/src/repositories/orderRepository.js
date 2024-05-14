import {FieldValue, Firestore} from '@google-cloud/firestore';
import {getProductByShopifyProductId} from '@functions/repositories/productRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('orders');

/**
 *
 * @param shopifyId
 * @param data
 * @returns {Promise<void>}
 */
export async function addOrder(shopifyId, data) {
  try {
    await collection.add({
      ...data,
      shopifyId,
      syncStatus: 'new',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return {success: true};
  } catch (e) {
    console.log(e);
    return {success: false};
  }
}

/**
 *
 * @param shopifyId
 * @returns {Promise<unknown[]|boolean>}
 */
export async function syncOrder(shopifyId) {
  try {
    const orders = await getOrderToSyncQuery(shopifyId);
    if (orders) {
      return orders.map(async order => {
        const shopifyOrderData = await convertShopifyOrderDataToSync(shopifyId, order);
        if (shopifyOrderData.order.products.length) {
          //   Sync product to luxury system
          console.log('syncOrder');
        }
      });
    }
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param shopifyId
 * @param shopifyOrderData
 * @returns {Promise<{order: {address: {firstname: (*|string), city: (*|string), street: (*|string)[], postcode: (*|string), telephone: (*|string), country_id: (*|string), email: (*|string), region_code: (*|string), lastname: (*|string)}, products: *[]}}>}
 */
async function convertShopifyOrderDataToSync(shopifyId, shopifyOrderData) {
  const address = {
    region_code: shopifyOrderData?.shipping_address?.provine_code ?? '',
    country_id: shopifyOrderData?.shipping_address?.country_code ?? '',
    street: [
      shopifyOrderData?.shipping_address?.address1 ?? '',
      shopifyOrderData?.shipping_address?.address2 ?? ''
    ],
    postcode: shopifyOrderData?.shipping_address?.zip ?? '',
    city: shopifyOrderData?.shipping_address?.city ?? '',
    firstname: shopifyOrderData?.shipping_address?.first_name ?? '',
    lastname: shopifyOrderData?.shipping_address?.last_name ?? '',
    email: shopifyOrderData?.email ?? '',
    telephone: shopifyOrderData?.shipping_address?.phone ?? ''
  };

  let products = [];
  for (const item of shopifyOrderData.line_items) {
    const luxuryProduct = await getProductByShopifyProductId(shopifyId, item.product_id);
    const productOption = luxuryProduct?.productOptionsAfterMap
      ? luxuryProduct.productOptionsAfterMap.find(
          option => option.productVariantId === `gid://shopify/ProductVariant/${item.variant_id}`
        )
      : null;
    if (luxuryProduct && productOption) {
      products = [
        ...products,
        ...[{stock_id: luxuryProduct.stockId, qty: item.quantity, size: productOption.originalSize}]
      ];
    }
  }
  return {order: {address, products}};
}

/**
 *
 * @param shopifyId
 * @param limit
 * @returns {Promise<Array<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>>|null>}
 */
async function getOrderToSyncQuery(shopifyId, limit = 3) {
  const docs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('syncStatus', '!=', 'success')
    .limit(limit)
    .get();

  if (docs.empty) {
    return null;
  }

  return docs.docs.map(doc => ({...doc.data()}));
}
