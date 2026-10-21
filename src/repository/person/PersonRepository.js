import { BaseRepository, STORES } from '../BaseRepository.js';
import { personBackend as defaultPersonBackend } from '../../backend/person/PersonBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Person } from '../../models/index.js';

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
   * @param {number|string} personId
   * @param {string} [language]
   * @returns {string}
   */
  _personKey(personId, language) {
    return `person:${Number(personId)}:${this.normalizeLanguage(language)}`;
  }

  /**
   * Get person details + TV & Movie credits (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Person>}
   */
  async getPersonProfile(params = {}) {
    const { personId, language } = params;
    if (!personId) throw new Error('personId is required');

    const lang = this.normalizeLanguage(language);
    const cacheKey = this._personKey(personId, lang);

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getPersonProfile(params),
      saveLocal: async (freshPerson) => {
        await this.storage.put(STORES.PERSONS, {
          cacheKey,
          id: Number(personId),
          language: lang,
          data: freshPerson
        });
      },
      getLocal: () => this._getEntityWithIndexFallback(STORES.PERSONS, cacheKey, 'id', Number(personId), Person)
    });
  }

  /**
   * Get person filmography sorted by popularity or release date (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.mediaType='all']
   * @param {string} [params.sortBy='popularity']
   * @param {string} [params.language]
   * @returns {Promise<{ profile: Person, cast: Array<Object>, crew: Array<Object> }>}
   */
  async getPersonFilmography(params = {}) {
    const { personId, mediaType = 'all', sortBy = 'popularity', language } = params;
    if (!personId) throw new Error('personId is required');

    const lang = this.normalizeLanguage(language);
    const queryKey = this.buildCacheKey('person_filmography', {
      personId: Number(personId),
      mediaType,
      sortBy,
      language: lang
    });

    return this.executeWithFallback({
      context: queryKey,
      fetchRemote: () => this.backend.getPersonFilmography(params),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.QUERIES, { cacheKey: queryKey, data: freshData });
        if (freshData.profile?.id) {
          await this.storage.put(STORES.PERSONS, {
            cacheKey: this._personKey(freshData.profile.id, lang),
            id: Number(freshData.profile.id),
            language: lang,
            data: freshData.profile
          });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.QUERIES, queryKey);
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
