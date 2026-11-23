/**
 * Centralized network connectivity store shared by Repository, ViewModel, and Context layers.
 * Implemented with plain module functions (no classes) to preserve layer boundaries.
 */
// ** PARAMETRI DI TEST **
let globalOnlineOverride = null;
// ** FINE PARAMETRI DI TEST **

let browserEventOnline = null;
const listeners = new Set();

/**
 * Return current online status across browser state and active test overrides.
 * @returns {boolean}
 */
export function isNetworkOnline() {
  // ** PARAMETRI DI TEST **
  if (typeof globalOnlineOverride === 'boolean') {
    return globalOnlineOverride;
  }
  // ** FINE PARAMETRI DI TEST **

  if (typeof browserEventOnline === 'boolean') {
    return browserEventOnline;
  }
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

/** @returns {boolean} */
export function getServerNetworkSnapshot() {
  return true;
}

function notifyListeners() {
  const online = isNetworkOnline();
  for (const listener of [...listeners]) {
    listener(online);
  }
}

function handleBrowserOnline() {
  browserEventOnline = true;
  notifyListeners();
}

function handleBrowserOffline() {
  browserEventOnline = false;
  notifyListeners();
}

function attachWindowListeners() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', handleBrowserOnline);
  window.addEventListener('offline', handleBrowserOffline);
}

function detachWindowListeners() {
  if (typeof window === 'undefined') return;
  window.removeEventListener('online', handleBrowserOnline);
  window.removeEventListener('offline', handleBrowserOffline);
  browserEventOnline = null;
}

/**
 * Subscribe to connectivity changes (`online`/`offline` events and global overrides).
 * Attaches shared window listeners only while at least one subscriber is active.
 * @param {(isOnline: boolean) => void} listener
 * @returns {() => void}
 */
export function subscribeNetworkStatus(listener) {
  if (typeof listener !== 'function') return () => {};
  if (listeners.size === 0) {
    attachWindowListeners();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      detachWindowListeners();
    }
  };
}

// ** FUNZIONI DI TEST **
/**
 * Get the current global online/offline override (`null` means browser state controls connectivity).
 * @returns {boolean|null}
 */
export function getOnlineOverride() {
  return globalOnlineOverride;
}

/**
 * Set global connectivity override and notify active subscribers (`null` restores browser connectivity).
 * @param {boolean|null} isOnline
 */
export function setOnlineOverride(isOnline) {
  globalOnlineOverride = isOnline;
  notifyListeners();
}

if (typeof window !== 'undefined') {
  /** @type {Window & { setCameosOffline?: (offline: boolean|null) => { isOnlineOverride: boolean|null } }} */ (window).setCameosOffline = (offline) => {
    setOnlineOverride(offline === null ? null : !offline);
    return { isOnlineOverride: getOnlineOverride() };
  };
}
// ** FINE FUNZIONI DI TEST **
