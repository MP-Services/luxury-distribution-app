import {Firestore} from '@google-cloud/firestore';
import {getBrandList, getLuxuryStockList} from '@functions/repositories/luxuryRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('attributeMappingSettings');

/**
 *
 * @param luxuryInfo
 * @returns {Promise<{success: boolean}|{sizeOptions: *[], success: boolean}>}
 */
export async function getSizeOptions(luxuryInfo) {
  try {
    const stockList = await getLuxuryStockList(luxuryInfo);
    let sizeOptions = [];
    for (const stock of stockList) {
      const sizes = stock.size_quantity.map(item => Object.keys(item)[0]);
      sizeOptions = [...sizeOptions, ...sizes.filter(item => !sizeOptions.includes(item))];
    }

    return {success: true, data: sizeOptions};
  } catch (e) {
    console.log(e);
    return {success: false};
  }
}
