import {Firestore, FieldValue} from '@google-cloud/firestore';
import {getAllCollections, initShopify} from '@functions/services/shopifyService';
import {getShopByIdIncludeAccessToken} from '@functions/repositories/shopRepository';
import {getLuxuryStockList, getCategories} from '@functions/repositories/luxuryRepository';
import {
  batchCreate,
  batchUpdate,
  batchDelete,
  getOrderBy,
  paginateQuery
} from '@functions/repositories/helper';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('categoryMappingSettings');

export async function getMappingData(id, query = {}) {
  try {
    const queriedRef = collection.where('shopifyId', '==', id);
    // const {sortField, direction} = getOrderBy(null);
    // queriedRef = queriedRef.orderBy(sortField, direction);
    return await paginateQuery({queriedRef, collection, query});
  } catch (e) {
    console.log(e);
    return {data: [], count: 0, pageInfo: {hasNext: false, hasPre: false}, error: e.message};
  }
}

/**
 *
 * @param id
 * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>>}
 */
export async function getMappingDataWithoutPaginate(id) {
  return await collection.where('shopifyId', '==', id).get();
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
    // const stockList = await getLuxuryStockList(data);
    // if (stockList.length) {
    //   const retailerCats = stockList.reduce((accumulator, item) => {
    //     const {category, sub_category, sub_sub_category} = item;
    //     let catId = category.id;
    //     let catName = category.name;
    //
    //     if (sub_category) {
    //       catId = catId + '_' + sub_category.id;
    //       catName = catName + ' > ' + sub_category.name;
    //     }
    //
    //     if (sub_sub_category) {
    //       catId = catId + '_' + sub_sub_category.id;
    //       catName = catName + ' > ' + sub_sub_category.name;
    //     }
    //
    //     const hasDuplicate = accumulator.some(element => element.catId === catId);
    //
    //     if (!hasDuplicate) {
    //       accumulator.push({catId, catName});
    //     }
    //
    //     return accumulator;
    //   }, []);

    const productCategories = await getCategories(data);
    if (productCategories.length) {
      const retailerCats = transformCategoriesData(productCategories);
      return retailerCats;
    }
  } catch (e) {
    console.log(e);
  }

  return [];
}

function transformCategoriesData(category, parentName = '', result = []) {
  category.forEach(item => {
    const name = parentName ? `${parentName} > ${item.name}` : item.name;
    result.push({
      catId: item.id,
      catName: name
    });
    if (item.children && item.children.length > 0) {
      transformCategoriesData(item.children, name, result);
    }
  });
  return result;
}

/**
 *
 * @param shopID
 * @param shopifyDomain
 * @param postData
 * @returns {Promise<boolean>}
 */
export async function saveCategoryMapping(shopID, shopifyDomain, postData) {
  try {
    if (postData.length) {
      const dataArr = postData.map(item => {
        const {id, ...data} = {...item};
        return {
          shopifyId: shopID,
          shopifyDomain,
          ...data,
          updatedAt: FieldValue.serverTimestamp()
        };
      });
      await batchCreate(firestore, collection, dataArr);
    }

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param shopID
 * @param shopifyDomain
 * @param postData
 * @returns {Promise<boolean>}
 */
export async function editCategoryMapping(shopID, shopifyDomain, postData) {
  try {
    if (postData.length) {
      await Promise.all(
        postData.map(data => {
          const {id, ...updateData} = {...data};
          return collection.doc(id).update(updateData);
        })
      );
    }
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 *
 * @param id
 * @returns {Promise<boolean>}
 */
export async function deleteCategoryById(id) {
  await collection.doc(id).delete();

  return true;
}
