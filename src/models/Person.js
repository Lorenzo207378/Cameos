import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage } from './utils/index.js';

/**
 * Person
 * Domain model representing an actor, creator, or artist.
 */
export class Person {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.name = data.name || '';
    this.alsoKnownAs = data.alsoKnownAs || [];
    this.biography = data.biography || '';
    this.birthday = data.birthday || null;
    this.deathday = data.deathday || null;
    this.placeOfBirth = data.placeOfBirth || null;
    this.gender = Number(data.gender) || 0;
    this.knownForDepartment = data.knownForDepartment || '';
    this.popularity = Number(data.popularity) || 0;
    this.profileUrl = normalizeLanguagesImage(data.profileUrl);
    this.imdbId = data.imdbId || null;
    this.homepage = data.homepage || '';

    this.tvCredits = data.tvCredits || null;
    this.movieCredits = data.movieCredits || null;
    this.careerCameos = (data.careerCameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getProfileUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this.profileUrl, lang, IMAGE_PLACEHOLDERS.PROFILE);
  }

  /** @returns {boolean} */
  get isAlive() {
    return this.deathday === null;
  }
}

export default Person;
