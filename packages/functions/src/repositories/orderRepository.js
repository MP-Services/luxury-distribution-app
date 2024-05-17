import {FieldValue, Firestore} from '@google-cloud/firestore';
import {getProductByShopifyProductId} from '@functions/repositories/productRepository';
import {createOrder} from '@functions/repositories/luxuryRepository';
import {batchDelete} from '@functions/repositories/helper';

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
    const orderDataConverted = await convertShopifyOrderDataToSync(shopifyId, data);
    if (orderDataConverted.order.products.length) {
      await collection.add({
        ...data,
        orderDataConverted,
        shopifyId,
        syncStatus: 'new',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      return {success: true};
    }
  } catch (e) {
    console.log(e);
  }
  return {success: false};
}

/**
 *
 * @param shop
 * @returns {Promise<unknown[]|boolean>}
 */
export async function syncOrder(shop) {
  try {
    const {shopifyId} = shop;
    const orders = await getOrderToSyncQuery(shopifyId);
    if (orders) {
      return orders.map(async order => {
        const luxuryOrder = await createOrder(shop, order.orderDataConverted);
        if (luxuryOrder) {
          return updateOrder(order.uuid, {
            luxuryOrderId: luxuryOrder?.id,
            luxuryReferenceNumber: luxuryOrder?.reference_number,
            luxuryCreatedAt: luxuryOrder?.create_at
          });
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
 * @param id
 * @param data
 * @returns {Promise<void>}
 */
async function updateOrder(id, data) {
  await collection
    .doc(id)
    .update({...data, syncStatus: 'success', updateAt: FieldValue.serverTimestamp()});
}

/**
 *
 * @param shopifyId
 * @param shopifyOrderData
 * @returns {Promise<{order: {address: {firstname: (*|string), city: (*|string), street: (*|string)[], postcode: (*|string), telephone: (*|string), country_id: (*|string), email: (*|string), region_code: (*|string), lastname: (*|string)}, products: *[]}}>}
 */
async function convertShopifyOrderDataToSync(shopifyId, shopifyOrderData) {
  const address = {
    region_code: shopifyOrderData?.shipping_address?.provine_code ?? 'NAN',
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
    telephone: shopifyOrderData?.shipping_address?.phone ?? 'NAN'
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
        ...[
          {stock_id: luxuryProduct.stockId, qty: item.quantity, size: productOption.originalValue}
        ]
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

  return docs.docs.map(doc => ({uuid: doc.id, ...doc.data()}));
}

/**
 *
 * @param shopId
 * @returns {Promise<FirebaseFirestore.WriteResult|null>}
 */
export async function deleteOrdersByShopId(shopId) {
  const docs = await collection.where('shopifyId', '==', shopId).get();
  if (docs.empty) {
    return null;
  }

  return batchDelete(firestore, docs.docs);
}
