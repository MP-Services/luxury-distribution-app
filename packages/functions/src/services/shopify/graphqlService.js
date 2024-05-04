import {makeGraphQlApi} from '@functions/helpers/api';

export const GET_LOCATION_QUERY = `
query location($id: ID){
  location(id: $id) {
     id
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

export const CREATE_PRODUCT_VARIANTS_BULK_MUTATION = `
mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) {
    product {
      id
    }
    productVariants {
      id
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
export async function runProductMutation({shop, variables, query = CREATE_PRODUCT_MUTATION}) {
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
      return '';
    }

    return product;
  } catch (error) {
    console.error(error);
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
      return '';
    }

    return inventoryAdjustmentGroup;
  } catch (error) {
    console.error(error);
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
export async function runProductVariantsBulkMutation({
  shop,
  variables,
  query = CREATE_PRODUCT_VARIANTS_BULK_MUTATION
}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {product, productVariants, userErrors} = data.productVariantsBulkCreate;
    if (userErrors.length) {
      console.error(userErrors);
      return '';
    }

    return {product, productVariants};
  } catch (error) {
    console.error(error);
    return '';
  }
}
