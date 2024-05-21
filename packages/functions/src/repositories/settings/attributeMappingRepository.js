import {FieldValue, Firestore} from '@google-cloud/firestore';
import {getLuxuryStockList} from '@functions/repositories/luxuryRepository';
import publishTopic from "@functions/helpers/pubsub/publishTopic";

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('attributeMappingSettings');

/**
 *
 * @param shopId
 * @returns {Promise<{success: boolean}|{data: null, success: boolean}|{data: (*&{id: *})[], success: boolean}>}
 */
export async function getAttributeMappingData(shopId) {
  try {
    const docs = await collection.where('shopifyId', '==', shopId).get();
    if (docs.empty) {
      return false;
    }

    return docs.docs.map(doc => ({id: doc.id, ...doc.data()}));
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param shopId
 * @param data
 * @returns {Promise<boolean>}
 */
export async function saveAttributeMapping(shopId, data) {
  try {
    const saveData = data[0];
    const docs = await collection
      .where('shopifyId', '==', shopId)
      .limit(1)
      .get();
    if (docs.empty) {
      await collection.add({
        ...saveData,
        shopifyId: shopId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      await docs.docs[0].ref.update({...saveData, updatedAt: FieldValue.serverTimestamp()});
    }
    await publishTopic('attributeMappingSaveHandling', {shopId, saveData});
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param luxuryInfo
 * @returns {Promise<{success: boolean}|{sizeOptions: *[], success: boolean}>}
 */
export async function getSizeOptions(luxuryInfo) {
  try {
    const stockList = await getLuxuryStockList(luxuryInfo);
    if (stockList) {
      let sizeOptions = [];
      for (const stock of stockList) {
        const sizes = stock.size_quantity.map(item => Object.keys(item)[0]);
        sizeOptions = [...sizeOptions, ...sizes.filter(item => !sizeOptions.includes(item))];
      }
      return {success: true, data: sizeOptions};
    }
  } catch (e) {
    console.log(e);
  }
  return {success: false};
}

/**
 *
 * @param shopId
 * @returns {Promise<*|null>}
 */
export async function deleteAttributeMapping(shopId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  return docs.docs[0].ref.delete();
}
