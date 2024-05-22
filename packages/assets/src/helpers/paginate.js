/**
 *
 * @param n
 * @returns {number[][]|*[]}
 */
export function generateArrays(n) {
  if (n === 0) {
    return [];
  }

  if (n === 1) {
    return [[1]];
  }

  const result = [];
  let step = 1;
  do {
    const chunk = [step];
    for (let i = 1; i < 4; i++) {
      step++;
      chunk.push(step);
      if (step >= n) {
        break;
      }
    }
    result.push(chunk);
  } while (step < n);

  return result;
}

/**
 *
 * @param number
 * @param index
 * @returns {{isPage: boolean, showDotPage: boolean}}
 */
export function isExistPage(number, index, pageArrays) {
  const pages = pageArrays.filter(pageArray => pageArray.includes(number));
  let showDotPage = false;
  let isPage = false;
  if (pages.length) {
    const page = pages[pages.length - 1];
    isPage = page.includes(index + 1);
    showDotPage = index === page[0] - 2 || index === page[page.length - 1];
  }
  return {isPage, showDotPage};
}

/**
 *
 * @param key
 * @param value
 * @param isReFetch
 * @param searchParams
 * @param setSearchParams
 * @param handleReFetch
 */
export function handleChangeSearch({
  key,
  value,
  isReFetch = true,
  searchParams,
  setSearchParams,
  handleReFetch
}) {
  const toUpdate = (() => {
    const updated = {...searchParams, [key]: value};
    switch (key) {
      case 'before':
        return {...updated, after: '', page: updated.page - 1};
      case 'after':
        return {...updated, before: '', page: updated.page + 1};
      case 'page':
        return {...updated, page: value, before: '', after: ''};
      case 'limit':
        return {...updated, limit: value};
    }
  })();
  setSearchParams(toUpdate);
  if (isReFetch) handleReFetch({...toUpdate, [key]: value});
}
