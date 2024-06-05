import {FieldValue, Firestore} from '@google-cloud/firestore';
import {getProductByShopifyProductId} from '@functions/repositories/productRepository';
import {createOrder, getLuxuryShopInfoByShopifyId} from '@functions/repositories/luxuryRepository';
import {batchDelete, paginateQuery, getOrderBy} from '@functions/repositories/helper';
import {addLog} from '@functions/repositories/logRepository';

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
      const {id: shopifyOrderId, ...restData} = data;
      await collection.add({
        ...restData,
        shopifyOrderId,
        orderDataConverted,
        shopifyId,
        syncStatus: 'new',
        retailerOrderId: '',
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
  let orderUUID = '';
  try {
    const {shopifyId} = shop;
    const luxuryInfo = await getLuxuryShopInfoByShopifyId(shopifyId);
    if (luxuryInfo?.deleteApp) {
      return true;
    }
    const order = await getOrderToSyncQuery(shopifyId);
    if (order) {
      orderUUID = order.uuid;
      const luxuryOrder = await createOrder(shop, order.orderDataConverted);
      if (luxuryOrder) {
        return updateOrder(order.uuid, {
          luxuryOrderId: luxuryOrder?.order_id,
          luxuryReferenceNumber: luxuryOrder?.reference_number,
          luxuryCreatedAt: luxuryOrder?.create_at
        });
      }
    }
  } catch (e) {
    console.log(e);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(e)});
  }

  if (orderUUID) {
    return updateOrder(orderUUID, {
      updatedAt: FieldValue.serverTimestamp(),
      syncStatus: 'failed'
    });
  }

  return false;
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
    if (productOption) {
      products = [
        ...products,
        ...[
          {stock_id: luxuryProduct.stockId, qty: item.quantity, size: productOption.originalOption}
        ]
      ];
    }
  }
  return {order: {address, products}};
}

/**
 *
 * @param shopifyId
 * @returns {Promise<Array<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>>|null>}
 */
async function getOrderToSyncQuery(shopifyId) {
  const docs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('syncStatus', '!=', 'success')
    .orderBy('updatedAt')
    .limit(1)
    .get();

  if (docs.empty) {
    return null;
  }

  const doc = docs.docs[0];

  return {uuid: doc.id, ...doc.data()};
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

/**
 *
 * @param shopId
 * @param query
 * @returns {Promise<{data: *[], count: number, pageInfo: {hasNext: boolean, hasPre: boolean}, error}|{data: *[], count: number, pageInfo: {hasNext: boolean, hasPre: boolean}}>}
 */
export async function getOrders(shopId, query = {}) {
  try {
    let queriedRef = collection.where('shopifyId', '==', shopId);
    const {order} = query;
    const {sortField, direction} = getOrderBy(order);
    queriedRef = queriedRef.orderBy(sortField, direction);
    return await paginateQuery({queriedRef, collection, query, sortField, direction, shopId});
  } catch (e) {
    console.log(e);
    return {data: [], count: 0, pageInfo: {hasNext: false, hasPre: false}, error: e.message};
  }
}
