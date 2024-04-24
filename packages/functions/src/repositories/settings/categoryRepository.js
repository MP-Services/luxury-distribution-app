import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getAllCollections, initShopify} from '@functions/services/shopifyService';
import {getShopById, getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {getLuxuryStockList} from '@functions/repositories/luxuryRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const generalSettingsRef = firestore.collection('categoryMappingSettings');

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
      const retailerCats = stockList.reduce((accumulator, key) => {
        const {category, sub_category, sub_sub_category} = item;
        let catId = '';
        let cat_name = '';

        if (category) {
          catId += category.id;
          cat_name += category.name;
        }

        if (sub_category) {
          catId = catId + '_' + sub_category.id;
          cat_name = cat_name + '_' + sub_category.name;
        }

        if (sub_sub_category) {
          catId = catId + '_' + sub_sub_category.id;
          cat_name = catId + '_' + sub_sub_category.name;
        }

        accumulator.push({catId, cat_name});
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
 * Get shop info by given shop ID
 *
 * @param {string} shopId
 * @param data
 * @return {Promise<{success: boolean, error?: string}>}
 */
export async function saveGeneralSetting(shopId, shopifyDomain, data) {
  try {
    const docs = await generalSettingsRef
      .where('shopifyId', '==', shopId)
      .limit(1)
      .get();
    if (docs.empty) {
      await generalSettingsRef.add({
        shopifyId: shopId,
        shopifyDomain,
        ...data
      });
    } else {
      await docs.docs[0].ref.update({...data});
    }

    return {success: true};
  } catch (error) {
    console.log(error);
    return {success: false, error: error.message};
  }
}
