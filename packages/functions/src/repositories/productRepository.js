import {FieldValue, Firestore} from '@google-cloud/firestore';
import {
  getLuxuryShopInfoByShopifyId,
  getLuxuryShops,
  getLuxuryStockList,
  getStockById
} from '@functions/repositories/luxuryRepository';
import {getBrandSettingShopId} from '@functions/repositories/settings/brandRepository';
import {getSyncSettingShopId} from '@functions/repositories/settings/syncRepository';
import {batchCreate, batchDelete, batchUpdate} from '@functions/repositories/helper';
import {
  getLocationQuery,
  runDeleteProductMutation,
  runMetafieldDefinitionMutation,
  runProductAdjustQuantitiesMutation,
  runProductMutation,
  runProductVariantsBulkMutation
} from '@functions/services/shopify/graphqlService';
import {getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {getMappingDataWithoutPaginate} from '@functions/repositories/settings/categoryRepository';
import productMetafields from '@functions/const/productMetafields';
import {prepareDoc} from './helper';
import {getGeneralSettingShopId} from '@functions/repositories/settings/generalRepository';
import {getAttributeMappingData} from '@functions/repositories/settings/attributeMappingRepository';
import {presentDataAndFormatDate} from '@avada/firestore-utils';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('products');

/**
 *
 * @param shopId
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
export async function getProductsQuery(shopId, limit = 0) {
  try {
    return await collection
      .where('shopifyId', '==', shopId)
      .orderBy('updatedAt')
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
 * @returns {Promise<*[]>}
 */
export async function syncProducts(shopId) {
  try {
    const syncSetting = await getSyncSettingShopId(shopId);
    const generalSetting = await getGeneralSettingShopId(shopId);
    const categoryMappings = await getMappingDataWithoutPaginate(shopId);
    const brandFilterSetting = await getBrandSettingShopId(shopId);
    const productsQuery = await getProductsQuery(shopId, 3);
    const shop = await getShopByIdIncludeAccessToken(shopId);
    const getSizeAttributeMapping = await getAttributeMappingData(shopId);
    const defaultLocationId = await getLocationQuery({shop, variables: {}});
    if (
      productsQuery.empty ||
      !defaultLocationId ||
      !brandFilterSetting ||
      brandFilterSetting.brands.length === 0
    ) {
      return [];
    }

    await Promise.all(
      productsQuery.docs.map(async doc => {
        const productData = doc.data();
        if (productData.queueStatus === 'deleted') {
          if (productData.syncStatus === 'success' && productData?.productShopifyId) {
            await runDeleteProductMutation({
              shop,
              variables: {
                product: {
                  id: productData.productShopifyId
                }
              }
            });
          }
          return deleteProductInQueue(doc.id);
        } else {
          // Remove product if it is not in brand filter
          // if (!brandFilterSetting.brands.includes()) {
          // const {productShopifyId} = productData;
          // if (productShopifyId) {
          //   await runDeleteProductMutation({
          //     shop,
          //     variables: {
          //       product: {id: productShopifyId}
          //     }
          //   });
          // }
          // return doc.ref.delete();
          // }
          let margin = 1;
          const sizeOptionsMap = convertOptionMappingToSizeValue(
            productData.size_quantity_delta.map(item => ({name: Object.keys(item)[0]})),
            getSizeAttributeMapping
          );
          const productOptionsData = [
            {
              name: 'Size',
              // values: productData.size_quantity_delta.map(item => ({name: Object.keys(item)[0]}))
              values: sizeOptionsMap
            }
          ];
          const productMediaData = productData.images.map(item => ({
            mediaContentType: 'IMAGE',
            originalSource: item.replace(/\s/g, '%20')
          }));
          const metafieldsData = productMetafields.map(metafield => ({
            key: metafield.key,
            value: productData[metafield.key],
            type: metafield.type
          }));

          const productVariables = {
            product: {
              title: generalSetting?.includeBrand
                ? `${productData.name} ${productData.brand}`
                : productData.name,
              descriptionHtml: syncSetting.description ? productData.desscription : '',
              metafields: metafieldsData,
              productOptions: productOptionsData,
              collectionsToJoin: [],
              status: generalSetting?.productAsDraft ? 'DRAFT' : 'ACTIVE'
            },
            media: syncSetting.images ? productMediaData : []
          };

          if (!categoryMappings.empty && syncSetting.categories) {
            const categoryMapping = categoryMappings.docs.find(
              e => e.data().retailerId == productData.categoryMapping
            );

            if (categoryMapping) {
              productVariables.product.collectionsToJoin = [categoryMapping.shopShipperId];
              margin = categoryMapping.margin;
            }
          }
          const productShopify = await runProductMutation({shop, variables: productVariables});
          let variants = [];
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
                variants = [...variants, ...[{id: item.id, title: item.title}]];

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
                productOptionsAfterMap: sizeOptionMapping(
                  productData.size_quantity_delta.map(item => Object.keys(item)[0]),
                  getSizeAttributeMapping,
                  productShopify.options[0].optionValues,
                  variants
                ),
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
        }
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
 * @param sizes
 * @param getSizeAttributeMapping
 * @returns {*}
 */
function convertOptionMappingToSizeValue(sizes, getSizeAttributeMapping) {
  if (getSizeAttributeMapping) {
    const sizeOptionMapping = getSizeAttributeMapping.optionsMapping;
    return sizes.map(size => {
      const sizeOption = sizeOptionMapping.find(option => option.retailerOptionName === size);
      return sizeOption?.dropshipperOptionName ?? size;
    });
  }
  return sizes;
}

/**
 *
 * @param sizes
 * @param getSizeAttributeMapping
 * @param productOptions
 * @param productVariants
 * @returns {*}
 */
function sizeOptionMapping(sizes, getSizeAttributeMapping, productOptions, productVariants) {
  if (getSizeAttributeMapping) {
    const sizeOptionMapping = getSizeAttributeMapping.optionsMapping;
    return sizes.map(size => {
      const sizeOption = sizeOptionMapping.find(option => option.retailerOptionName === size);
      return sizeOption?.dropshipperOptionName
        ? {
            type: 'size',
            originalOption: size,
            mappingOption: sizeOption.dropshipperOptionName,
            productOptionValueId: getProductOptionIdByName(
              productOptions,
              sizeOption.dropshipperOptionName
            ),
            productVariantId: getVariantIdByTitle(productVariants, sizeOption.dropshipperOptionName)
          }
        : {
            type: 'size',
            originalOption: size,
            mappingOption: size,
            productOptionValueId: getProductOptionIdByName(productOptions, size),
            productVariantId: getVariantIdByTitle(productVariants, size)
          };
    });
  }

  return sizes.map(size => ({
    type: 'size',
    originalSize: size,
    mappingSize: size,
    productOptionValueId: getProductOptionIdByName(productOptions, size),
    productVariantId: getVariantIdByTitle(productVariants, size)
  }));
}

/**
 *
 *
 * @param productVariants
 * @param title
 * @returns {*|string}
 */
function getVariantIdByTitle(productVariants, title) {
  const productVariant = productVariants.find(variant => {
    return variant.title === title;
  });
  return productVariant?.id ?? '';
}

/**
 *
 * @param productOptions
 * @param optionName
 * @returns {*|string}
 */
function getProductOptionIdByName(productOptions, optionName) {
  const productOption = productOptions.find(option => {
    return option.name === optionName;
  });
  return productOption?.id ?? '';
}

/**
 *
 * @param shopId
 * @returns {Promise<boolean>}
 */

export async function addProducts(shopId) {
  try {
    const luxuryShopInfo = await getLuxuryShopInfoByShopifyId(shopId);
    const stockList = await getLuxuryStockList(luxuryShopInfo);
    if (stockList) {
      const brandFilter = await getBrandSettingShopId(shopId);
      const getStockIds = await getStockIdsToSync(shopId);
      const products = stockList
        .filter(
          stockItem =>
            brandFilter.brands.includes(stockItem.brand) &&
            (!getStockIds || (getStockIds && !getStockIds.includes(stockItem.id)))
        )
        .map(item => {
          let sizeQuantity = [];
          if (item.hasOwnProperty('size_quantity')) {
            sizeQuantity = item.size_quantity.filter(item => !Array.isArray(item));
          }
          const {id, ...data} = item;

          return {
            stockId: id,
            shopifyId: shopId,
            syncStatus: 'new',
            queueStatus: 'created',
            ...data,
            size_quantity: sizeQuantity,
            size_quantity_delta: sizeQuantity,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          };
        });

      await batchCreate(firestore, collection, products);
    }
    return true;
  } catch (e) {
    console.log(e);
  }

  return false;
}

/**
 *
 * @param shopId
 * @param stockData
 * @returns {Promise<boolean>}
 */
export async function addProduct(shopId, stockData) {
  try {
    const brandFilter = await getBrandSettingShopId(shopId);
    if (stockData && brandFilter && brandFilter.brands.includes(stockData.brand)) {
      let sizeQuantity = [];
      if (stockData.hasOwnProperty('size_quantity')) {
        sizeQuantity = stockData.size_quantity.filter(item => !Array.isArray(item));
      }
      const {id, ...data} = stockData;
      return collection.add({
        stockId: id,
        shopifyId: shopId,
        syncStatus: 'new',
        queueStatus: 'created',
        ...data,
        size_quantity: sizeQuantity,
        size_quantity_delta: sizeQuantity,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.log(e);
  }

  return false;
}

/**
 *
 * @param shopId
 * @returns {Promise<{data: {deleteQueueProductCount: number, updateQueueProductCount: number, createQueueProductCount: number, totalsProductCount: number}, success: boolean}>}
 */
export async function getProductCounts(shopId) {
  try {
    const [totalProduct, createdQueue, updatedQueue, deletedQueue] = await Promise.all([
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '!=', 'deleted')
        .where('syncStatus', '==', 'success')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'created')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'updated')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'deleted')
        .count()
        .get()
    ]);

    return {
      success: true,
      data: {
        totalsProductCount: totalProduct.data().count,
        createQueueProductCount: createdQueue.data().count,
        updateQueueProductCount: updatedQueue.data().count,
        deleteQueueProductCount: deletedQueue.data().count
      }
    };
  } catch (e) {
    console.log(e);
    return {
      success: true,
      data: {
        totalsProductCount: 0,
        createQueueProductCount: 0,
        updateQueueProductCount: 0,
        deleteQueueProductCount: 0
      }
    };
  }
}

/**
 *
 * @param shopId
 * @returns {Promise<{shopId: *}[]>}
 */
export async function getStockIdsToSync(shopId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .where('syncStatus', '==', 'new')
    .get();

  if (docs.empty) {
    return null;
  }

  return docs.docs.map(doc => {
    const {stockId} = doc.data();
    return stockId;
  });
}

/**
 *
 * @param shopId
 * @returns {Promise<boolean>}
 */

export async function deleteProductsInQueueWhenChangeBrandFilter(shopId) {
  try {
    const brandFilterData = await getBrandSettingShopId(shopId);
    if (brandFilterData) {
      const brands = brandFilterData.brands;
      const docsQuery = collection
        .where('shopifyId', '==', shopId)
        .where('syncStatus', '==', 'new');
      if (Array.isArray(brands) && brands.length) {
        docsQuery.where('brand', 'not-in', brandFilterData.brands);
      }
      const docs = await docsQuery.get();
      await batchDelete(firestore, docs.docs);
    }

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param webhookData
 * @returns {Promise<boolean>}
 */
export async function productWebhook(webhookData) {
  try {
    const {event, record: stockId} = webhookData;
    const shops = await getLuxuryShops();
    switch (event) {
      case 'ProductCreate':
        await Promise.all(
          shops.map(async shop => {
            const stockData = await getStockById(stockId, shop);
            return addProduct(shop.shopifyId, stockData);
          })
        );
        break;
      case 'ProductUpdate':
        const products = await getAllProductsByStockId(stockId);
        await Promise.all(
          shops.map(async shop => {
            const productNeedUpdate = products.find(item => item.shopifyId === shop.shopifyId);
            const sizeQuantityOfProduct = productNeedUpdate.size_quantity;
            const newStockData = await getStockById(stockId, shop);
            const {id, ...newUpdateStockData} = newStockData;
            if (productNeedUpdate.syncStatus !== 'success') {
              const sizeQuantityNeedUpdate = newStockData.size_quantity.filter(
                item => !Array.isArray(item)
              );
              const oldSize = sizeQuantityOfProduct.map(item => Object.keys(item)[0]);
              const newSizeQuantity = sizeQuantityNeedUpdate.filter(
                a => !oldSize.includes(Object.keys(a)[0])
              );
              newUpdateStockData.size_quantity = sizeQuantityNeedUpdate;
              newUpdateStockData.size_quantity_delta = getSizeQuantityDelta(
                sizeQuantityNeedUpdate,
                productNeedUpdate.size_quantity_delta
              );
            }
            return updateProduct(productNeedUpdate.id, {
              ...newUpdateStockData,
              queueStatus: 'updated',
              syncStatus: 'new',
              updatedAt: FieldValue.serverTimestamp()
            });
          })
        );
        break;
      case 'ProductDelete':
        await queueProductBulkDelete(stockId);
        break;
    }

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param a
 * @param b
 * @returns {*}
 */

function getSizeQuantityDelta(a, b) {
  return b.map(itemB => {
    const keyB = Object.keys(itemB)[0];
    const valueB = parseInt(itemB[keyB]);
    const itemA = a.find(item => Object.keys(item)[0] === keyB);

    if (itemA) {
      const valueA = parseInt(itemA[keyB]);
      const newValue = valueB - valueA;
      return {[keyB]: newValue.toString()};
    }

    return itemB;
  });
}

/**
 *
 * @param stockId
 * @returns {Promise<*[]|null>}
 */
async function getAllProductsByStockId(stockId) {
  const docs = await collection.where('id', '==', stockId).get();
  if (docs.empty) {
    return null;
  }

  return docs.docs.map(doc => ({id: doc.id, ...doc.data()}));
}

/**
 *
 * @param stockId
 * @returns {Promise<null>}
 */
async function queueProductBulkDelete(stockId) {
  const docs = await collection.where('stockId', '==', stockId).get();
  if (docs.empty) {
    return null;
  }

  await batchUpdate(firestore, docs.docs, {
    queueStatus: 'deleted',
    updatedAt: FieldValue.serverTimestamp()
  });
}

/**
 *
 * @param id
 * @returns {Promise<void>}
 */
async function deleteProductInQueue(id) {
  await collection.doc(id).delete();
}

/**
 *
 * @param shopId
 * @param productShopifyId
 * @returns {Promise<any|null>}
 */
export async function getProductByShopifyProductId(shopId, productShopifyId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .where('productShopifyId', '==', `gid://shopify/Product/${productShopifyId}`)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  const [doc] = docs.docs;
  return presentDataAndFormatDate(doc);
}
