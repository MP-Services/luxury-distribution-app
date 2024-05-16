import {chunk} from '@avada/utils';
import formatDateFields from '../helpers/formatDateFields';

/**
 * @param {Firestore} firestore
 * @param {CollectionReference} collection
 * @param {*[]} createData
 * @return {Promise<void>}
 */
export async function batchCreate(firestore, collection, createData) {
  const batches = [];
  const dataChunks = chunk(createData, 500);
  dataChunks.forEach(dataChunk => {
    const batch = firestore.batch();
    dataChunk.forEach(data => {
      batch.create(collection.doc(), data);
    });
    batches.push(batch);
  });
  const batchChunks = chunk(batches, 50);
  for (const batchChunk of batchChunks) {
    await Promise.all(batchChunk.map(batch => batch.commit()));
  }
}

/**
 * @param {Firestore} firestore
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} docs
 * @param {*} updateData
 * @return {Promise<void>}
 */
export async function batchUpdate(firestore, docs, updateData) {
  const batches = [];
  const docChunks = chunk(docs, 500);
  docChunks.forEach(docChunk => {
    const batch = firestore.batch();
    docChunk.forEach(doc => {
      batch.update(doc.ref, updateData);
    });
    batches.push(batch);
  });
  const batchChunks = chunk(batches, 50);
  for (const batchChunk of batchChunks) {
    await Promise.all(batchChunk.map(batch => batch.commit()));
  }
}

/**
 * @param {Firestore} firestore
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} docs
 * @return {Promise<void>}
 */
export async function batchDelete(firestore, docs) {
  const batches = [];
  const docChunks = chunk(docs, 500);
  docChunks.forEach(docChunk => {
    const batch = firestore.batch();
    docChunk.forEach(doc => {
      batch.delete(doc.ref);
    });
    batches.push(batch);
  });
  await Promise.all(batches.map(batch => batch.commit()));
}

/**
 * @param {Query} queriedRef
 * @param {CollectionReference} collection
 * @param query
 * @param defaultLimit
 * @param pickedFields
 * @returns {Promise<{data: *[], count: number, pageInfo: {hasNext: boolean, hasPre: boolean}}>}
 */

export async function paginateQuery({
  queriedRef,
  collection,
  query,
  defaultLimit = query.limit,
  pickedFields = []
}) {
  const limit = parseInt(defaultLimit || '20');
  let total;
  let totalPage;
  if (query.hasCount) {
    total = (await queriedRef.count().get()).data().count;
    totalPage = Math.ceil(total / limit);
  }

  const getAll = query.All || !limit;
  let hasPre = false;
  let hasNext = false;

  if (pickedFields.length) queriedRef = queriedRef.select(...pickedFields);
  if (!getAll) {
    if (query.after) {
      const after = await collection.doc(query.after).get();
      queriedRef = queriedRef.startAfter(after);
      hasPre = true;
    }
    if (query.before) {
      const before = await collection.doc(query.before).get();
      queriedRef = queriedRef.endBefore(before).limitToLast(limit);
      hasNext = true;
    } else {
      queriedRef = queriedRef.limit(limit);
    }
  }

  const docs = await queriedRef.get();
  const data = docs.docs.map(doc => prepareDoc({doc}));

  if (!getAll && (!hasPre || !hasNext)) {
    const [resultHasPre, resultHasNext] = await Promise.all([
      verifyHasPre(docs, queriedRef),
      verifyHasNext(docs, queriedRef)
    ]);
    if (!hasPre) {
      hasPre = resultHasPre;
    }
    if (!hasNext) {
      hasNext = resultHasNext;
    }
  }

  const resp = {data, count: docs.size, total, pageInfo: {hasPre, hasNext, totalPage}};
  return query.withDocs ? {...resp, docs} : resp;
}

/**
 * @param {DocumentSnapshot|*} doc
 * @param {*} data
 * @returns {*}
 */
export function prepareDoc({doc, data = {}}) {
  if (doc) {
    data = typeof doc.data() === 'undefined' ? {} : {id: doc.id, ...doc.data()};
  }

  const {shop, ...formattedData} = formatDateFields(data);

  return formattedData;
}

/**
 *
 * @param objectDocs
 * @param queriedRef
 * @returns {Promise<boolean>}
 */
export async function verifyHasPre(objectDocs, queriedRef) {
  if (objectDocs.empty) {
    return false;
  }

  const preRef = await queriedRef
    .endBefore(objectDocs.docs[0])
    .limit(1)
    .get();

  return !preRef.empty;
}

/**
 *
 * @param objectDocs
 * @param queriedRef
 * @returns {Promise<boolean>}
 */
export async function verifyHasNext(objectDocs, queriedRef) {
  if (objectDocs.empty) {
    return false;
  }

  const nextRef = await queriedRef
    .startAfter(objectDocs.docs[objectDocs.size - 1])
    .limitToLast(1)
    .get();

  return !nextRef.empty;
}

/**
 *
 * @param sortType
 * @returns {{sortField: *, direction: *}}
 */
export function getOrderBy(sortType) {
  const [sortField, direction] = sortType ? sortType.split(' ') : ['updatedAt', 'desc'];

  return {sortField, direction};
}
