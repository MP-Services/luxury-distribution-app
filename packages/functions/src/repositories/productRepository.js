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
  getOnlineStorePublication,
  runDeleteProductMutation,
  runMetafieldDefinitionMutation,
  runProductAdjustQuantitiesMutation,
  runProductCreateMutation,
  runProductVariantsBulkMutation,
  runProductUpdateMutation,
  runMetafieldsSetMutation,
  UPDATE_PRODUCT_VARIANTS_BULK_MUTATION
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
      .where('queueStatus', '!=', 'synced')
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
    const onlineStore = await getOnlineStorePublication({shop});
    await Promise.all(
      productsQuery.docs.map(async doc => {
        const productData = doc.data();
        if (productData.queueStatus === 'delete' && productData?.productShopifyId) {
          await runDeleteProductMutation({
            shop,
            variables: {
              product: {
                id: productData.productShopifyId
              }
            }
          });
          return deleteProductInQueue(doc.id);
        } else {
          if (!productData?.productShopifyId && productData.queueStatus === 'create') {
            // Create new product to shopify
            const {productVariables, margin} = addCollectionsToProductVariables(
              categoryMappings,
              syncSetting,
              productData,
              getProductVariables({
                generalSetting,
                syncSetting,
                productData,
                getSizeAttributeMapping,
                onlineStore
              })
            );
            const productShopify = await runProductCreateMutation({
              shop,
              variables: productVariables
            });
            if (productShopify) {
              const productVariantsVariables = getProductVariantsVariables(
                productData,
                productShopify,
                margin
              );
              const {productVariants: productVariantsReturn} = await runProductVariantsBulkMutation(
                {
                  shop,
                  variables: productVariantsVariables
                }
              );
              if (productVariantsReturn) {
                const productAdjustQuantitiesVariables = getProductAdjustQuantitiesVariables(
                  productVariantsReturn,
                  productData.size_quantity_delta,
                  defaultLocationId
                );
                await runProductAdjustQuantitiesMutation({
                  shop,
                  variables: productAdjustQuantitiesVariables.variables
                });
                return updateProduct(doc.id, {
                  productOptionsAfterMap: sizeOptionMapping(
                    productData.size_quantity_delta.map(item => Object.keys(item)[0]),
                    getSizeAttributeMapping,
                    productShopify.options[0].optionValues,
                    productAdjustQuantitiesVariables.variants,
                    productShopify.options[0].id
                  ),
                  productShopifyId: productShopify.id,
                  queueStatus: 'synced',
                  syncStatus: 'success',
                  updatedAt: FieldValue.serverTimestamp(),
                  size_quantity_delta: []
                });
              }
            } else {
              return updateProduct(doc.id, {
                productShopifyId: '',
                syncStatus: 'failed',
                updatedAt: FieldValue.serverTimestamp()
              });
            }
          } else {
            // Update product if it has been synced
            const initProductVariables = {
              product: {
                id: productData.productShopifyId,
                title: generalSetting?.includeBrand
                  ? `${productData.name} ${productData.brand}`
                  : productData.name,
                descriptionHtml: syncSetting.description ? productData.desscription : ''
              }
            };

            const {productVariables, margin} = addCollectionsToProductVariables(
              categoryMappings,
              syncSetting,
              productData,
              initProductVariables
            );

            const productVariantsUpdateVariables = getProductVariantsUpdateVariables(
              productData,
              margin
            );

            const updateMutations = [
              runProductUpdateMutation({
                shop,
                variables: productVariables
              }),
              runMetafieldsSetMutation({
                shop,
                variables: {metafields: getMetafieldsData(productData)}
              }),
              runProductVariantsBulkMutation({
                shop,
                variables: productVariantsUpdateVariables,
                query: UPDATE_PRODUCT_VARIANTS_BULK_MUTATION,
                key: 'productVariantsBulkUpdate'
              })
            ];

            if (productData.size_quantity_delta.length) {
              const productAdjustQuantitiesUpdate = getProductAdjustQuantitiesUpdate(
                productData.productOptionsAfterMap,
                productData.size_quantity_delta,
                defaultLocationId
              );
              updateMutations.push(
                runProductAdjustQuantitiesMutation({
                  shop,
                  variables: productAdjustQuantitiesUpdate.variables
                })
              );
            }

            await Promise.all(updateMutations);

            return updateProduct(doc.id, {
              syncStatus: 'success',
              queueStatus: 'synced',
              updatedAt: FieldValue.serverTimestamp()
            });
          }
          // return updateProduct(doc.id, {
          //   syncStatus: 'failed'
          // });
        }
      })
    );
  } catch (e) {
    console.log(e);
  }
}

/**
 *
 * @param categoryMappings
 * @param syncSetting
 * @param productData
 * @param productVariables
 * @returns {{margin: number, productVariables}}
 */
function addCollectionsToProductVariables(
  categoryMappings,
  syncSetting,
  productData,
  productVariables
) {
  let margin = 1;
  if (!categoryMappings.empty && syncSetting.categories) {
    const categoryMapping = categoryMappings.docs.find(
      e => e.data().retailerId == productData.categoryMapping
    );

    if (categoryMapping) {
      productVariables.product.collectionsToJoin = [categoryMapping.shopShipperId];
      margin = categoryMapping?.margin || 1;
    }
  }

  return {productVariables, margin};
}

/**
 *
 * @param generalSetting
 * @param syncSetting
 * @param productData
 * @param getSizeAttributeMapping
 * @param onlineStore
 * @returns {{product: {metafields: *, productOptions: [{values: *, name: string}], descriptionHtml: (*|string), title: (string|*), collectionsToJoin: *[], status: (string), publications: ([{publicationId}]|*[])}, media: (*|*[])}}
 */
function getProductVariables({
  generalSetting,
  syncSetting,
  productData,
  getSizeAttributeMapping,
  onlineStore
}) {
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

  const metafieldsData = getMetafieldsData(productData);
  return {
    product: {
      title: generalSetting?.includeBrand
        ? `${productData.name} ${productData.brand}`
        : productData.name,
      descriptionHtml: syncSetting.description ? productData.desscription : '',
      metafields: metafieldsData,
      productOptions: productOptionsData,
      collectionsToJoin: [],
      status: generalSetting?.productAsDraft ? 'DRAFT' : 'ACTIVE',
      publications: onlineStore ? [{publicationId: onlineStore}] : []
    },
    media: syncSetting.images ? productMediaData : []
  };
}

/**
 *
 * @param productData
 * @returns {{type: *, value: *, key: *}[]}
 */
function getMetafieldsData(productData) {
  if (!productData.productShopifyId) {
    return productMetafields.map(metafield => ({
      key: metafield.key,
      value:
        metafield.key === 'season_one' || metafield.key === 'season_two'
          ? productData[metafield.key]?.name
          : productData[metafield.key],
      namespace: 'luxury'
    }));
  } else {
    return productMetafields.map(metafield => ({
      key: metafield.key,
      value:
        metafield.key === 'season_one' || metafield.key === 'season_two'
          ? productData[metafield.key]?.name
          : productData[metafield.key],
      namespace: 'luxury',
      ownerId: productData.productShopifyId
    }));
  }
}

/**
 *
 * @param productData
 * @param productShopify
 * @param margin
 * @returns {{productId, variants: *}}
 */
function getProductVariantsVariables(productData, productShopify, margin) {
  const productVariants = productShopify.options[0].optionValues.map((optionValue, index) => ({
    sku: `${productData.sku}-${index + 1}`,
    price: productData.selling_price * margin,
    compareAtPrice: productData.original_price,
    optionValues: [
      {
        optionId: productShopify.options[0].id,
        id: optionValue.id
      }
    ]
  }));
  return {
    productId: productShopify.id,
    variants: productVariants
  };
}

/**
 *
 * @param productData
 * @param margin
 * @returns {{productId, variants: *}}
 */
function getProductVariantsUpdateVariables(productData, margin) {
  const productOptions = productData.productOptionsAfterMap;
  const productVariants = productOptions.map(item => ({
    price: productData.selling_price * margin,
    compareAtPrice: productData.original_price,
    id: item.productVariantId
  }));
  return {
    productId: productData.productShopifyId,
    variants: productVariants
  };
}

/**
 *
 * @param productVariantsReturn
 * @param sizeQuantityDelta
 * @param defaultLocationId
 * @returns {{variables: {input: {reason: string, changes: *, name: string}, locationId}}}
 */
function getProductAdjustQuantitiesVariables(
  productVariantsReturn,
  sizeQuantityDelta,
  defaultLocationId
) {
  let variants = [];
  const changesData = productVariantsReturn.map((item, index) => {
    variants = [
      ...variants,
      ...[{id: item.id, title: item.title, inventoryItem: item.inventoryItem}]
    ];

    return {
      inventoryItemId: item.inventoryItem.id,
      delta: Number(Object.values(sizeQuantityDelta[index])[0]),
      locationId: defaultLocationId
    };
  });

  return {
    variables: {
      locationId: defaultLocationId,
      input: {
        changes: changesData,
        reason: 'correction',
        name: 'available'
      }
    },
    variants
  };
}

/**
 *
 * @param productOptionsAfterMap
 * @param sizeQuantityDelta
 * @param defaultLocationId
 * @returns {{variables: {input: {reason: string, changes: *, name: string}, locationId}}}
 */
function getProductAdjustQuantitiesUpdate(
  productOptionsAfterMap,
  sizeQuantityDelta,
  defaultLocationId
) {
  const changesData = productOptionsAfterMap.map((item, index) => {
    const deltaItem = sizeQuantityDelta.find(size => {
      return Object.keys(size)[0] == item.originalSize;
    });
    const delta = deltaItem ? Object.values(deltaItem)[0] : 0;
    return {
      inventoryItemId: item.inventoryItemId,
      delta: Number(delta),
      locationId: defaultLocationId
    };
  });
  return {
    variables: {
      locationId: defaultLocationId,
      input: {
        changes: changesData,
        reason: 'correction',
        name: 'available'
      }
    }
  };
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
 * @param shopifyId
 * @param mappingData
 * @returns {Promise<void>}
 */
export async function updateProductBulkWhenSaveMapping(shopifyId, mappingData) {
  if (mappingData.length) {
    const retailerCategories = mappingData.map(mappingRow => Number(mappingRow.retailerId));
    const docs = await collection
      .where('shopifyId', '==', shopifyId)
      .where('productShopifyId', '!=', '')
      .where('queueStatus', '==', 'synced')
      .where('syncStatus', '==', ['success', 'failed'])
      .where('product_category_id', 'in', retailerCategories)
      .get();
    if (!docs.empty) {
      await batchUpdate(firestore, docs.docs, {
        queueStatus: 'update',
        syncStatus: 'new',
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  }
}

/**
 *
 * @param shopifyId
 * @param generalSetting
 * @returns {Promise<void>}
 */
export async function updateProductBulkWhenSaveGeneralSetting(shopifyId, generalSetting) {
  if (generalSetting?.deleteOutStock) {
    const outOfStockDocsCreate = await collection
      .where('shopifyId', '==', shopifyId)
      .where('queueStatus', '==', 'create')
      .where('qty', '==', 0)
      .get();
    const outOfStockDocsSynced = await collection
      .where('shopifyId', '==', shopifyId)
      .where('qty', '==', 0)
      .where('productShopifyId', '!=', '')
      .get();
    const docsSynced = await collection
      .where('shopifyId', '==', shopifyId)
      .where('qty', '>', 0)
      .where('productShopifyId', '!=', '')
      .get();
    const actions = [];
    if (!outOfStockDocsCreate.empty) {
      actions.push(batchDelete(firestore, outOfStockDocsCreate.docs));
    }
    if (!outOfStockDocsSynced.empty) {
      actions.push(
        batchUpdate(firestore, outOfStockDocsSynced.docs, {
          queueStatus: 'delete',
          syncStatus: 'new',
          updatedAt: FieldValue.serverTimestamp()
        })
      );
    }
    if (!docsSynced.empty) {
      const outStockDocsUpdate = docsSynced.docs.filter(doc => {
        const stockData = doc.data();
        for (const size of stockData.size_quantity) {
          if (Number(Object.values(size)[0]) === 0) {
            return true;
          }
        }
        return false;
      });
      if (outStockDocsUpdate.length) {
        actions.push(
          batchUpdate(firestore, outStockDocsUpdate, {
            queueStatus: 'update',
            syncStatus: 'new',
            updatedAt: FieldValue.serverTimestamp()
          })
        );
      }
    }

    await Promise.all(actions);
  }
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
 * @param productOptionId
 * @returns {*}
 */
function sizeOptionMapping(
  sizes,
  getSizeAttributeMapping,
  productOptions,
  productVariants,
  productOptionId
) {
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
            productVariantId: getVariantIdByTitle(
              productVariants,
              sizeOption.dropshipperOptionName
            ),
            inventoryItemId: getInventoryItemIdByTitle(
              productVariants,
              sizeOption.dropshipperOptionName
            ),
            productOptionId
          }
        : {
            type: 'size',
            originalOption: size,
            mappingOption: size,
            productOptionValueId: getProductOptionIdByName(productOptions, size),
            productVariantId: getVariantIdByTitle(productVariants, size),
            inventoryItemId: getInventoryItemIdByTitle(productVariants, size),
            productOptionId
          };
    });
  }

  return sizes.map(size => ({
    type: 'size',
    originalSize: size,
    mappingSize: size,
    productOptionValueId: getProductOptionIdByName(productOptions, size),
    productVariantId: getVariantIdByTitle(productVariants, size),
    inventoryItemId: getInventoryItemIdByTitle(productVariants, size),
    productOptionId
  }));
}

/**
 *
 *
 * @param productVariants
 * @param title
 * @returns {*|string}
 */
function getInventoryItemIdByTitle(productVariants, title) {
  const productVariant = productVariants.find(variant => {
    return variant.title === title;
  });
  return productVariant?.inventoryItem?.id ?? '';
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
      const stockIdsExclude = await getStockIdsExclude(shopId);
      const products = stockList
        .filter(
          stockItem =>
            brandFilter.brands.includes(stockItem.brand) &&
            (!stockIdsExclude || (stockIdsExclude && !stockIdsExclude.includes(stockItem.id)))
        )
        .map(item => {
          let sizeQuantity = [];
          if (item.hasOwnProperty('size_quantity')) {
            sizeQuantity = item.size_quantity.filter(item => !Array.isArray(item));
          }
          const {id, ...data} = item;

          return {
            ...data,
            stockId: id,
            shopifyId: shopId,
            syncStatus: 'new',
            queueStatus: 'create',
            productShopifyId: '',
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
        ...data,
        queueStatus: 'create',
        syncStatus: 'new',
        shopifyId: shopId,
        stockId: id,
        productShopifyId: '',
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
    const [totalProduct, createQueue, updateQueue, deleteQueue] = await Promise.all([
      collection
        .where('shopifyId', '==', shopId)
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'create')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'update')
        .count()
        .get(),
      collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'delete')
        .count()
        .get()
    ]);

    return {
      success: true,
      data: {
        totalsProductCount: totalProduct.data().count,
        createQueueProductCount: createQueue.data().count,
        updateQueueProductCount: updateQueue.data().count,
        deleteQueueProductCount: deleteQueue.data().count
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
export async function getStockIdsExclude(shopId) {
  const docs = await collection
    .where('shopifyId', '==', shopId)
    .where('productShopifyId', '!=', '')
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
 * @param brandFilterData
 * @returns {Promise<boolean>}
 */

export async function deleteProductsInQueueWhenChangeBrandFilter(shopId, brandFilterData) {
  try {
    if (brandFilterData) {
      const brands = brandFilterData.brands;
      const docsQuery = collection
        .where('shopifyId', '==', shopId)
        .where('queueStatus', '==', 'create');
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
        await Promise.all(
          shops.map(async shop => {
            const {shopifyId} = shop;
            const productNeedUpdate = await getAllProductByStockId(stockId, shopifyId);
            if (productNeedUpdate) {
              const brandFilter = await getBrandSettingShopId(shopifyId);
              const sizeQuantityOfProduct = productNeedUpdate.size_quantity;
              const newStockData = await getStockById(stockId, shop);
              const isExistInBrandFilter =
                brandFilter?.brands && brandFilter.brands.includes(newStockData.brand);
              if (!isExistInBrandFilter) {
                // If product is not in the brand filter
                if (productNeedUpdate?.productShopifyId) {
                  return updateProduct(productNeedUpdate.id, {
                    queueStatus: 'delete',
                    updatedAt: FieldValue.serverTimestamp()
                  });
                } else {
                  return deleteProductsInQueueWhenChangeBrandFilter(shopifyId, brandFilter);
                }
              } else {
                if (productNeedUpdate?.productShopifyId) {
                  // const sizeQuantityNeedUpdate = newStockData.size_quantity.filter(
                  //   item => !Array.isArray(item)
                  // );
                  // const oldSize = sizeQuantityOfProduct.map(item => Object.keys(item)[0]);
                  // const newSizeQuantity = sizeQuantityNeedUpdate.filter(
                  //   a => !oldSize.includes(Object.keys(a)[0])
                  // );
                  // newStockData.size_quantity = sizeQuantityNeedUpdate;
                  newStockData.size_quantity_delta = getSizeQuantityDelta(
                    newStockData.size_quantity,
                    productNeedUpdate.size_quantity
                  );
                  const queueStatus = productNeedUpdate?.productShopifyId ? 'update' : 'create';
                  return updateProduct(productNeedUpdate.id, {
                    ...newStockData,
                    queueStatus,
                    syncStatus: 'new',
                    updatedAt: FieldValue.serverTimestamp()
                  });
                } else {
                  return addProduct(shop.shopifyId, newStockData);
                }
              }
            }
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
 * @param shopifyId
 * @returns {Promise<{[p: string]: FirebaseFirestore.DocumentFieldValue, uid: string}|null>}
 */
async function getAllProductByStockId(stockId, shopifyId) {
  const docs = await collection
    .where('stockId', '==', stockId)
    .where('shopifyId', '==', shopifyId)
    .limit(1)
    .get();
  if (docs.empty) {
    return null;
  }

  const doc = docs.docs[0];
  return {uid: doc.id, ...doc.data()};
}

/**
 *
 * @param stockId
 * @returns {Promise<null>}
 */
async function queueProductBulkDelete(stockId) {
  const docsSync = await collection
    .where('stockId', '==', stockId)
    .where('queueStatus', '!=', 'create')
    .get();
  const docs = await collection
    .where('stockId', '==', stockId)
    .where('queueStatus', '==', 'create')
    .get();
  if (!docsSync.empty) {
    await batchUpdate(firestore, docsSync.docs, {
      queueStatus: 'delete',
      syncStatus: 'new',
      updatedAt: FieldValue.serverTimestamp()
    });
  }
  if (!docs.empty) {
    await batchDelete(firestore, docs.docs);
  }
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
