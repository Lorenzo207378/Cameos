import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage } from './utils/modelUtils.js';

/**
 * Person
 * Domain model representing an actor, creator, or artist.
 */
export class Person {
  /**
   * @param {Object<string, *>} [data={}]
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
    this.profileUrl = normalizeLanguagesImage(data.profileUrl || (data.profile_path ? `https://image.tmdb.org/t/p/w185${data.profile_path}` : null));
    this.imdbId = data.imdbId || data.imdb_id || null;
    this.homepage = data.homepage || '';

    this.tvCredits = data.tvCredits || data.tv_credits || null;
    this.movieCredits = data.movieCredits || data.movie_credits || null;
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
