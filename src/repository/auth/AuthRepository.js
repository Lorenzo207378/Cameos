import { authBackend as defaultAuthBackend, createAuthOutcome } from '../../backend/user/authentication.js';
import { userRepository as defaultUserRepository } from '../user/UserRepository.js';

/**
 * @param {*} error
 * @returns {string|null}
 */
function getErrorMessage(error) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : null;
}

/**
 * AuthRepository
 * Coordina il DataSource Firebase Auth (`authentication.js`) con `UserRepository`
 * (profilo Firestore + sessione locale IndexedDB) mantenendo i confini MVVM.
 */
export class AuthRepository {
  /** @type {typeof defaultAuthBackend} */
  authBackend;

  /** @type {import('../user/UserRepository.js').UserRepository} */
  userRepository;

  /** @type {Promise<import('../../backend/user/authentication.js').AuthOutcome>|null} */
  _redirectResultPromise;

  /**
   * @param {typeof defaultAuthBackend} [authBackend]
   * @param {import('../user/UserRepository.js').UserRepository} [userRepository]
   */
  constructor(authBackend = defaultAuthBackend, userRepository = defaultUserRepository) {
    this.authBackend = authBackend;
    this.userRepository = userRepository;
    this._redirectResultPromise = null;
  }

  /**
   * @returns {boolean}
   */
  isConfigured() {
    return this.authBackend.hasAuthClient();
  }

  /**
   * @returns {import('firebase/auth').User|null}
   */
  getCurrentAuthUser() {
    return this.authBackend.getCurrentAuthUser();
  }

  /**
   * @returns {boolean}
   */
  isSignedIn() {
    return this.authBackend.isSignedIn();
  }

  /**
   * @returns {import('../../backend/user/authentication.js').PlatformAuthModule}
   */
  getPlatformCapabilities() {
    return this.authBackend.getPlatformAuthModule();
  }

  /**
   * @param {(user: import('firebase/auth').User|null) => void} onNext
   * @param {(error: Error) => void} [onError]
   * @returns {() => void}
   */
  subscribeAuthState(onNext, onError = undefined) {
    return this.authBackend.subscribeAuthState(onNext, onError);
  }

  /**
   * @param {string|null} [uid=null]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  getSessionUser(uid = null) {
    return this.userRepository.getSessionUser(uid);
  }

  /**
   * @param {Object} userInput
   * @param {string|null} [username=null]
   * @returns {Promise<import('../../models/User.js').User>}
   */
  saveSessionUser(userInput, username = null) {
    return this.userRepository.saveUser(userInput, username);
  }

  /**
   * @returns {Promise<void>}
   */
  clearSessionUser() {
    return this.userRepository.clearSessionUser();
  }

  /**
   * @param {string} uid
   * @param {Object} [updates={}]
   * @returns {Promise<import('../../models/User.js').User>}
   */
  updateSessionUser(uid, updates = {}) {
    return this.userRepository.updateUser(uid, updates);
  }

  /**
   * @param {string} uid
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  syncPendingChanges(uid) {
    return this.userRepository.syncPendingChanges(uid);
  }

  /**
   * @param {string} uid
   * @param {string|null} [photoURL=null]
   * @returns {Promise<string|null>}
   */
  getCachedSessionAvatar(uid, photoURL = null) {
    if (typeof this.userRepository.getCachedAvatar !== 'function') {
      return Promise.resolve(null);
    }
    return this.userRepository.getCachedAvatar(uid, photoURL);
  }

  /**
   * @param {string} uid
   * @param {string|null|undefined} photoURL
   * @returns {Promise<string|null>}
   */
  cacheSessionAvatar(uid, photoURL) {
    if (typeof this.userRepository.cacheUserAvatar !== 'function') {
      return Promise.resolve(null);
    }
    return this.userRepository.cacheUserAvatar(uid, photoURL);
  }

  /**
   * @param {import('firebase/auth').User} user
   * @returns {Promise<import('../../backend/user/authentication.js').AuthOutcome>}
   */
  async _resolveAuthenticatedOutcome(user) {
    const userProfile = await this.userRepository.saveUser(user, null);
    return userProfile?.username
      ? createAuthOutcome('authenticated', { user, userProfile, messageKey: 'auth.googleSuccess' })
      : createAuthOutcome('needs_username', { user, userProfile, messageKey: 'auth.googleUsernameNeeded' });
  }

  /**
   * Esegue il login con Google e sincronizza il profilo utente nel Repository.
   * @param {boolean} [rememberMe=true]
   * @returns {Promise<import('../../backend/user/authentication.js').AuthOutcome>}
   */
  async login(rememberMe = true) {
    const authOutcome = await this.authBackend.signInWithGoogle(rememberMe);
    if (authOutcome.status !== 'authenticated' || !authOutcome.user) {
      return authOutcome;
    }

    try {
      return await this._resolveAuthenticatedOutcome(authOutcome.user);
    } catch (error) {
      return createAuthOutcome('error', {
        errorMessage: getErrorMessage(error),
        messageKey: 'auth.loginFailed',
        errorTarget: 'auth'
      });
    }
  }

  /**
   * Risolve eventuali callback di redirect Google (direct OAuth o Firebase) una volta per caricamento.
   * @returns {Promise<import('../../backend/user/authentication.js').AuthOutcome>}
   */
  consumeRedirectLogin() {
    if (!this._redirectResultPromise) {
      this._redirectResultPromise = (async () => {
        const authOutcome = await this.authBackend.resolveRedirectAuth();
        if (authOutcome.status === 'authenticated' && authOutcome.user) {
          return this._resolveAuthenticatedOutcome(authOutcome.user);
        }
        return authOutcome;
      })().catch((error) => {
        this._redirectResultPromise = null;
        return createAuthOutcome('error', {
          errorMessage: getErrorMessage(error),
          messageKey: 'auth.loginFailed',
          errorTarget: 'auth'
        });
      });
    }

    return this._redirectResultPromise;
  }

  /**
   * Valida e assegna uno username univoco all'utente autenticato.
   * @param {string} username
   * @param {import('firebase/auth').User|null} [user=null]
   * @returns {Promise<import('../../backend/user/authentication.js').AuthOutcome>}
   */
  async validateUsername(username, user = null) {
    const targetUser = user ?? this.getCurrentAuthUser();
    const usernameError = (errorMessage) => createAuthOutcome('error', {
      errorMessage,
      errorTarget: 'username'
    });

    try {
      const trimmedUsername = username ? username.trim() : '';
      if (!trimmedUsername) return usernameError('Username is required.');
      if (trimmedUsername.length < 3) return usernameError('Username must be at least 3 characters.');

      const isAvailable = await this.userRepository.isUsernameAvailable(trimmedUsername, targetUser?.uid || null);
      if (!isAvailable) return usernameError('Username is already taken.');

      let userProfile = null;
      if (targetUser) {
        await this.authBackend.updateAuthDisplayName(targetUser, trimmedUsername);
        userProfile = await this.userRepository.saveUser(targetUser, trimmedUsername);
      }

      return createAuthOutcome('authenticated', {
        user: targetUser,
        userProfile,
        messageKey: 'auth.googleSuccess'
      });
    } catch (error) {
      return createAuthOutcome('error', {
        errorMessage: getErrorMessage(error),
        messageKey: 'auth.usernameValidationFailed',
        errorTarget: 'username'
      });
    }
  }

  /**
   * Rimuove la sessione locale IndexedDB ed effettua il sign-out da Firebase Auth.
   * @returns {Promise<void>}
   */
  async logout() {
    await this.userRepository.clearSessionUser();
    await this.authBackend.signOutAuth();
  }

  /**
   * Verifica la freschezza della sessione prima di eliminare profilo Firestore/IndexedDB e account Firebase Auth.
   * @param {import('firebase/auth').User|null} [user=null]
   * @returns {Promise<void>}
   */
  async deleteUserProfile(user = null) {
    const targetUser = user ?? this.getCurrentAuthUser();
    if (!targetUser) {
      throw new Error('No authenticated user found.');
    }

    if (typeof this.authBackend.ensureRecentAuth === 'function') {
      await this.authBackend.ensureRecentAuth(targetUser);
    }
    await this.userRepository.deleteUser(targetUser.uid);
    await this.authBackend.deleteAuthUser(targetUser);
  }
}

export const authRepository = new AuthRepository();
export default AuthRepository;
