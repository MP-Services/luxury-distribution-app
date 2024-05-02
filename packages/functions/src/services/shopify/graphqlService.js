import {makeGraphQlApi} from '@functions/helpers/api';

export const CREATE_PRODUCT_MUTATION = `
mutation CreateProduct($product: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $product, media: $media){
        product {
            id
            title
        }
        userErrors {
            field
            message
        }
    }
}`;

/**
 *
 * @param shop
 * @param variables
 * @param query
 * @returns {Promise<*|string>}
 */
export async function runDiscountMutation({shop, variables, query = CREATE_PRODUCT_MUTATION}) {
  try {
    const graphqlQuery = {query, variables};
    const {data, errors} = await makeGraphQlApi({...shop, graphqlQuery});
    if (errors) {
      console.error(errors.map(x => x.message).join('. '));
      return '';
    }
    const {userErrors} = data;
    if (userErrors.length) {
      console.error(userErrors);
      return '';
    }
  } catch (error) {
    console.error(error);
    return '';
  }
}
