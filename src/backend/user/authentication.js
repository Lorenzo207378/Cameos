import {
    browserLocalPersistence,
    browserPopupRedirectResolver,
    browserSessionPersistence,
    deleteUser,
    getRedirectResult,
    GoogleAuthProvider,
    reauthenticateWithPopup,
    signInWithCredential,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    setPersistence,
    updateProfile
} from "firebase/auth";
import { auth } from "../firebase.js";
import { userBackend } from "./UserBackend.js";
import { userRepository } from "../../repository/index.js";

/** @typedef {'authenticated'|'needs_username'|'redirected'|'error'|'none'} AuthOutcomeStatus */

/**
 * @typedef {Object} AuthOutcome
 * @property {AuthOutcomeStatus} status
 * @property {import("firebase/auth").User|null} user
 * @property {import("../../models/User.js").User|null} userProfile
 * @property {boolean} needsUsername
 * @property {boolean} redirected
 * @property {string|null} messageKey
 * @property {string|null} errorMessage
 * @property {'auth'|'username'|null} errorTarget
 */

/**
 * @typedef {Object} PlatformAuthModule
 * @property {'ios'|'android'|'desktop'} os
 * @property {boolean} standalone
 * @property {boolean} preferDirectOAuth
 * @property {boolean} fallbackToRedirect
 * @property {boolean} recoverStalledPopup
 */

/**
 * @typedef {Object} DirectOAuthState
 * @property {string} state
 * @property {string} nonce
 * @property {boolean} rememberMe
 * @property {number} createdAt
 */

const googleProvider = new GoogleAuthProvider();
const PENDING_REDIRECT_FLAG = "cameos_pending_google_redirect";
const DIRECT_OAUTH_STATE_KEY = "cameos_google_oauth_state";
const DIRECT_OAUTH_TTL_MS = 10 * 60 * 1000;
const POPUP_FALLBACK_ERROR_CODES = new Set([
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment"
]);

const PLATFORM_MODULES = Object.freeze({
    ios: {
        preferDirectOAuth: true,
        fallbackToRedirect: false,
        recoverStalledPopup: false
    },
    android: {
        preferDirectOAuth: false,
        fallbackToRedirect: true,
        recoverStalledPopup: true
    },
    desktop: {
        preferDirectOAuth: false,
        fallbackToRedirect: true,
        recoverStalledPopup: true
    }
});

/** @type {Promise<AuthOutcome>|null} */
let redirectResultPromise = null;

/**
 * @param {*} error
 * @returns {string|null}
 */
function getErrorCode(error) {
    return error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : null;
}

/**
 * @param {*} error
 * @returns {string|null}
 */
function getErrorMessage(error) {
    return error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : null;
}

function getGoogleClientId() {
    return (import.meta.env?.VITE_GOOGLE_CLIENT_ID || "").trim();
}

function getBasePath() {
    const raw = import.meta.env?.BASE_URL || "/Cameos/";
    return raw.endsWith("/") ? raw : `${raw}/`;
}

function generateOAuthToken() {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/**
 * @param {string} token
 * @returns {{ nonce?: string }|null}
 */
function decodeJwtPayload(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

/**
 * @param {string} key
 * @returns {string|null}
 */
function readSessionItem(key) {
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * @param {string} key
 * @param {string|null} value
 * @returns {boolean}
 */
function writeSessionItem(key, value) {
    try {
        if (value === null) {
            window.sessionStorage.removeItem(key);
        } else {
            window.sessionStorage.setItem(key, value);
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * @returns {DirectOAuthState|null}
 */
function readDirectOAuthState() {
    const raw = readSessionItem(DIRECT_OAUTH_STATE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Create a normalized outcome object shared across popup, redirect, and username steps.
 * @param {AuthOutcomeStatus} status
 * @param {Partial<AuthOutcome>} [details={}]
 * @returns {AuthOutcome}
 */
export function createAuthOutcome(
    status,
    {
        user = undefined,
        userProfile = undefined,
        messageKey = undefined,
        errorMessage = undefined,
        errorTarget = undefined
    } = {}
) {
    return {
        status,
        user: user ?? null,
        userProfile: userProfile ?? null,
        needsUsername: status === "needs_username",
        redirected: status === "redirected",
        messageKey: messageKey ?? null,
        errorMessage: errorMessage ?? null,
        errorTarget: errorTarget ?? null
    };
}

/**
 * Detect active platform auth module configuration (iOS, Android, or Desktop).
 * @returns {PlatformAuthModule}
 */
export function getPlatformAuthModule() {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
        return {
            os: "desktop",
            standalone: false,
            ...PLATFORM_MODULES.desktop
        };
    }

    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/i.test(ua)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = !isIOS && /Android/i.test(ua);
    const os = isIOS ? "ios" : (isAndroid ? "android" : "desktop");
    const standalone = Boolean(
        /** @type {Navigator & { standalone?: boolean }} */ (navigator).standalone
        || window.matchMedia?.("(display-mode: standalone)").matches
    );

    return {
        os,
        standalone,
        ...PLATFORM_MODULES[os]
    };
}

/**
 * Route direct Google OAuth hash callbacks returned on the app base URL to the login route
 * before React Router initializes.
 */
export function prepareOAuthCallbackRoute() {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (!hash || (!hash.includes("id_token=") && !hash.includes("error="))) return;
    if (!readDirectOAuthState()) return;

    const loginPath = `${getBasePath()}login`;
    if (window.location.pathname !== loginPath) {
        window.history.replaceState(null, "", `${loginPath}${hash}`);
    }
}

/**
 * @param {import("firebase/auth").User} user
 * @returns {Promise<AuthOutcome>}
 */
async function resolveAuthenticatedOutcome(user) {
    const userProfile = await userRepository.saveUser(user, null);
    return userProfile?.username
        ? createAuthOutcome("authenticated", { user, userProfile, messageKey: "auth.googleSuccess" })
        : createAuthOutcome("needs_username", { user, userProfile, messageKey: "auth.googleUsernameNeeded" });
}

/**
 * @param {boolean} rememberMe
 * @returns {AuthOutcome}
 */
function startDirectGoogleOAuth(rememberMe) {
    const clientId = getGoogleClientId();
    if (!clientId) {
        return createAuthOutcome("error", {
            messageKey: "auth.googleClientNotConfigured",
            errorTarget: "auth"
        });
    }

    const state = generateOAuthToken();
    const nonce = generateOAuthToken();
    const saved = writeSessionItem(
        DIRECT_OAUTH_STATE_KEY,
        JSON.stringify({
            state,
            nonce,
            rememberMe: Boolean(rememberMe),
            createdAt: Date.now()
        })
    );
    if (!saved) {
        return createAuthOutcome("error", {
            messageKey: "auth.redirectStorageBlocked",
            errorTarget: "auth"
        });
    }

    const redirectUri = new URL(getBasePath(), window.location.origin).toString();
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "id_token",
        scope: "openid email profile",
        state,
        nonce,
        prompt: "select_account"
    });

    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    return createAuthOutcome("redirected");
}

/**
 * @param {import("firebase/auth").Auth} authClient
 * @param {import("firebase/auth").Persistence} persistence
 * @returns {Promise<AuthOutcome>}
 */
async function startFirebaseRedirectLogin(authClient, persistence) {
    writeSessionItem(PENDING_REDIRECT_FLAG, "1");
    try {
        await setPersistence(authClient, persistence);
        await signInWithRedirect(authClient, googleProvider, browserPopupRedirectResolver);
        return createAuthOutcome("redirected");
    } catch (error) {
        writeSessionItem(PENDING_REDIRECT_FLAG, null);
        throw error;
    }
}

/**
 * @param {import("firebase/auth").Auth} authClient
 * @returns {Promise<AuthOutcome|null>}
 */
async function consumeDirectOAuthCallback(authClient) {
    if (typeof window === "undefined") return null;

    const rawHash = window.location.hash || "";
    if (!rawHash.startsWith("#")) return null;

    const params = new URLSearchParams(rawHash.slice(1));
    const idToken = params.get("id_token");
    const oauthError = params.get("error");
    if (!idToken && !oauthError) return null;

    const pending = readDirectOAuthState();
    writeSessionItem(DIRECT_OAUTH_STATE_KEY, null);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    if (oauthError) {
        return oauthError === "access_denied"
            ? createAuthOutcome("error", { messageKey: "auth.popupNotCompleted", errorTarget: "auth" })
            : createAuthOutcome("error", {
                errorMessage: params.get("error_description") || oauthError,
                messageKey: "auth.loginFailed",
                errorTarget: "auth"
            });
    }

    const isFreshState = Boolean(
        pending
        && pending.state
        && pending.state === params.get("state")
        && Date.now() - Number(pending.createdAt || 0) <= DIRECT_OAUTH_TTL_MS
    );
    const claims = isFreshState && idToken ? decodeJwtPayload(idToken) : null;
    if (!pending || !isFreshState || !claims?.nonce || claims.nonce !== pending.nonce) {
        return createAuthOutcome("error", {
            messageKey: "auth.loginFailed",
            errorTarget: "auth"
        });
    }

    const persistence = pending.rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(authClient, persistence);
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(authClient, credential);
    return resolveAuthenticatedOutcome(userCredential.user);
}

/**
 * Check whether Firebase Auth currently holds an active user session.
 * @returns {boolean}
 */
export function isSignedIn() {
    return Boolean(auth?.currentUser);
}

/**
 * Generic Google sign-in flow delegating direct OAuth or popup/redirect to the active platform module.
 * @param {boolean} [rememberMe=true]
 * @returns {Promise<AuthOutcome>}
 */
export async function login(rememberMe = true) {
    const authClient = auth;
    if (!authClient) {
        return createAuthOutcome("error", {
            errorMessage: "Firebase Authentication is not configured.",
            errorTarget: "auth"
        });
    }

    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    const platformModule = getPlatformAuthModule();

    try {
        if (platformModule.preferDirectOAuth) {
            return startDirectGoogleOAuth(rememberMe);
        }

        // Trigger popup synchronously before any await so browsers preserve user activation.
        let credential;
        try {
            credential = await signInWithPopup(authClient, googleProvider, browserPopupRedirectResolver);
        } catch (error) {
            const code = getErrorCode(error);
            if (platformModule.fallbackToRedirect && code && POPUP_FALLBACK_ERROR_CODES.has(code)) {
                return getGoogleClientId()
                    ? startDirectGoogleOAuth(rememberMe)
                    : await startFirebaseRedirectLogin(authClient, persistence);
            }
            throw error;
        }

        await setPersistence(authClient, persistence);
        return await resolveAuthenticatedOutcome(credential.user);
    } catch (error) {
        return createAuthOutcome("error", {
            errorMessage: getErrorMessage(error),
            messageKey: "auth.loginFailed",
            errorTarget: "auth"
        });
    }
}

/**
 * Resolve any pending Google redirect login (direct OAuth or Firebase) once per page load.
 * @returns {Promise<AuthOutcome>}
 */
export function consumeRedirectLogin() {
    if (!redirectResultPromise) {
        redirectResultPromise = (async () => {
            const authClient = auth;
            if (!authClient) return createAuthOutcome("none");

            const directOutcome = await consumeDirectOAuthCallback(authClient);
            if (directOutcome) return directOutcome;

            const wasPending = readSessionItem(PENDING_REDIRECT_FLAG) === "1";
            if (wasPending) writeSessionItem(PENDING_REDIRECT_FLAG, null);

            const credential = await getRedirectResult(authClient, browserPopupRedirectResolver);
            if (credential?.user) {
                return resolveAuthenticatedOutcome(credential.user);
            }
            if (wasPending && !authClient.currentUser) {
                return createAuthOutcome("error", {
                    messageKey: "auth.redirectStorageBlocked",
                    errorTarget: "auth"
                });
            }
            return createAuthOutcome("none");
        })().catch((error) => {
            redirectResultPromise = null;
            return createAuthOutcome("error", {
                errorMessage: getErrorMessage(error),
                messageKey: "auth.loginFailed",
                errorTarget: "auth"
            });
        });
    }

    return redirectResultPromise;
}

/**
 * Validate and assign a unique username for the authenticated user.
 * @param {string} username
 * @param {import("firebase/auth").User|null} [user=auth?.currentUser ?? null]
 * @returns {Promise<AuthOutcome>}
 */
export async function validateUsername(username, user = auth?.currentUser ?? null) {
    const usernameError = (errorMessage) => createAuthOutcome("error", {
        errorMessage,
        errorTarget: "username"
    });

    try {
        const trimmedUsername = username ? username.trim() : "";
        if (!trimmedUsername) return usernameError("Username is required.");
        if (trimmedUsername.length < 3) return usernameError("Username must be at least 3 characters.");

        const isAvailable = await userBackend.isUsernameAvailable(trimmedUsername, user?.uid || null);
        if (!isAvailable) return usernameError("Username is already taken.");

        let userProfile = null;
        if (user) {
            await updateProfile(user, { displayName: trimmedUsername });
            userProfile = await userRepository.saveUser(user, trimmedUsername);
        }

        return createAuthOutcome("authenticated", {
            user,
            userProfile,
            messageKey: "auth.googleSuccess"
        });
    } catch (error) {
        return createAuthOutcome("error", {
            errorMessage: getErrorMessage(error),
            messageKey: "auth.usernameValidationFailed",
            errorTarget: "username"
        });
    }
}

/**
 * Clear local IndexedDB session user and sign out from Firebase Auth.
 * @returns {Promise<void>}
 */
export async function logout() {
    await userRepository.clearSessionUser();
    if (auth) {
        await signOut(auth);
    }
}

/**
 * Delete user profile from Firestore, IndexedDB, and Firebase Auth.
 * @param {import("firebase/auth").User|null} [user=auth?.currentUser ?? null]
 * @returns {Promise<void>}
 */
export async function deleteUserProfile(user = auth?.currentUser ?? null) {
    if (!user) {
        throw new Error("No authenticated user found.");
    }

    await userRepository.deleteUser(user.uid);

    try {
        await deleteUser(user);
    } catch (error) {
        if (getErrorCode(error) === "auth/requires-recent-login") {
            await reauthenticateWithPopup(user, googleProvider, browserPopupRedirectResolver);
            await deleteUser(user);
        } else {
            throw error;
        }
    }
}
