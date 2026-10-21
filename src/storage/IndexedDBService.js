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
  USERS: 'users'
});

const DEFAULT_DB_NAME = 'cameos_pwa_db';
const DEFAULT_DB_VERSION = 2;

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

        if (!db.objectStoreNames.contains(STORES.SERIES)) {
          const store = db.createObjectStore(STORES.SERIES, { keyPath: 'cacheKey' });
          store.createIndex('id', 'id', { unique: false });
          store.createIndex('language', 'language', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SEASONS)) {
          const store = db.createObjectStore(STORES.SEASONS, { keyPath: 'cacheKey' });
          store.createIndex('seriesId', 'seriesId', { unique: false });
          store.createIndex('seasonKey', ['seriesId', 'seasonNumber'], { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.EPISODES)) {
          const store = db.createObjectStore(STORES.EPISODES, { keyPath: 'cacheKey' });
          store.createIndex('seriesId', 'seriesId', { unique: false });
          store.createIndex('episodeKey', ['seriesId', 'seasonNumber', 'episodeNumber'], { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.MOVIES)) {
          const store = db.createObjectStore(STORES.MOVIES, { keyPath: 'cacheKey' });
          store.createIndex('id', 'id', { unique: false });
          store.createIndex('language', 'language', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PERSONS)) {
          const store = db.createObjectStore(STORES.PERSONS, { keyPath: 'cacheKey' });
          store.createIndex('id', 'id', { unique: false });
          store.createIndex('language', 'language', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CAMEOS)) {
          db.createObjectStore(STORES.CAMEOS, { keyPath: 'cacheKey' });
        }

        if (!db.objectStoreNames.contains(STORES.QUERIES)) {
          db.createObjectStore(STORES.QUERIES, { keyPath: 'cacheKey' });
        }

        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const store = db.createObjectStore(STORES.USERS, { keyPath: 'cacheKey' });
          store.createIndex('uid', 'uid', { unique: false });
          store.createIndex('username', 'username', { unique: false });
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

    const payload = {
      ...this._cloneRecord(record),
      updatedAt: Date.now()
    };

    const db = await this.open();
    if (!db) {
      const store = this._memoryFallback.get(storeName);
      if (!store) throw new Error(`Unknown store: ${storeName}`);
      store.set(payload.cacheKey, payload);
      return payload;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(payload);

      req.onsuccess = () => resolve(payload);
      req.onerror = () => reject(req.error || new Error(`IndexedDB put error in ${storeName}`));
    });
  }

  /**
   * Insert or overwrite multiple records within a single transaction
   * @param {string} storeName
   * @param {Array<Object>} [records=[]]
   * @returns {Promise<void>}
   */
  async putMany(storeName, records = []) {
    if (!Array.isArray(records) || records.length === 0) return;

    const now = Date.now();
    const payloads = records
      .filter((r) => r && r.cacheKey)
      .map((r) => ({
        ...this._cloneRecord(r),
        updatedAt: now
      }));

    if (payloads.length === 0) return;

    const db = await this.open();
    if (!db) {
      const store = this._memoryFallback.get(storeName);
      if (!store) throw new Error(`Unknown store: ${storeName}`);
      payloads.forEach((p) => store.set(p.cacheKey, p));
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      payloads.forEach((p) => store.put(p));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error(`IndexedDB putMany error in ${storeName}`));
    });
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
      const store = this._memoryFallback.get(storeName);
      if (!store) throw new Error(`Unknown store: ${storeName}`);
      const item = store.get(cacheKey);
      return item ? this._cloneRecord(item) : null;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(cacheKey);

      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error || new Error(`IndexedDB get error in ${storeName}`));
    });
  }

  /**
   * Retrieve all records matching an index key
   * @param {string} storeName
   * @param {string} indexName
   * @param {*} value
   * @returns {Promise<Array<Object>>}
   */
  async getByIndex(storeName, indexName, value) {
    const db = await this.open();
    if (!db) {
      const store = this._memoryFallback.get(storeName);
      if (!store) throw new Error(`Unknown store: ${storeName}`);
      const all = Array.from(store.values());
      return all
        .filter((item) => {
          if (Array.isArray(value)) {
            if (indexName === 'seasonKey') {
              return item.seriesId === value[0] && item.seasonNumber === value[1];
            }
            if (indexName === 'episodeKey') {
              return item.seriesId === value[0] && item.seasonNumber === value[1] && item.episodeNumber === value[2];
            }
          }
          return item[indexName] === value;
        })
        .map((item) => this._cloneRecord(item));
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(value);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error(`IndexedDB getByIndex error in ${storeName}.${indexName}`));
    });
  }

  /**
   * Retrieve all records in a store
   * @param {string} storeName
   * @returns {Promise<Array<Object>>}
   */
  async getAll(storeName) {
    const db = await this.open();
    if (!db) {
      const store = this._memoryFallback.get(storeName);
      if (!store) throw new Error(`Unknown store: ${storeName}`);
      return Array.from(store.values()).map((item) => this._cloneRecord(item));
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error(`IndexedDB getAll error in ${storeName}`));
    });
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
      const store = this._memoryFallback.get(storeName);
      store?.delete(cacheKey);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(cacheKey);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error(`IndexedDB delete error in ${storeName}`));
    });
  }

  /**
   * Clear all entries in a specific store
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    const db = await this.open();
    if (!db) {
      const store = this._memoryFallback.get(storeName);
      store?.clear();
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error(`IndexedDB clear error in ${storeName}`));
    });
  }

  /**
   * Clear all object stores in the database
   * @returns {Promise<void>}
   */
  async clearAll() {
    const storeNames = Object.values(STORES);
    for (const storeName of storeNames) {
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
