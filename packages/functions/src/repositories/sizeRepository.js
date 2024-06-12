import {Firestore} from '@google-cloud/firestore';

const firestore = new Firestore();
/** @type CollectionReference */
const collection = firestore.collection('sizes');

/**
 *
 * @returns {Promise<void>}
 */
export async function importSizes(shopifyId, sizes) {
  try {
    const docs = await collection.where('shopifyId', '==', shopifyId).get();
    if (docs.empty) {
      await collection.add({shopifyId, sizes});
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

export async function getSizes(shopifyId) {
  try {
    const docs = await collection.where('shopifyId', '==', shopifyId).get();
    if (!docs.empty) {
      return docs.docs[0].data().sizes;
    }
  } catch (e) {
    console.error(e);
  }

  return [];
}

/**
 *
 * @param shopId
 * @returns {Promise<((precondition?: FirebaseFirestore.Precondition) => Promise<FirebaseFirestore.WriteResult>)|null>}
 */
export async function deleteSizeTempWhenUninstall(shopId) {
  const docs = await collection.where('shopifyId', '==', shopId).get();
  if (docs.empty) {
    return null;
  }

  return docs.docs[0].ref.delete();
}
