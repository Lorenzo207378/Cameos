import { BaseRepository, STORES } from '../BaseRepository.js';
import { personBackend as defaultPersonBackend } from '../../backend/person/PersonBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Person } from '../../models/Person.js';

/**
 * PersonRepository
 * Manages Actor/Person profiles and filmographies in IndexedDB with Network-First strategy
 * and automatic fallback to local storage when offline or on API errors.
 */
export class PersonRepository extends BaseRepository {
  /**
   * @param {import('../../backend/person/PersonBackend.js').PersonBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultPersonBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
  }

  /**
   * Search people by name (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [options={}]
   * @param {string} [options.query='']
   * @param {number} [options.page=1]
   * @param {string} [options.language]
   * @param {boolean} [options.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Person> }>}
   */
  async searchPeople({ query = '', page = 1, language = undefined, force = false } = {}) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return { page: 1, total_pages: 0, total_results: 0, results: [] };
    const lang = this.normalizeLanguage(language);
    const queryKey = this.buildCacheKey('search_people', { query: trimmedQuery.toLowerCase(), page, language: lang });
    return this._executePaginatedQuery(queryKey,
      () => this.backend.searchPeople({ query: trimmedQuery, page, language: lang }), Person, { force });
  }

  /**
   * @param {number|string} personId
   * @param {string} [language]
   * @returns {string}
   */
  _personKey(personId, language) {
    return `person:${Number(personId)}:${this.normalizeLanguage(language)}`;
  }

  /**
   * Get person details + TV & Movie credits (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Person>}
   */
  async getPersonProfile(params = {}) {
    const { personId, language, force = false } = params;
    if (!personId) throw new Error('personId is required');

    return this._executeEntityDetails(Person, {
      storeName: STORES.PERSONS,
      entityKey: this._personKey(personId, language),
      id: personId,
      language,
      isComplete: params.appendCredits !== false,
      force,
      fetchRemote: () => this.backend.getPersonProfile(params)
    });
  }

  /**
   * Get person filmography sorted by popularity or release date (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.mediaType='all']
   * @param {string} [params.sortBy='popularity']
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ profile: Person, cast: Array<Object>, crew: Array<Object> }>}
   */
  async getPersonFilmography(params = {}) {
    const { personId, mediaType = 'all', sortBy = 'popularity', language, force = false } = params;
    if (!personId) throw new Error('personId is required');

    const lang = this.normalizeLanguage(language);
    const queryKey = this.buildCacheKey('person_filmography', {
      personId: Number(personId),
      mediaType,
      sortBy,
      language: lang
    });

    return this.executeCatalogQuery({
      storeName: STORES.QUERIES,
      force,
      context: queryKey,
      fetchRemote: () => this.backend.getPersonFilmography(params),
      saveLocal: async (freshData) => {
        const now = Date.now();
        await this.storage.put(STORES.QUERIES, { cacheKey: queryKey, cachedAt: now, data: freshData });
        if (freshData.profile?.id) {
          await this.storage.put(STORES.PERSONS, {
            cacheKey: this._personKey(freshData.profile.id, lang),
            id: Number(freshData.profile.id),
            language: lang,
            isComplete: true,
            cachedAt: now,
            data: freshData.profile
          });
        }
      },
      getLocal: async (prefetchedRecord) => {
        const cached = prefetchedRecord !== undefined
          ? prefetchedRecord
          : await this.storage.get(STORES.QUERIES, queryKey);
        if (!cached?.data) return null;
        return {
          profile: new Person(cached.data.profile),
          cast: cached.data.cast || [],
          crew: cached.data.crew || []
        };
      }
    });
  }
}

export const personRepository = new PersonRepository();
export default PersonRepository;
