import Cameo from './Cameo.js';

/**
 * Person
 * Domain model representing an actor, creator, or artist.
 */
export default class Person {
  /**
   * @param {Record<string, any>} [data={}]
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
    this._profileUrl = data.profileUrl || { it: null, en: null };
    this.imdbId = data.imdbId || data.imdb_id || null;
    this.homepage = data.homepage || '';

    this.tvCredits = data.tvCredits || data.tv_credits || null;
    this.movieCredits = data.movieCredits || data.movie_credits || null;

    // Map career cameos into Cameo instances
    this.careerCameos = (data.careerCameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }

  /**
   * Avatar profile URL { it, en } or string
   * @returns {{ it: string, en: string } | string}
   */
  get profileUrl() {
    return this._profileUrl;
  }

  /**
   * Retrieve avatar image URL with fallback
   * @param {'it'|'en'} [lang='it']
   * @returns {string}
   */
  getProfileUrl(lang = 'it') {
    if (typeof this._profileUrl === 'string') return this._profileUrl;
    return this._profileUrl?.[lang] || this._profileUrl?.it || this._profileUrl?.en || 'https://via.placeholder.com/185x278?text=Nessuna+Foto';
  }

  /**
   * Check if person is alive
   * @returns {boolean}
   */
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
