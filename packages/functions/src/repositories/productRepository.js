import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getBrandList, getLuxuryStockList} from '@functions/repositories/luxuryRepository';
import {getBrandSettingShopId} from '@functions/repositories/settings/brandRepository';
import {getSyncSettingShopId} from '@functions/repositories/settings/syncRepository';
import {batchCreate} from '@functions/repositories/helper';
import {runProductMutation} from '@functions/services/shopify/graphqlService';
import {getShopById, getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('products');

export async function syncProducts(shopId, luxuryInfos) {
  try {
    const syncSetting = await getSyncSettingShopId(shopId);
    await getProducts(shopId, luxuryInfos);
  } catch (e) {
    console.log(e);
  }

  return false;
}

/**
 *
 * @param shopId
 * @param luxuryInfos
 * @returns {Promise<*[]>}
 */
export async function getProducts(shopId, luxuryInfos) {
  try {
    const productsRef = await collection
      .where('shopifyId', '==', shopId)
      .limit(1)
      .get();
    if (productsRef.empty) {
      return [];
    }
    const shop = await getShopByIdIncludeAccessToken(shopId);
    const products = productsRef.docs.map(doc => {
      const productData = doc.data();
      const productOptionsData = [
        {
          name: 'Size',
          values: productData.size_quantity.map(item => ({name: Object.keys(item)[0]}))
        }
      ];
      const productMediaData = productData.images.map(item => ({
        mediaContentType: 'IMAGE',
        originalSource: item
      }));

      return {
        product: {
          title: productData.name,
          descriptionHtml: productData.desscription,
          giftCard: false,
          giftCardTemplateSuffix: '',
          handle: '',
          metafields: [
            {
              key: 'testproductcustom',
              namespace: 'custom',
              type: 'single_line_text_field',
              value: 'test product custom metafields'
            }
          ],
          productOptions: productOptionsData,
          status: 'ACTIVE'
        }
        // media: productMediaData
      };
    });
    const productsSync = await Promise.all(
      products.map(product => runProductMutation({shop, variables: product}))
    );
    // const productCreateVariables = {
    //   product: {
    //     title: 'Sweet new form altair3',
    //     descriptionHtml: 'this is description',
    //     giftCard: false,
    //     giftCardTemplateSuffix: '',
    //     handle: '',
    //     metafields: [
    //       {
    //         key: 'testproductcustom',
    //         namespace: 'custom',
    //         type: 'single_line_text_field',
    //         value: 'test product custom metafields'
    //       }
    //     ],
    //     productOptions: productOptionsData,
    //     status: 'ACTIVE'
    //   },
    //   media: productMediaData
    // };
  } catch (e) {
    console.log(e);
  }

  return [];
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
          size_quantity: sizeQuantity,
          size_quantity_delta: sizeQuantity
        };
      });

    await batchCreate(firestore, collection, products);

    return true;
  } catch (e) {
    console.log(e);
  }

  return false;
}
