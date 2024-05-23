import {makeGraphQlApi} from '@functions/helpers/api';
import {addLog} from '@functions/repositories/logRepository';

export const GET_LOCATION_QUERY = `
query location($id: ID){
  location(id: $id) {
     id
  }
}
`;

export const GET_PUBLICATIONS_QUERY = `
query publications($after: String) {
 publications(first: 10, catalogType: APP, after: $after ) {
    edges {
      node {
        id
        name
        supportsFuturePublishing
        app {
          id
          title
          description
          developerName
        }
      }
    }
     pageInfo {
      endCursor
      hasNextPage
    }
  }
}
`;

export const CREATE_METAFIELD_DEFINITION_MUTATION = `
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const METAFIELDS_SET_MUTATION = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      key
      namespace
      value
      createdAt
      updatedAt
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const DELETE_PRODUCT_MUTATION = `
mutation DeleteProduct($product: ProductDeleteInput!) {
  productDelete(input: $product){
        deletedProductId
        userErrors {
            field
            message
        }
    }
}
`;

export const CREATE_PRODUCT_MUTATION = `
mutation CreateProduct($product: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $product, media: $media){
        product {
            id
            title
            options {
              id
              name
              optionValues {
                id
                name
              }
           }
        }
        userErrors {
            field
            message
        }
    }
}`;

export const UPDATE_PRODUCT_MUTATION = `
mutation UpdateProduct($product: ProductInput!, $media: [CreateMediaInput!]) {
  productUpdate(input: $product, media: $media){
        product {
            id
            title
            options {
              id
              name
              optionValues {
                id
                name
              }
           }
        }
        userErrors {
            field
            message
        }
    }
}`;

export const PRODUCT_OPTION_UPDATE_MUTATION = `
mutation updateOption($productId: ID!, $option: OptionUpdateInput!, $optionValuesToAdd: [OptionValueCreateInput!], $optionValuesToUpdate: [OptionValueUpdateInput!], $optionValuesToDelete: [ID!]) {
  productOptionUpdate(productId: $productId, option: $option, optionValuesToAdd: $optionValuesToAdd, optionValuesToUpdate: $optionValuesToUpdate, optionValuesToDelete: $optionValuesToDelete) {
    userErrors {
      field
      message
      code
    }
    product {
      id
      options {
        id
        name
        values
        position
        optionValues {
          id
          name
          hasVariants
        }
      }
    }
  }
}
`;

export const PRODUCT_VARIANTS_BULK_DELETE_MUTATION = `
mutation bulkDeleteProductVariants($productId: ID!, $variantsIds: [ID!]!) {
  productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
    product {
      id
      title
      productType
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const CREATE_PRODUCT_VARIANTS_BULK_MUTATION = `
mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) {
    product {
      id
    }
    productVariants {
      id
      title
      inventoryItem {
        id
      }
      metafields(first: 1) {
        edges {
          node {
            namespace
            key
            value
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const UPDATE_PRODUCT_VARIANTS_BULK_MUTATION = `
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    product {
      id
    }
    productVariants {
      id
      title
      inventoryItem {
        id
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const INVENTORY_ADJUST_QUANTITIES_MUTATION = `
mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!, $locationId: ID!) {
  inventoryAdjustQuantities(input: $input) {
    inventoryAdjustmentGroup {
      id
      changes {
        delta
        name
        location {
          id
        }
        item {
          id
          variant {
            id
          }
          inventoryLevel(locationId: $locationId) {
            id
            quantities(
              names: ["available", "committed", "incoming", "on_hand", "reserved", "damaged", "safety_stock", "quality_control"]
            ) {
              id
              quantity
              name
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const METAFIELDS_DEFINITIONS_QUERY = `
query {
  metafieldDefinitions(first: 250, ownerType: PRODUCT, namespace: "luxury") {
    edges {
      node {
        name
        id
        key
        ownerType
        namespace
      }
    }
  }
}
`;

export const METAFIELDS_DELETE_MUTATION = `
mutation metafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
  metafieldsDelete(metafields: $metafields) {
    deletedMetafields {
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const PRODUCT_MEDIA_QUERY = `
query product($id: ID!){
  product(id: $id) {
    id
    title
    media(first: 50) {
      edges {
        node {
          ... on MediaImage {
            id
            image {
              src
            }
          }
        }
      }
    }
  }
}
`;

export const FILE_DELETE_MUTATION = `
mutation fileDelete($fileIds: [ID!]!) {
  fileDelete(fileIds: $fileIds) {
    deletedFileIds
    userErrors {
      field
      message
    }
  }
}
`;

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function getProductMediaQuery({shop, variables, query = PRODUCT_MEDIA_QUERY}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }

    const {product} = data;

    return product?.media?.edges;
  } catch (e) {
    console.log(e);
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runFileDeleteMutation({shop, variables, query = FILE_DELETE_MUTATION}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {deletedFileIds, userErrors} = data.fileDelete;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return deletedFileIds;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function getLocationQuery({shop, variables, query = GET_LOCATION_QUERY}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }

    const {location} = data;

    return location.id;
  } catch (e) {
    console.log(e);
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runMetafieldsDelete({shop, variables, query = METAFIELDS_DELETE_MUTATION}) {
  try {
    const graphqlQuery = {query, variables};
    const {errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return false;
    }

    return true;
  } catch (e) {
    console.log(e);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(e)});
    return false;
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runMetafieldsQuery({shop, query = METAFIELDS_DEFINITIONS_QUERY}) {
  try {
    const graphqlQuery = {query};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }

    const {metafieldDefinitions} = data;

    return metafieldDefinitions?.edges;
  } catch (e) {
    console.log(e);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(e)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runMetafieldsSetMutation({shop, variables, query = METAFIELDS_SET_MUTATION}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {metafields, userErrors} = data.metafieldsSet;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return metafields;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runMetafieldDefinitionMutation({
  shop,
  variables,
  query = CREATE_METAFIELD_DEFINITION_MUTATION
}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {createdDefinition, userErrors} = data.metafieldDefinitionCreate;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return createdDefinition;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runDeleteProductMutation({shop, variables, query = DELETE_PRODUCT_MUTATION}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {deletedProductId, userErrors} = data.productDelete;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return deletedProductId;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runProductCreateMutation({shop, variables, query = CREATE_PRODUCT_MUTATION}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {product, userErrors} = data.productCreate;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return product;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runProductUpdateMutation({shop, variables, query = UPDATE_PRODUCT_MUTATION}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {product, userErrors} = data.productUpdate;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return product;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runProductAdjustQuantitiesMutation({
  shop,
  variables,
  query = INVENTORY_ADJUST_QUANTITIES_MUTATION
}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {inventoryAdjustmentGroup, userErrors} = data.inventoryAdjustQuantities;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return inventoryAdjustmentGroup;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @param key
 * @returns {Promise<*|string>}
 */
export async function runProductVariantsBulkMutation({
  shop,
  variables,
  query = CREATE_PRODUCT_VARIANTS_BULK_MUTATION,
  key = 'productVariantsBulkCreate'
}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {product, productVariants, userErrors} = data[key];
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return {product, productVariants};
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runProductVariantsDeleteMutation({
  shop,
  variables,
  query = PRODUCT_VARIANTS_BULK_DELETE_MUTATION
}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {product, userErrors} = data.productVariantsBulkDelete;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return product;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runProductOptionUpdateMutation({
  shop,
  variables,
  query = PRODUCT_OPTION_UPDATE_MUTATION
}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {product, userErrors} = data.productOptionUpdate;
    if (userErrors.length) {
      console.error(userErrors);
      await addLog(shop.shopifyDomain, {errors: JSON.stringify(userErrors)});
      return '';
    }

    return product;
  } catch (error) {
    console.error(error);
    await addLog(shop.shopifyDomain, {errors: JSON.stringify(error)});
    return '';
  }
}

/**
 *
 * @param shop
 * @param after
 * @param variables
 * @param query
 * @returns {Promise<{product: *, productVariants: *}|string>}
 */
export async function getOnlineStorePublication({
  shop,
  after = null,
  variables = {},
  query = GET_PUBLICATIONS_QUERY
}) {
  try {
    const graphqlQuery = {query, variables: {...variables, after}};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {publications} = data;
    const {hasNextPage, endCursor} = publications.pageInfo;
    const onlineStore = publications.edges.find(
      publication =>
        publication.node.name === 'Online Store' && publication.node?.supportsFuturePublishing
    );
    if (onlineStore) {
      return onlineStore.node.id;
    }
    const nextAfter = hasNextPage && endCursor;
    if (nextAfter) {
      return await getOnlineStorePublication({
        shop,
        after: nextAfter
      });
    }
  } catch (error) {
    console.error(error);
    return '';
  }
}
