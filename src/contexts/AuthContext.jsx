import PropTypes from "prop-types";
import {
  createContext,
  useContext,
  useEffect,
  useMemo
} from "react";
import { useAuthViewModel } from "../viewmodel/index.js";
import { subscribeNetworkStatus } from "../utils/networkStatus.js";

/**
 * @typedef {Object} AuthContextValue
 * @property {import('firebase/auth').User|null} user
 * @property {import('../models/User.js').User|null} userProfile
 * @property {string|null} avatarDataUrl
 * @property {boolean} loading
 * @property {(rememberMe?: boolean) => Promise<import('../backend/user/authentication.js').AuthOutcome>} login
 * @property {() => Promise<void>} logout
 * @property {(user?: import('firebase/auth').User|null) => Promise<void>} deleteUserProfile
 * @property {(updates: Object) => Promise<import('../models/User.js').User>} updateUserProfile
 * @property {(profile: import('../models/User.js').User|null) => void} refreshUserProfile
 * @property {() => Promise<import('../backend/user/authentication.js').AuthOutcome>} consumeRedirectLogin
 * @property {(username: string) => Promise<import('../backend/user/authentication.js').AuthOutcome>} validateUsername
 * @property {() => boolean} isSignedIn
 * @property {() => import('../backend/user/authentication.js').PlatformAuthModule} getPlatformCapabilities
 */

/** @type {import('react').Context<AuthContextValue|null>} */
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

/**
 * Thin React Context adapter exposing `AuthViewModel` state and actions across the component tree.
 * @param {Object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {import('../repository/auth/AuthRepository.js').AuthRepository} [props.repository]
 */
export function AuthProvider({ children = undefined, repository = undefined }) {
  const authVm = useAuthViewModel({ repository });
  const {
    user,
    userProfile,
    avatarDataUrl,
    loading,
    startSession,
    syncPendingChanges,
    login,
    logout,
    deleteUserProfile,
    updateUserProfile,
    refreshUserProfile,
    consumeRedirectLogin,
    validateUsername,
    isSignedIn,
    getPlatformCapabilities
  } = authVm;

  useEffect(() => startSession(), [startSession]);

  useEffect(() => subscribeNetworkStatus((online) => {
    if (online) {
      void syncPendingChanges();
    }
  }), [syncPendingChanges]);

  const value = useMemo(() => ({
    user,
    userProfile,
    avatarDataUrl,
    loading,
    login,
    logout,
    deleteUserProfile,
    updateUserProfile,
    refreshUserProfile,
    consumeRedirectLogin,
    validateUsername,
    isSignedIn,
    getPlatformCapabilities
  }), [
    user,
    userProfile,
    avatarDataUrl,
    loading,
    login,
    logout,
    deleteUserProfile,
    updateUserProfile,
    refreshUserProfile,
    consumeRedirectLogin,
    validateUsername,
    isSignedIn,
    getPlatformCapabilities
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node,
  repository: PropTypes.object
};

/**
 * @returns {AuthContextValue}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
