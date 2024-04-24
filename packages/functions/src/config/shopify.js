import * as functions from 'firebase-functions';

const {shopify} = functions.config();

export default {
  secret: shopify.secret,
  apiKey: shopify.api_key,
  firebaseApiKey: shopify.firebase_api_key,
  scopes: shopify.scopes?.split(',') || [
    'read_themes',
    'write_themes',
    'read_analytics',
    'write_products',
    'read_products',
    'read_product_listings',
    'write_orders',
    'read_orders',
    'write_locations',
    'read_locations'
  ]
};
