import {FieldValue, Firestore} from '@google-cloud/firestore';
import {sendRequestCurrency} from '@functions/repositories/luxuryRepository';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('currencies');

/**
 *
 * @returns {Promise<void>}
 */
export async function addCurrencies() {
  try {
    const currencies = await sendRequestCurrency({base_currency: 'EUR'});
    await collection.add({
      data: currencies,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return {success: true};
  } catch (e) {
    console.log(e);
  }
  return {success: false};
}

/**
 *
 * @returns {Promise<void>}
 */

export async function updateCurrencies() {
  const currencies = await getCurrencies();
  if (!currencies) {
    return addCurrencies();
  }
  const newCurrencies = await sendRequestCurrency({base_currency: 'EUR'});
  await collection
    .doc(currencies.id)
    .update({data: newCurrencies, updatedAt: FieldValue.serverTimestamp()});
}

/**
 *
 * @returns {Promise<{[p: string]: FirebaseFirestore.DocumentFieldValue, uuid: string}|null>}
 */
export async function getCurrencies() {
  const docs = await collection.limit(1).get();
  if (docs.empty) {
    return null;
  }
  const doc = docs.docs[0];
  return {uuid: doc.id, ...doc.data()};
}
