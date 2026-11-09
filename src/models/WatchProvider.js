/**
 * WatchProvider
 * Domain model representing a streaming/watch provider (e.g. Netflix, Prime Video, Apple TV).
 * Encapsulates provider identification, name normalization, exclusion rules, and logo resolution.
 */
export class WatchProvider {
  /**
   * @param {Object<string, *>} [data={}]
   * @param {number|string|null} [data.provider_id]
   * @param {number|string|null} [data.providerId]
   * @param {number|string|null} [data.id]
   * @param {string|null} [data.provider_name]
   * @param {string|null} [data.providerName]
   * @param {string|null} [data.name]
   * @param {string|null} [data.logo_path]
   * @param {string|null} [data.logoPath]
   * @param {string|Object<string, string>|null} [data.logoUrl]
   * @param {string|null} [data.category]
   */
  constructor(data = {}) {
    this.providerId = data.provider_id ?? data.providerId ?? data.id ?? null;
    this.providerName = data.provider_name ?? data.providerName ?? data.name ?? '';
    this.logoPath = data.logo_path ?? data.logoPath ?? null;
    this.logoUrl = data.logoUrl ?? null;
    this.category = data.category ?? null;
  }

  /**
   * Resolves the visual display name for a provider (e.g. "Amazon Video" -> "Amazon Video Store").
   * @returns {string}
   */
  get displayName() {
    const name = this.providerName;
    if (!name) return '';
    if (/^amazon\s+video$/i.test(name.trim())) {
      return 'Amazon Video Store';
    }
    return name;
  }

  /**
   * Resolves the logo URL for a streaming provider item.
   * Supports enriched multi-language objects, direct URLs, or TMDb relative paths.
   * @param {string} [langKey='it']
   * @returns {string|null}
   */
  getLogoUrl(langKey = 'it') {
    const logoUrl = this.logoUrl;
    if (logoUrl) {
      if (typeof logoUrl === 'object') {
        return logoUrl[langKey] || logoUrl.it || logoUrl.en || Object.values(logoUrl)[0] || null;
      }
      return logoUrl;
    }
    const logoPath = this.logoPath;
    if (logoPath) {
      return logoPath.startsWith('http')
        ? logoPath
        : `https://image.tmdb.org/t/p/w185${logoPath}`;
    }
    return null;
  }

  /**
   * Checks whether a provider entry should be excluded (e.g. Amazon "with Ads", HBO Max Amazon Channel).
   * @returns {boolean}
   */
  get isExcluded() {
    const name = this.providerName;
    if (!name) return false;
    const isAmazonWithAdsTier = /amazon|prime/i.test(name) && /with\s+ads|con\s+pubblicit/i.test(name);
    const isHboAmazonChannel = /hbo.*amazon\s+channel/i.test(name);
    return isAmazonWithAdsTier || isHboAmazonChannel;
  }
}

export default WatchProvider;
