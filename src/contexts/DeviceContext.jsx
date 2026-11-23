import PropTypes from 'prop-types';
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

/**
 * @typedef {'mobile'|'tablet'|'desktop'} DeviceType
 */

/**
 * @typedef {Object} DeviceContextValue
 * @property {boolean} isMobile
 * @property {boolean} isTablet
 * @property {boolean} isDesktop
 * @property {DeviceType} device
 */

/** @type {import('react').Context<DeviceContextValue>} */
const DeviceContext = createContext({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  device: /** @type {DeviceType} */ ('desktop')
});

const MOBILE_QUERY = '(max-width: 767.98px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 991.98px)';

const subscribe = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const mqlMobile = window.matchMedia(MOBILE_QUERY);
  const mqlTablet = window.matchMedia(TABLET_QUERY);
  mqlMobile.addEventListener('change', callback);
  mqlTablet.addEventListener('change', callback);
  return () => {
    mqlMobile.removeEventListener('change', callback);
    mqlTablet.removeEventListener('change', callback);
  };
};

/** @returns {DeviceType} */
const getSnapshot = () => {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(MOBILE_QUERY).matches) return 'mobile';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'desktop';
};

/** @returns {DeviceType} */
const getServerSnapshot = () => 'desktop';

/**
 * Provider React per la gestione reattiva dello stato responsivo del dispositivo (mobile, tablet, desktop).
 * @param {Object} props
 * @param {import('react').ReactNode} [props.children]
 */
export function DeviceProvider({ children = undefined }) {
  const device = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo(() => ({
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    device
  }), [device]);

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}

DeviceProvider.propTypes = {
  children: PropTypes.node
};

/**
 * Hook per accedere alle informazioni responsive del dispositivo.
 * @returns {{ isMobile: boolean, isTablet: boolean, isDesktop: boolean, device: 'mobile'|'tablet'|'desktop' }}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDevice() {
  return useContext(DeviceContext);
}
