/**
 * Object store names used in the Cameos IndexedDB database.
 */
export const STORES = Object.freeze({
  SERIES: 'series',
  SEASONS: 'seasons',
  EPISODES: 'episodes',
  MOVIES: 'movies',
  PERSONS: 'persons',
  CAMEOS: 'cameos',
  QUERIES: 'queries',
  USERS: 'users',
  FRIEND_REQUESTS: 'friend_requests',
  NOTIFICATIONS: 'notifications',
  REVIEWS: 'reviews',
  MEDIA_STATS: 'media_stats'
});

/**
 * Declarative schema: every store uses `cacheKey` as primary key and exposes the listed secondary indexes
 * (`indexName: keyPath`, where an array keyPath defines a compound index).
 * The same table drives both the native `onupgradeneeded` setup and the in-memory fallback lookups.
 */
const STORE_INDEXES = Object.freeze({
  [STORES.SERIES]: { id: 'id', language: 'language' },
  [STORES.SEASONS]: { seriesId: 'seriesId', seasonKey: ['seriesId', 'seasonNumber'] },
  [STORES.EPISODES]: { seriesId: 'seriesId', episodeKey: ['seriesId', 'seasonNumber', 'episodeNumber'] },
  [STORES.MOVIES]: { id: 'id', language: 'language' },
  [STORES.PERSONS]: { id: 'id', language: 'language' },
  [STORES.CAMEOS]: {},
  [STORES.QUERIES]: {},
  [STORES.USERS]: { uid: 'uid', username: 'username' },
  [STORES.FRIEND_REQUESTS]: { fromUid: 'fromUid', toUid: 'toUid' },
  [STORES.NOTIFICATIONS]: { recipientUid: 'recipientUid' },
  [STORES.REVIEWS]: { targetKey: 'targetKey', uid: 'uid' },
  [STORES.MEDIA_STATS]: { targetKey: 'targetKey' }
});

const DEFAULT_DB_NAME = 'cameos_pwa_db';
const DEFAULT_DB_VERSION = 3;

/**
 * IndexedDBService
 * Standardized local storage manager built on W3C IndexedDB API for PWA offline persistence.
 * Automatically falls back to an in-memory store map only when executed in headless environments
 * where globalThis.indexedDB is not provided.
 */
export class IndexedDBService {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.dbName]
   * @param {number} [options.dbVersion]
   * @param {IDBFactory|null} [options.idbFactory]
   */
  constructor({ dbName = DEFAULT_DB_NAME, dbVersion = DEFAULT_DB_VERSION, idbFactory = null } = {}) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this._customIdbFactory = idbFactory;
    /** @type {IDBDatabase|null} */
    this._db = null;
    /** @type {Promise<IDBDatabase|null>|null} */
    this._openPromise = null;
    /** @type {Map<string, Map<string, Object>>} */
    this._memoryFallback = new Map(Object.values(STORES).map((store) => [store, new Map()]));
  }

  /**
   * Resolve active IDBFactory (browser globalThis.indexedDB or injected factory)
   * @returns {IDBFactory|null}
   */
  get idbFactory() {
    return this._customIdbFactory || (typeof globalThis !== 'undefined' && globalThis.indexedDB ? globalThis.indexedDB : null);
  }

  /**
   * Check whether native IndexedDB is active
   * @returns {boolean}
   */
  get isNativeIndexedDB() {
    return Boolean(this.idbFactory);
  }

  /**
   * Deep-clone plain data before persisting so class prototypes do not interfere
   * @param {*} value
   * @returns {*}
   */
  _cloneRecord(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Resolve an in-memory store (headless fallback)
   * @param {string} storeName
   * @returns {Map<string, Object>}
   */
  _memoryStore(storeName) {
    const store = this._memoryFallback.get(storeName);
    if (!store) throw new Error(`Unknown store: ${storeName}`);
    return store;
  }

  /**
   * Run a read request and resolve with its result
   * @param {IDBDatabase} db
   * @param {string} storeName
   * @param {(store: IDBObjectStore) => IDBRequest} run
   * @param {string} label
   * @returns {Promise<*>}
   */
  _read(db, storeName, run, label) {
    return new Promise((resolve, reject) => {
      const request = run(db.transaction(storeName, 'readonly').objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(`IndexedDB ${label} error in ${storeName}`));
    });
  }

  /**
   * Run write requests and resolve only once the transaction is committed (durable)
   * @param {IDBDatabase} db
   * @param {string} storeName
   * @param {(store: IDBObjectStore) => void} run
   * @param {string} label
   * @returns {Promise<void>}
   */
  _write(db, storeName, run, label) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      run(tx.objectStore(storeName));
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error || new Error(`IndexedDB ${label} error in ${storeName}`));
    });
  }

  /**
   * Open and initialize IndexedDB database and object stores
   * @returns {Promise<IDBDatabase|null>}
   */
  async open() {
    if (this._db) return this._db;
    if (this._openPromise) return this._openPromise;

    const factory = this.idbFactory;
    if (!factory) {
      return null;
    }

    this._openPromise = new Promise((resolve, reject) => {
      const request = factory.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;

        for (const [storeName, indexes] of Object.entries(STORE_INDEXES)) {
          if (db.objectStoreNames.contains(storeName)) continue;
          const store = db.createObjectStore(storeName, { keyPath: 'cacheKey' });
          for (const [indexName, keyPath] of Object.entries(indexes)) {
            store.createIndex(indexName, keyPath, { unique: false });
          }
        }
      };

      request.onsuccess = () => {
        this._db = request.result;
        this._db.onversionchange = () => {
          this._db?.close();
          this._db = null;
          this._openPromise = null;
        };
        resolve(this._db);
      };

      request.onerror = () => {
        this._openPromise = null;
        reject(request.error || new Error('IndexedDB open failed'));
      };
    });

    return this._openPromise;
  }

  /**
   * Insert or overwrite a single record in an object store
   * @param {string} storeName
   * @param {Object} record - Must include `cacheKey`
   * @returns {Promise<Object>}
   */
  async put(storeName, record) {
    if (!record || !record.cacheKey) {
      throw new Error(`IndexedDBService.put requires a record with cacheKey in store "${storeName}"`);
    }

    const payload = { ...this._cloneRecord(record), updatedAt: Date.now() };

    const db = await this.open();
    if (!db) {
      this._memoryStore(storeName).set(payload.cacheKey, payload);
    } else {
      await this._write(db, storeName, (store) => store.put(payload), 'put');
    }
    return payload;
  }

  /**
   * Insert or overwrite multiple records within a single transaction
   * @param {string} storeName
   * @param {Array<Object>} [records=[]]
   * @returns {Promise<void>}
   */
  async putMany(storeName, records = []) {
    const now = Date.now();
    const payloads = records
      .filter((record) => record?.cacheKey)
      .map((record) => ({ ...this._cloneRecord(record), updatedAt: now }));
    if (payloads.length === 0) return;

    const db = await this.open();
    if (!db) {
      const store = this._memoryStore(storeName);
      payloads.forEach((payload) => store.set(payload.cacheKey, payload));
      return;
    }

    await this._write(db, storeName, (store) => payloads.forEach((payload) => store.put(payload)), 'putMany');
  }

  /**
   * Retrieve a single record by cacheKey
   * @param {string} storeName
   * @param {string} cacheKey
   * @returns {Promise<Object|null>}
   */
  async get(storeName, cacheKey) {
    if (!cacheKey) return null;

    const db = await this.open();
    if (!db) {
      const item = this._memoryStore(storeName).get(cacheKey);
      return item ? this._cloneRecord(item) : null;
    }

    const result = await this._read(db, storeName, (store) => store.get(cacheKey), 'get');
    return result ?? null;
  }

  /**
   * Retrieve all records matching an index key
   * @param {string} storeName
   * @param {string} indexName
   * @param {*} value - Single value, or array of values for compound indexes
   * @returns {Promise<Array<Object>>}
   */
  async getByIndex(storeName, indexName, value) {
    const db = await this.open();
    if (!db) {
      const keyPath = STORE_INDEXES[storeName]?.[indexName] ?? indexName;
      const matches = (item) =>
        Array.isArray(keyPath) ? keyPath.every((key, i) => item[key] === value[i]) : item[keyPath] === value;

      return Array.from(this._memoryStore(storeName).values())
        .filter(matches)
        .map((item) => this._cloneRecord(item));
    }

    const result = await this._read(db, storeName, (store) => store.index(indexName).getAll(value), `getByIndex(${indexName})`);
    return result || [];
  }

  /**
   * Retrieve all records in a store
   * @param {string} storeName
   * @returns {Promise<Array<Object>>}
   */
  async getAll(storeName) {
    const db = await this.open();
    if (!db) {
      return Array.from(this._memoryStore(storeName).values()).map((item) => this._cloneRecord(item));
    }

    const result = await this._read(db, storeName, (store) => store.getAll(), 'getAll');
    return result || [];
  }

  /**
   * Delete a single record by cacheKey
   * @param {string} storeName
   * @param {string} cacheKey
   * @returns {Promise<void>}
   */
  async delete(storeName, cacheKey) {
    const db = await this.open();
    if (!db) {
      this._memoryStore(storeName).delete(cacheKey);
      return;
    }

    await this._write(db, storeName, (store) => store.delete(cacheKey), 'delete');
  }

  /**
   * Clear all entries in a specific store
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    const db = await this.open();
    if (!db) {
      this._memoryStore(storeName).clear();
      return;
    }

    await this._write(db, storeName, (store) => store.clear(), 'clear');
  }

  /**
   * Clear all object stores in the database
   * @returns {Promise<void>}
   */
  async clearAll() {
    for (const storeName of Object.values(STORES)) {
      await this.clear(storeName);
    }
  }

  /**
   * Close active database connection
   */
  close() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._openPromise = null;
    }
  }
}

export const indexedDBService = new IndexedDBService();
export default IndexedDBService;
