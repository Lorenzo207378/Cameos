import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeDualImage, resolveLocalizedImage } from './modelUtils.js';

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
    this.alsoKnownAs = data.alsoKnownAs || data.also_known_as || [];
    this.biography = data.biography || '';
    this.birthday = data.birthday || null;
    this.deathday = data.deathday || null;
    this.placeOfBirth = data.placeOfBirth || data.place_of_birth || null;
    this.gender = Number(data.gender) || 0;
    this.knownForDepartment = data.knownForDepartment || data.known_for_department || '';
    this.popularity = Number(data.popularity) || 0;
    this._profileUrl = normalizeDualImage(data.profileUrl, data._profileUrl);
    this.imdbId = data.imdbId || data.imdb_id || null;
    this.homepage = data.homepage || '';

    this.tvCredits = data.tvCredits || data.tv_credits || null;
    this.movieCredits = data.movieCredits || data.movie_credits || null;
    this.careerCameos = (data.careerCameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }

  /** @returns {Object|string} */
  get profileUrl() {
    return this._profileUrl;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getProfileUrl(lang = 'it') {
    return resolveLocalizedImage(this._profileUrl, lang, IMAGE_PLACEHOLDERS.PROFILE);
  }

  /** @returns {boolean} */
  get isAlive() {
    return this.deathday === null;
  }

  get place_of_birth() {
    return this.placeOfBirth;
  }

  get known_for_department() {
    return this.knownForDepartment;
  }

  get also_known_as() {
    return this.alsoKnownAs;
  }

  get imdb_id() {
    return this.imdbId;
  }

  get tv_credits() {
    return this.tvCredits;
  }

  get movie_credits() {
    return this.movieCredits;
  }
}

export default Person;
