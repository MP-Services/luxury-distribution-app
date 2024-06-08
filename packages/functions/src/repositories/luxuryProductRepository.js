import {FieldValue, Firestore} from '@google-cloud/firestore';
import {batchCreate, batchDelete} from '@functions/repositories/helper';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('luxuryProducts');

/**
 *
 * @param shopifyId
 * @param stocks
 * @returns {Promise<void>}
 */
export async function addLuxuryProducts(shopifyId, stocks) {
  try {
    const stockIds = [];
    const products = stocks.map(stock => {
      const {id: stockId, brand, product_category_id} = stock;
      let sizes = [];
      if (stock.hasOwnProperty('size_quantity')) {
        const sizeQuantity = stock.size_quantity.filter(item => !Array.isArray(item));
        sizes = sizeQuantity.map(size => Object.keys(size)[0]);
      }
      stockIds.push(stockId);
      return {
        stockId: stockId,
        brand,
        shopifyId,
        product_category_id,
        sizes,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
    });
    const duplicateStocks = await collection
      .where('shopifyId', '==', shopifyId)
      .where('stockId', 'in', stockIds);
    if (duplicateStocks.empty) {
      return batchCreate(firestore, collection, products);
    }
    return Promise.all([
      batchDelete(firestore, duplicateStocks),
      batchCreate(firestore, collection, products)
    ]);
  } catch (e) {
    console.log(e);
  }
}

export async function deleteLuxuryProducts(shopifyId) {}

/**
 *
 * @param shopifyId
 * @param stock
 * @returns {Promise<FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>|FirebaseFirestore.WriteResult>}
 */
export async function saveLuxuryProduct(shopifyId, stock) {
  try {
    const {id: stockId, brand, product_category_id} = stock;
    let sizes = [];
    if (stock.hasOwnProperty('size_quantity')) {
      const sizeQuantity = stock.size_quantity.filter(item => !Array.isArray(item));
      sizes = sizeQuantity.map(size => Object.keys(size)[0]);
    }
    const docs = await collection
      .where('shopifyId', '==', shopifyId)
      .where('stockId', '==', stockId)
      .get();
    if (docs.empty) {
      return collection.add({
        shopifyId,
        brand,
        stockId,
        sizes,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      return docs.docs[0].ref.update({
        product_category_id,
        brand,
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @param shops
 * @param stockId
 * @returns {Promise<boolean|void>}
 */
export async function deleteLuxuryProductShops(shops, stockId) {
  try {
    const shopifyIds = shops.map(shop => shop.shopifyId);
    const docs = await collection
      .where('shopifyId', 'in', shopifyIds)
      .where('stockId', '==', stockId);
    if (!docs.empty) {
      return batchDelete(firestore, docs.docs);
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}

/**
 *
 * @param shopifyId
 * @param stocksTemp
 * @returns {Promise<boolean|void>}
 */
export async function convertLuxuryProductFromTemp(shopifyId, stocksTemp) {
  try {
    const stocksTempDelete = stocksTemp.filter(item => item.event === 'ProductDelete');
    if (stocksTempDelete.length) {
      const docs = await collection
        .where('shopifyId', '==', shopifyId)
        .where('stockId', 'in', stocksTempDelete);
      if (!docs.empty) {
        return batchDelete(firestore, docs.docs);
      }
    }
    return true;
  } catch (e) {
    console.error(e);
  }

  return false;
}
