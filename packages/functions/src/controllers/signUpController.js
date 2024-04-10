const axios = require('axios');

/**
 * Get current subscription of a shop
 *
 * @param {Context|Object|*} ctx
 * @returns {Promise<void>}
 */
export async function signUp(ctx) {
  try {
    const {username, password} = {...ctx.request.body};
    const response = await axios.post('https://api.luxury-distribution.com/api', {
      username, password
    });
    console.log(response);
  } catch (e) {
    console.error(e);
  }
}
