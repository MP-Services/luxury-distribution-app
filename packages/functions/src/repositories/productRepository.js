import {FieldValue, Firestore} from '@google-cloud/firestore';
import {presentDataAndFormatDate} from '@avada/firestore-utils';
import {getBrandList, getLuxuryStockList} from '@functions/repositories/luxuryRepository';
import {getBrandSettingShopId} from '@functions/repositories/settings/brandRepository';
import {getSyncSettingShopId} from '@functions/repositories/settings/syncRepository';
import {batchCreate, batchUpdate} from '@functions/repositories/helper';
import {
  getLocationQuery,
  runMetafieldDefinitionMutation,
  runProductAdjustQuantitiesMutation,
  runProductMutation,
  runProductVariantsBulkMutation
} from '@functions/services/shopify/graphqlService';
import {getShopById, getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {
  getMappingData,
  getMappingDataWithoutPaginate
} from '@functions/repositories/settings/categoryRepository';
import productMetafields from '@functions/const/productMetafields';
import {prepareDoc} from './helper';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('products');

/**
 *
 * @param shopId
 * @param limit
 * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>|boolean>}
 */
export async function getProducts(shopId) {
  try {
    const {docs} = await collection.where('shopifyId', '==', shopId).get();
    return docs.map(doc => prepareDoc({doc}));
  } catch (e) {
    console.error(e);
    return [];
  }
}

/**
 *
 * @param shopId
 * @param limit
 * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>|boolean>}
 */
export async function getProductsQuery(shopId, limit = 0, syncStatus = '') {
  try {
    if (syncStatus) {
      return await collection
        .where('shopifyId', '==', shopId)
        .where('syncStatus', '!=', syncStatus)
        .orderBy('updatedAt')
        .limit(limit)
        .get();
    }

    return await collection
      .where('shopifyId', '==', shopId)
      .limit(limit)
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
    const categoryMappings = await getMappingDataWithoutPaginate(shopId);
    const productsRef = await getProductsQuery(shopId, 1, 'success');
    const shop = await getShopByIdIncludeAccessToken(shopId);
    const defaultLocationId = await getLocationQuery({shop, variables: {}});

    if (productsRef.empty || !defaultLocationId) {
      return [];
    }

    await Promise.all(
      productsRef.docs.map(async doc => {
        const productData = doc.data();
        let margin = 1;
        const productOptionsData = [
          {
            name: 'Size',
            values: productData.size_quantity.map(item => ({name: Object.keys(item)[0]}))
          }
        ];
        const productMediaData = productData.images.map(item => ({
          mediaContentType: 'IMAGE',
          originalSource: item.replace(/\s/g, '%20')
        }));
        const metafieldsData = productMetafields.map(metafield => ({
          key: metafield.key,
          value: productData[metafield.key]
        }));

        const productVariables = {
          product: {
            title: productData.name,
            descriptionHtml: productData.desscription,
            metafields: metafieldsData,
            productOptions: productOptionsData,
            collectionsToJoin: [],
            status: 'ACTIVE'
          },
          media: productMediaData
        };

        if (!categoryMappings.empty) {
          const categoryMapping = categoryMappings.docs.find(
            e => e.data().retailerId == productData.categoryMapping
          );

          if (categoryMapping) {
            productVariables.product.collectionsToJoin = [categoryMapping.shopShipperId];
            margin = categoryMapping.margin;
          }
        }

        const productShopify = await runProductMutation({shop, variables: productVariables});
        if (productShopify) {
          const optionId = productShopify.options[0].id;
          const productVariants = productShopify.options[0].optionValues.map(
            (optionValue, index) => ({
              sku: `${productData.sku}-${index + 1}`,
              price: productData.selling_price * margin,
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
            await runProductAdjustQuantitiesMutation({
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
            return updateProduct(doc.id, {
              productShopifyId: productShopify.id,
              queueStatus: 'synced',
              syncStatus: 'success'
            });
          }
        }
        return updateProduct(doc.id, {
          productShopifyId: '',
          syncStatus: 'failed'
        });
      })
    );
  } catch (e) {
    console.log(e);
  }
}

/**
 *
 * @param id
 * @param updateData
 * @returns {Promise<void>}
 */
export async function updateProduct(id, updateData) {
  await collection.doc(id).update({...updateData, updatedAt: FieldValue.serverTimestamp()});
}

/**
 *
 * @param shopId
 * @returns {Promise<void>}
 */
export async function createMetafields(shopId) {
  const shop = await getShopByIdIncludeAccessToken(shopId);
  await Promise.all(
    productMetafields.map(metafield =>
      runMetafieldDefinitionMutation({shop, variables: {definition: metafield}})
    )
  );
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
          syncStatus: 'new',
          queueStatus: 'created',
          ...item,
          size_quantity: sizeQuantity,
          size_quantity_delta: sizeQuantity,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
      });

    await batchCreate(firestore, collection, products);

    return true;
  } catch (e) {
    console.log(e);
  }

  return false;
}
