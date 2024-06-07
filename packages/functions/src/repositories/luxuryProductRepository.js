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
    const products = stocks.map(stock => {
      let sizes = [];
      if (stock.hasOwnProperty('size_quantity')) {
        const sizeQuantity = stock.size_quantity.filter(item => !Array.isArray(item));
        sizes = sizeQuantity.map(size => Object.keys(size)[0]);
      }
      return {
        stockId: stock.id,
        brand: stock.brand,
        sizes,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
    });
    await batchCreate(firestore, collection, products);
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
export async function addLuxuryProduct(shopifyId, stock) {
  try {
    const {stockId, brand} = data;
    const docs = await collection
      .where('shopifyId', '==', shopifyId)
      .where('stockId', '==', stockId)
      .get();
    if (docs.empty) {
      return collection.add({
        shopifyId,
        brand,
        stockId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      return docs.docs[0].ref.update({brand, updatedAt: FieldValue.serverTimestamp()});
    }
  } catch (e) {
    console.error(e);
  }
}
