import {Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getBrandList, getLuxuryStockList} from '@functions/repositories/luxuryRepository';
import {getBrandSettingShopId} from '@functions/repositories/settings/brandRepository';
import {getSyncSettingShopId} from '@functions/repositories/settings/syncRepository';
import {batchCreate, batchUpdate} from '@functions/repositories/helper';
import {
  getLocationQuery,
  runProductAdjustQuantitiesMutation,
  runProductMutation,
  runProductVariantsBulkMutation
} from '@functions/services/shopify/graphqlService';
import {getShopById, getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('products');

// export async function syncProducts(shopId, luxuryInfos) {
//   try {
//     const syncSetting = await getSyncSettingShopId(shopId);
//     await syncProducts(shopId, luxuryInfos);
//   } catch (e) {
//     console.log(e);
//   }
//
//   return false;
// }

/**
 *
 * @param shopId
 * @param luxuryInfos
 * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>|boolean>}
 */
export async function getProductsRef(shopId, luxuryInfos) {
  try {
    return await collection
      .where('shopifyId', '==', shopId)
      .limit(3)
      .get();
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
export async function syncProducts(shopId, luxuryInfos) {
  try {
    const syncSetting = await getSyncSettingShopId(shopId);
    const productsRef = await getProductsRef(shopId, luxuryInfos);
    const shop = await getShopByIdIncludeAccessToken(shopId);
    const defaultLocationId = await getLocationQuery({shop, variables: {}});

    if (productsRef.empty || !defaultLocationId) {
      return [];
    }

    let stockIds = [];
    const syncProductsResult = await Promise.all(
      productsRef.docs.map(async doc => {
        const productData = doc.data();
        stockIds = [...stockIds, productData.id];
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

        const productVariables = {
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

        const productShopify = await runProductMutation({shop, variables: productVariables});
        if (productShopify) {
          const optionId = productShopify.options[0].id;
          const productVariants = productShopify.options[0].optionValues.map(
            (optionValue, index) => ({
              sku: `${productData.sku}-${index + 1}`,
              price: productData.selling_price,
              compareAtPrice: productData.original_price,
              optionValues: [
                {
                  optionId: optionId,
                  id: optionValue.id
                }
              ]
            })
          );
          const productVariantsVariables = {
            productId: productShopify.id,
            variants: productVariants
          };

          const {productVariants: productVariantsReturn} = await runProductVariantsBulkMutation({
            shop,
            variables: productVariantsVariables
          });
          if (productVariantsReturn) {
            const sizeQuantityDelta = productData.size_quantity_delta;
            const changesData = productVariantsReturn.map((item, index) => {
              return {
                inventoryItemId: item.inventoryItem.id,
                delta: Number(Object.values(sizeQuantityDelta[index])[0]),
                locationId: defaultLocationId
              };
            });
            const inventoryAdjustmentGroup = await runProductAdjustQuantitiesMutation({
              shop,
              variables: {
                locationId: defaultLocationId,
                input: {
                  changes: changesData,
                  reason: 'correction',
                  name: 'available'
                }
              }
            });

            return {
              id: productData.id,
              productShopifyId: productShopify.id,
              syncStatus: 'updated'
            };
          }
        }

        return {
          id: productData.id,
          productShopifyId: '',
          syncStatus: 'created'
        };
      })
    );

    if (syncProductsResult.length) {
        console.log('syncProductResult');
      const docs = await collection
        .where('shopifyId', '==', shopId)
        .where('id', 'in', stockIds)
        .get();
      await batchUpdate(firestore, docs, syncProductsResult, 'id');
    }
  } catch (e) {
    console.log(e);
  }

  return false;
}

export async function updateProduct(shopId, infoData, updateData) {
  try {
  } catch (e) {}
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
