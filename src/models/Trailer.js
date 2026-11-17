const VIDEO_URL_BUILDERS = Object.freeze({
  YouTube: (key) => ({
    directUrl: `https://www.youtube.com/watch?v=${key}`,
    embedUrl: `https://www.youtube.com/embed/${key}?rel=0`
  }),
  Vimeo: (key) => ({
    directUrl: `https://vimeo.com/${key}`,
    embedUrl: `https://player.vimeo.com/video/${key}`
  })
});

export const SUPPORTED_TRAILER_SITES = Object.freeze(Object.keys(VIDEO_URL_BUILDERS));
export const SUPPORTED_TRAILER_TYPES = Object.freeze(['Trailer', 'Teaser']);

/**
 * Trailer
 * Domain sub-object representing a formatted Trailer or Teaser video.
 */
export class Trailer {
  /**
   * @param {Object} [data={}]
   * @param {string|null} [data.id]
   * @param {string} [data.key]
   * @param {string} [data.name]
   * @param {string} [data.site]
   * @param {string} [data.type]
   * @param {boolean} [data.official=false]
   * @param {string|null} [data.language]
   * @param {string|null} [data.iso_639_1]
   * @param {string|null} [data.publishedAt]
   * @param {string|null} [data.published_at]
   * @param {string} [data.directUrl]
   * @param {string} [data.embedUrl]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.key = String(data.key || '').trim();
    this.name = data.name || '';
    this.site = data.site || '';
    this.type = data.type || 'Trailer';
    this.official = Boolean(data.official);
    this.language = data.language || data.iso_639_1 || null;
    this.publishedAt = data.publishedAt || data.published_at || null;

    const urls = VIDEO_URL_BUILDERS[this.site]?.(this.key);
    this.directUrl = data.directUrl || urls?.directUrl || '';
    this.embedUrl = data.embedUrl || urls?.embedUrl || '';
  }
}

export default Trailer;
