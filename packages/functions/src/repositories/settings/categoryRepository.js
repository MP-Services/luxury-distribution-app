import {Firestore} from '@google-cloud/firestore';
import {getAllCollections, initShopify} from '@functions/services/shopifyService';
import {getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {getLuxuryStockList} from '@functions/repositories/luxuryRepository';
import {batchCreate} from '@functions/repositories/helper';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('categoryMappingSettings');

export async function getMappingData(id, query = {}) {
  // try {
  //   const queriedRef = collection.where('shopifyId', '==', id);
  //   return await paginateQ
  // }
}

/**
 * Get shop info by given shop ID
 *
 * @param {string} id
 * @return {Promise<FirebaseFirestore.DocumentData>}
 */
export async function getShopifyCollections(id) {
  try {
    const shop = await getShopByIdIncludeAccessToken(id);
    const shopify = initShopify(shop);
    return await getAllCollections(shopify);
  } catch (e) {
    console.log(e);
    return {data: []};
  }
}

export async function getRetailerCategory(data) {
  try {
    const stockList = await getLuxuryStockList(data);
    if (stockList.length) {
      const retailerCats = stockList.reduce((accumulator, item) => {
        const {category, sub_category, sub_sub_category} = item;
        let catId = category.id;
        let catName = category.name;

        if (sub_category) {
          catId = catId + '_' + sub_category.id;
          catName = catName + ' > ' + sub_category.name;
        }

        if (sub_sub_category) {
          catId = catId + '_' + sub_sub_category.id;
          catName = catName + ' > ' + sub_sub_category.name;
        }

        const hasDuplicate = accumulator.some(element => element.catId === catId);

        if (!hasDuplicate) {
          accumulator.push({catId, catName});
        }

        return accumulator;
      }, []);

      return retailerCats;
    }
  } catch (e) {
    console.log(e);
  }

  return [];
}

/**
 *
 * @param shopID
 * @param shopifyDomain
 * @param postData
 * @returns {Promise<void>}
 */

export async function saveCategoryMapping(shopID, shopifyDomain, postData) {
  try {
    const dataArr = postData.map(item => ({
      shopifyId: shopID,
      shopifyDomain,
      ...item
    }));
    await batchCreate(firestore, collection, dataArr);

    return {success: true};
  } catch (e) {
    console.log(e);
    return {success: false};
  }
}
