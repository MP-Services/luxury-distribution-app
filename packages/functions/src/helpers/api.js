import axios from 'axios';

const client = axios.create();

/**
 * @param url
 * @param method
 * @param options
 * @param params
 * @param {*} data
 * @param resp
 * @returns {Promise<any>}
 */
export async function api(
  url,
  {method = 'GET', options = {}, params = {}, data = null, resp = 'data'} = {}
) {
  return client
    .request({
      ...options,
      headers: options.headers,
      url,
      data,
      method,
      params
    })
    .then(res => res[resp]);
}

/**
 *
 * @param graphqlQuery
 * @param shopifyDomain
 * @param accessToken
 * @param maxRetries
 * @param apiVersion
 * @returns {Promise<{data?: *, errors?: [], extensions?: {cost: {}}}>}
 */
export async function makeGraphQlApi(
  {graphqlQuery, shopifyDomain, accessToken},
  {apiVersion = API_VERSION, maxRetries = 5} = {}
) {
  const url = `https://${shopifyDomain}/admin/api/${apiVersion}/graphql.json`;
  const headers = {'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken};
  const handler = () => api(url, {data: graphqlQuery, method: 'POST', options: {headers}});

  const {errors, ...resp} = await shopifyRetryGraphQL(handler, {maxRetries});
  if (errors) {
    console.error(
      'graphql error',
      shopifyDomain,
      errors.map(x => x.message).join('. '),
      resp?.extensions?.cost
    );
    return {errors};
  }
  return resp;
}

/**
 * @param handler
 * @param maxRetries
 * @param {number} attempt
 * @return {Promise<*|undefined>}
 */
async function shopifyRetryGraphQL(handler, {maxRetries, attempt = 0}) {
  try {
    return await handler();
  } catch (e) {
    attempt++;
    const isRetryError = [500, 502, 503, 520].includes(e.statusCode);
    if (!isRetryError || attempt > maxRetries) {
      console.log('shopifyRetryGraphQL error', attempt, maxRetries, e.statusCode);
      throw new Error(e);
    }
    const delayTime = (attempt + Math.random()) * 1000;
    console.log('shopifyRetryGraphQL delayTime', delayTime);
    await delay(delayTime);
    return await shopifyRetryGraphQL(handler, {maxRetries, attempt});
  }
}
