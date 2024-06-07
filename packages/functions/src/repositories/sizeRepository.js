import {FieldValue, Firestore} from '@google-cloud/firestore';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('sizes');

/**
 *
 * @returns {Promise<void>}
 */
export async function importSizes(sizes) {
  try {
    const docs = await collection.get();
    if (docs.empty) {
      await collection.add({sizes});
    } else {
      const doc = docs.docs[0];
      const newSizes = [...new Set([...sizes, ...doc.data().sizes])];
      await doc.ref.update({sizes: newSizes});
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @returns {Promise<any|*[]>}
 */

export async function getSizes() {
  try {
    const docs = await collection.get();
    if (!docs.empty) {
      return docs.docs[0].data().sizes;
    }
  } catch (e) {
    console.error(e);
  }

  return [];
}
