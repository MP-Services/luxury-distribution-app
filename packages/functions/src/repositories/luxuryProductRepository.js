import {FieldValue, Firestore} from '@google-cloud/firestore';
import {batchCreate, batchDelete} from '@functions/repositories/helper';
import {chunk} from '@avada/utils';

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
    const duplicateStocks = await getDuplicateStockIds(shopifyId, stockIds);
    if (!duplicateStocks.length) {
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
    const shopifyIdsChunks = chunk(shopifyIds, 30);
    const docsArr = await shopifyIdsChunks.map(shopifyIdsChunk => {
      return collection
        .where('shopifyId', 'in', shopifyIdsChunk)
        .where('stockId', '==', stockId)
        .get();
    });
    let docsDelete = [];
    for (const docs of docsArr) {
      if (!docs.empty) {
        docsDelete = [...docsDelete, ...docs.docs];
      }
    }
    if (docsDelete.length) {
      return batchDelete(firestore, docsDelete);
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
      const duplicateStocks = await getDuplicateStockIds(shopifyId, stocksTempDelete);
      if (stocksTempDelete.length) {
        return batchDelete(firestore, duplicateStocks);
      }
    }
    return true;
  } catch (e) {
    console.error(e);
  }

  return false;
}

/**
 *
 * @param shopifyId
 * @param stockIds
 * @returns {Promise<*[]>}
 */
export async function getDuplicateStockIds(shopifyId, stockIds) {
  const stockIdsChunks = chunk(stockIds, 30);
  const duplicateStocksDocsArr = await Promise.all(
    stockIdsChunks.map(stockIdsChunk => {
      return collection
        .where('shopifyId', '==', shopifyId)
        .where('stockId', 'in', stockIdsChunk)
        .get();
    })
  );
  let duplicateStocks = [];
  for (const duplicateStocksDocs of duplicateStocksDocsArr) {
    if (!duplicateStocksDocs.empty) {
      duplicateStocks = [...duplicateStocks, ...duplicateStocksDocs.docs];
    }
  }
  return duplicateStocks;
}

/**
 *
 * @param shopifyId
 * @returns {Promise<null|*>}
 */
export async function getLuxuryProducts(shopifyId) {
  const docs = await collection.where('shopifyId', '==', shopifyId).get();
  if (docs.empty) {
    return null;
  }

  return docs.docs.map(doc => ({uid: doc.id, ...doc.data()}));
}

/**
 *
 * @param shopifyId
 * @param stockId
 * @returns {Promise<null|void>}
 */
export async function deleteLuxuryProductByShopifyId(shopifyId, stockId) {
  const docs = await collection
    .where('shopifyId', '==', shopifyId)
    .where('stockId', '==', stockId)
    .get();
  if (docs.empty) {
    return null;
  }

  return docs.docs[0].ref.delete();
}

/**
 *
 * @param shopifyId
 * @param brands
 * @returns {Promise<*[]>}
 */
export async function getLuxuryProductByBrands(shopifyId, brands) {
  const chunksArr = chunk(brands, 30);
  const shopifyProductQueries = [];

  for (const chunkArr of chunksArr) {
    shopifyProductQueries.push(
      collection
        .where('shopifyId', '==', shopifyId)
        .where('brand', 'in', chunkArr)
        .get()
    );
  }
  const shopifyProductQueriesResult = await Promise.all(shopifyProductQueries);
  const shopifyProductQueriesDocsData = [];
  for (const shopifyProductQueryResult of shopifyProductQueriesResult) {
    if (!shopifyProductQueryResult.empty) {
      shopifyProductQueriesDocsData.push(shopifyProductQueryResult.docs.map(doc => doc.data()));
    }
  }
  return shopifyProductQueriesDocsData;
}
