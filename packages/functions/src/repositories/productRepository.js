import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getBrandList, getLuxuryStockList} from '@functions/repositories/luxuryRepository';
import {getBrandSettingShopId} from '@functions/repositories/settings/brandRepository';
import {getSyncSettingShopId} from '@functions/repositories/settings/syncRepository';
import {batchCreate} from '@functions/repositories/helper';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('products');

export async function syncProducts(shopId, luxuryInfos) {
    try {
        const syncSetting = await getSyncSettingShopId(shopId);

    }catch (e) {
        console.log(e)
    }

    return false;
}

/**
 *
 * @param shopId
 * @param luxuryInfos
 * @returns {Promise<boolean>}
 */

export async function addProducts(shopId, luxuryInfos) {
  try {
    const stockList = await getLuxuryStockList(luxuryInfos);
    const brandFilter = await getBrandSettingShopId(shopId);
    const products = stockList
      .filter(stockItem => brandFilter.brands.includes(stockItem.brand))
      .map(item => {
        let sizeQuantity = [];
        if (item.hasOwnProperty('size_quantity')) {
          sizeQuantity = item.size_quantity.filter(item => !Array.isArray(item));
        }

        return {
          shopifyId: shopId,
          syncStatus: '',
          ...item,
          size_quantity: sizeQuantity
        };
      });

    // await batchCreate(firestore, collection, products);

    return true;
  } catch (e) {
    console.log(e);
  }

  return false;
}
