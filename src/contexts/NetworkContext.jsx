import PropTypes from 'prop-types';
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import {
  getServerNetworkSnapshot,
  isNetworkOnline,
  subscribeNetworkStatus
} from '../utils/networkStatus.js';

/**
 * @typedef {Object} NetworkContextValue
 * @property {boolean} isOnline
 * @property {boolean} isOffline
 */

/** @type {import('react').Context<NetworkContextValue|null>} */
const NetworkContext = createContext(null);

const subscribeNoop = () => () => {};

/**
 * Provider React centralizzato per lo stato di connettività online/offline dell'applicazione.
 * @param {Object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function NetworkProvider({ children = undefined }) {
  const isOnline = useSyncExternalStore(subscribeNetworkStatus, isNetworkOnline, getServerNetworkSnapshot);

  const value = useMemo(() => ({
    isOnline,
    isOffline: !isOnline
  }), [isOnline]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

NetworkProvider.propTypes = {
  children: PropTypes.node
};

/* eslint-disable react-refresh/only-export-components */
/**
 * Hook per leggere lo stato reattivo di connettività online/offline dal `NetworkContext`.
 * Mantiene il fallback reattivo via `useSyncExternalStore` anche se montato fuori dal provider (es. test isolati).
 * @returns {NetworkContextValue}
 */
export function useNetwork() {
  const context = useContext(NetworkContext);
  const fallbackOnline = useSyncExternalStore(
    context ? subscribeNoop : subscribeNetworkStatus,
    isNetworkOnline,
    getServerNetworkSnapshot
  );

  return useMemo(() => (
    context ?? { isOnline: fallbackOnline, isOffline: !fallbackOnline }
  ), [context, fallbackOnline]);
}
/* eslint-enable react-refresh/only-export-components */
