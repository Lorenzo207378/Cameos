import { BaseViewModel } from '../BaseViewModel.js';
import { authRepository as defaultAuthRepository } from '../../repository/auth/AuthRepository.js';

const AUTH_BOOTSTRAP_TIMEOUT_MS = 1500;

/**
 * @typedef {Object} AuthViewModelState
 * @property {import('firebase/auth').User|null} user
 * @property {import('../../models/User.js').User|null} userProfile
 * @property {string|null} avatarDataUrl
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * AuthViewModel
 * ViewModel MVVM puro per la gestione della sessione di autenticazione,
 * sincronizzazione offline del profilo e operazioni di login/logout/onboarding.
 */
export class AuthViewModel extends BaseViewModel {
  /** @type {import('../../repository/auth/AuthRepository.js').AuthRepository} */
  repository;

  /**
   * @param {import('../../repository/auth/AuthRepository.js').AuthRepository} [repository]
   * @param {Object} [options={}]
   */
  constructor(repository = defaultAuthRepository, options = {}) {
    super(
      {
        user: null,
        userProfile: null,
        avatarDataUrl: null,
        loading: Boolean(repository.isConfigured())
      },
      options
    );
    this.repository = repository;
    this._active = false;
    this._sessionId = 0;
  }

  /**
   * Convenience getter for typed state
   * @override
   * @returns {AuthViewModelState}
   */
  get state() {
    return /** @type {AuthViewModelState} */ (super.state);
  }

  /**
   * Avvia l'osservazione dello stato di autenticazione con protezione contro sessioni obsolete.
   * Restituisce una funzione di cleanup simmetrica per il ciclo di vita della View/Context.
   * @returns {() => void}
   */
  startSession = () => {
    if (!this.repository.isConfigured()) {
      this.setState({ loading: false });
      return () => {};
    }

    let active = true;
    this._active = true;

    const isCurrentSession = (id, uid) => active
      && this._active
      && this._sessionId === id
      && (this.repository.getCurrentAuthUser()?.uid || null) === uid;

    const fallbackTimer = setTimeout(() => {
      if (active) this.setState({ loading: false });
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    const syncSession = async (currentUser) => {
      if (!active) return;
      clearTimeout(fallbackTimer);
      const currentSessionId = ++this._sessionId;
      const activeUid = currentUser?.uid || null;

      this.setState({
        user: currentUser,
        userProfile: null,
        avatarDataUrl: null,
        loading: Boolean(activeUid)
      });

      try {
        if (!activeUid) {
          await this.repository.clearSessionUser();
          return;
        }
        const cachedProfile = await this.repository.getSessionUser(activeUid);
        if (!isCurrentSession(currentSessionId, activeUid)) return;
        const domainUser = cachedProfile || await this.repository.saveSessionUser(currentUser);
        if (!isCurrentSession(currentSessionId, activeUid)) return;

        const photoURL = domainUser?.photoURL || currentUser?.photoURL || null;
        const cachedAvatar = photoURL
          ? await this.repository.getCachedSessionAvatar(activeUid, photoURL)
          : null;
        if (isCurrentSession(currentSessionId, activeUid)) {
          this.setState({ userProfile: domainUser, avatarDataUrl: cachedAvatar });
          if (photoURL && !cachedAvatar) {
            void this._cacheSessionAvatar(activeUid, photoURL, currentSessionId);
          }
        }
      } catch {
        if (isCurrentSession(currentSessionId, activeUid)) {
          this.setState({ userProfile: null, avatarDataUrl: null });
        }
      } finally {
        if (isCurrentSession(currentSessionId, activeUid)) {
          this.setState({ loading: false });
        }
      }
    };

    const unsubscribe = this.repository.subscribeAuthState(syncSession, () => {
      clearTimeout(fallbackTimer);
      if (active) this.setState({ loading: false });
    });

    return () => {
      active = false;
      this._active = false;
      this._sessionId += 1;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  };

  /**
   * Salva in background la Data URL dell'avatar in IndexedDB per la sessione corrente.
   * @private
   * @param {string} uid
   * @param {string|null|undefined} photoURL
   * @param {number} sessionId
   * @returns {Promise<void>}
   */
  async _cacheSessionAvatar(uid, photoURL, sessionId) {
    if (!uid || !photoURL) return;
    try {
      const dataUrl = await this.repository.cacheSessionAvatar(uid, photoURL);
      if (
        dataUrl
        && this._active
        && this._sessionId === sessionId
        && this.repository.getCurrentAuthUser()?.uid === uid
      ) {
        this.setState({ avatarDataUrl: dataUrl });
      }
    } catch {
      // Cache avatar best-effort
    }
  }

  /**
   * Sincronizza le modifiche offline pendenti del profilo nella sessione attiva.
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  syncPendingChanges = () => {
    if (!this._active) return Promise.resolve(null);
    const currentUser = this.repository.getCurrentAuthUser();
    const onlineUid = currentUser?.uid;
    const currentSessionId = this._sessionId;
    if (!onlineUid) return Promise.resolve(null);

    return this.repository.syncPendingChanges(onlineUid)
      .then((synced) => {
        if (
          synced
          && this._active
          && this._sessionId === currentSessionId
          && this.repository.getCurrentAuthUser()?.uid === onlineUid
        ) {
          this.setState({ userProfile: synced });
          const photoURL = synced.photoURL || currentUser?.photoURL || null;
          if (photoURL && !this.state.avatarDataUrl) {
            void this._cacheSessionAvatar(onlineUid, photoURL, currentSessionId);
          }
        }
        return synced;
      })
      .catch(() => null);
  };

  /**
   * Aggiorna gli attributi del profilo dell'utente autenticato nella sessione attiva.
   * @param {Object} updates
   * @returns {Promise<import('../../models/User.js').User>}
   */
  updateUserProfile = async (updates) => {
    const uid = this.repository.getCurrentAuthUser()?.uid;
    if (!uid) throw new Error('No authenticated user found.');
    const currentSessionId = this._sessionId;
    const updated = await this.repository.updateSessionUser(uid, updates);
    if (
      this._active
      && this._sessionId === currentSessionId
      && this.repository.getCurrentAuthUser()?.uid === uid
    ) {
      this.setState({ userProfile: updated });
      if (updated?.photoURL) {
        void this._cacheSessionAvatar(uid, updated.photoURL, currentSessionId);
      }
    }
    return updated;
  };

  /**
   * Aggiorna in memoria lo snapshot del profilo utente per la sessione corrente.
   * @param {import('../../models/User.js').User|null} profile
   */
  refreshUserProfile = (profile) => {
    const currentUser = this.repository.getCurrentAuthUser();
    const uid = currentUser?.uid;
    if (!uid) return;
    if (!profile || profile.uid === uid) {
      this.setState({ userProfile: profile || null });
      const photoURL = profile?.photoURL || currentUser?.photoURL || null;
      if (photoURL) {
        void this._cacheSessionAvatar(uid, photoURL, this._sessionId);
      }
    }
  };

  /**
   * @param {boolean} [rememberMe=true]
   * @returns {Promise<import('../../backend/user/authentication.js').AuthOutcome>}
   */
  login = (rememberMe = true) => this.repository.login(rememberMe);

  /**
   * @returns {Promise<import('../../backend/user/authentication.js').AuthOutcome>}
   */
  consumeRedirectLogin = () => this.repository.consumeRedirectLogin();

  /**
   * @param {string} username
   * @returns {Promise<import('../../backend/user/authentication.js').AuthOutcome>}
   */
  validateUsername = (username) => this.repository.validateUsername(username);

  /**
   * @returns {Promise<void>}
   */
  logout = () => this.repository.logout();

  /**
   * @param {import('firebase/auth').User|null} [user=null]
   * @returns {Promise<void>}
   */
  deleteUserProfile = (user = null) => this.repository.deleteUserProfile(user);

  /**
   * @returns {boolean}
   */
  isSignedIn = () => this.repository.isSignedIn();

  /**
   * @returns {import('../../backend/user/authentication.js').PlatformAuthModule}
   */
  getPlatformCapabilities = () => this.repository.getPlatformCapabilities();
}

export default AuthViewModel;
