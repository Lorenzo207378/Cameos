// Catalog reads do not extend this lifetime. Only a successful fetch refreshes it.
export const CATALOG_CACHE_TTL_MS = 300_000;

export function isCatalogCacheFresh(updatedAt) {
  const age = Date.now() - updatedAt;
  return Number.isFinite(updatedAt) && age >= 0 && age < CATALOG_CACHE_TTL_MS;
}
