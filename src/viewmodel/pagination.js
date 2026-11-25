/** Preserve the identity policy used when appending media and cameo lists. */
function defaultItemKey(item) {
  return item.mediaId
    ? `${item.mediaType || 'movie'}_${item.mediaId}_${item.id ?? ''}_${item.character || item.name || ''}`
    : (item.id ?? `${item.title || item.name}`);
}

/** Resolve legacy direct and grouped pagination state into one storage location. */
export function resolvePaginationTarget(state, categoryKey, paginationProp, paginationMapProp) {
  const mapProperty = paginationProp ? null : paginationMapProp || (state.categoryPagination ? 'categoryPagination' : null);
  const property = paginationProp || mapProperty || `${categoryKey}Pagination`;
  const current = mapProperty ? state[property]?.[categoryKey] : state[property];
  return {
    property,
    grouped: Boolean(mapProperty),
    current: current || { page: 1, totalPages: 1, hasMore: true, loadingMore: false }
  };
}

/** Preserve explicit page numbers, multi-page initial loads and incremental appends. */
export function requestedPages(params, currentPagination) {
  return params.append
    ? [params.page || (currentPagination.page || 1) + 1]
    : Array.from({ length: Math.max(1, params.initialPages || 1) }, (_, index) => index + (params.page || 1));
}

/** Build a shallow state patch updating a single direct or grouped pagination entry. */
export function buildPaginationPatch(state, target, categoryKey, pagination) {
  return target.grouped
    ? { [target.property]: { ...state[target.property], [categoryKey]: pagination } }
    : { [target.property]: pagination };
}

/**
 * Resolve target pagination state, retention policy and page list for a catalog pagination load.
 * @param {Record<string, any>} state
 * @param {Object} options
 * @param {string} options.categoryKey
 * @param {string} options.stateProp
 * @param {string} [options.paginationProp]
 * @param {string} [options.paginationMapProp]
 * @param {Record<string, any>} [options.params={}]
 * @param {string} options.defaultLanguage
 */
export function planPaginationLoad(state, {
  categoryKey,
  stateProp,
  paginationProp = undefined,
  paginationMapProp = undefined,
  params = {},
  defaultLanguage
}) {
  const isAppend = Boolean(params.append);
  const target = resolvePaginationTarget(state, categoryKey, paginationProp, paginationMapProp);
  const currentPagination = target.current;
  const language = params.language || defaultLanguage;
  // Revisiting a catalog must not discard pages already loaded in the same language.
  const sameLanguageRetained = Boolean(params.retainPages && currentPagination.language === language);
  const initialPages = sameLanguageRetained
    ? Math.max(params.initialPages || 1, currentPagination.page || 1)
    : params.initialPages;
  const hasRetainedItems = sameLanguageRetained && Array.isArray(state[stateProp]) && state[stateProp].length > 0;
  const pages = requestedPages({ ...params, initialPages }, currentPagination);

  return { isAppend, target, currentPagination, language, hasRetainedItems, pages };
}

/** Merge category entries at commit time without overwriting concurrent category loads. */
export function mergeCategoryPatch(state, statePatch, categoryKey, mapProperties) {
  const patch = { ...statePatch };
  for (const property of mapProperties.filter(Boolean)) {
    patch[property] = { ...state[property], [categoryKey]: statePatch[property][categoryKey] };
  }
  return patch;
}

/** Combine fetched pages without changing ordering, replacement or completion rules. */
export function combinePages(responses, pages, currentPagination, existing, filterFn, keyFn = defaultItemKey) {
  const raw = responses.flatMap((response) => response?.results || (Array.isArray(response) ? response : []));
  const filtered = filterFn ? raw.filter((item) => filterFn(item)) : raw;
  const items = Array.from(new Map([...existing, ...filtered].map((item) => [keyFn(item), item])).values());
  const totals = responses.map((response) => response?.total_pages ?? response?.totalPages).filter((total) => total !== null && total !== undefined);
  const totalPages = totals.length ? Math.max(...totals) : currentPagination.totalPages || 1;
  const page = pages[pages.length - 1] || 1;
  const lastResponse = responses[responses.length - 1];
  const hasMore = lastResponse?.hasMore !== undefined ? Boolean(lastResponse.hasMore) : page < totalPages;
  return { items, pagination: { page, totalPages, hasMore, loadingMore: false } };
}
