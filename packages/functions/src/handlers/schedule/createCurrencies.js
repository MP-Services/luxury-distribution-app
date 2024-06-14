import {updateCurrencies} from '@functions/repositories/currencyRepository';
/**
 *
 * @returns {Promise<void>}
 */
export default async function createCurrenciesData() {
  try {
    await updateCurrencies();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
