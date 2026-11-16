import {
    browserLocalPersistence,
    browserPopupRedirectResolver,
    browserSessionPersistence,
    deleteUser,
    getRedirectResult,
    GoogleAuthProvider,
    reauthenticateWithPopup,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    setPersistence,
    updateProfile
} from "firebase/auth";
import { auth } from "../firebase.js";
import { userBackend } from "./UserBackend.js";
import { userRepository } from "../../repository/index.js";

const googleProvider = new GoogleAuthProvider();
const PENDING_REDIRECT_FLAG = "cameos_pending_google_redirect";
const POPUP_FALLBACK_ERROR_CODES = new Set([
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment"
]);

const PLATFORM_MODULES = Object.freeze({
    ios: {
        preferRedirectWhenStandalone: true,
        fallbackToRedirect: true,
        recoverStalledPopup: true
    },
    android: {
        preferRedirectWhenStandalone: false,
        fallbackToRedirect: true,
        recoverStalledPopup: true
    },
    desktop: {
        preferRedirectWhenStandalone: false,
        fallbackToRedirect: true,
        recoverStalledPopup: true
    }
});

/**
 * @typedef {'authenticated'|'needs_username'|'redirected'|'error'|'none'} AuthOutcomeStatus
 *
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

/** @type {Promise<AuthOutcome>|null} */
let redirectResultPromise = null;

/**
 * Create a normalized outcome object shared across popup, redirect, and username steps.
 * @param {AuthOutcomeStatus} status
 * @param {Object} [details={}]
 * @param {import("firebase/auth").User|null} [details.user=null]
 * @param {import("../../models/User.js").User|null} [details.userProfile=null]
 * @param {string|null} [details.messageKey=null]
 * @param {string|null} [details.errorMessage=null]
 * @param {'auth'|'username'|null} [details.errorTarget=null]
 * @returns {AuthOutcome}
 */
export function createAuthOutcome(
    status,
    {
        user = null,
        userProfile = null,
        messageKey = null,
        errorMessage = null,
        errorTarget = null
    } = {}
) {
    return {
        status,
        user,
        userProfile,
        needsUsername: status === "needs_username",
        redirected: status === "redirected",
        messageKey,
        errorMessage,
        errorTarget
    };
}

/**
 * Detect active platform auth module configuration (iOS, Android, or Desktop).
 * @returns {{ os: 'ios'|'android'|'desktop', standalone: boolean, useRedirect: boolean, fallbackToRedirect: boolean, recoverStalledPopup: boolean }}
 */
export function getPlatformAuthModule() {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
        return {
            os: "desktop",
            standalone: false,
            useRedirect: false,
            ...PLATFORM_MODULES.desktop
        };
    }

    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/i.test(ua)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = !isIOS && /Android/i.test(ua);
    const os = isIOS ? "ios" : (isAndroid ? "android" : "desktop");
    const standalone = Boolean(
        navigator.standalone
        || window.matchMedia?.("(display-mode: standalone)").matches
    );
    const config = PLATFORM_MODULES[os];

    return {
        os,
        standalone,
        useRedirect: standalone && config.preferRedirectWhenStandalone,
        fallbackToRedirect: config.fallbackToRedirect,
        recoverStalledPopup: config.recoverStalledPopup
    };
}

function setPendingRedirectFlag(enabled) {
    try {
        if (enabled) {
            window.sessionStorage.setItem(PENDING_REDIRECT_FLAG, "1");
        } else {
            window.sessionStorage.removeItem(PENDING_REDIRECT_FLAG);
        }
    } catch {
        // Ignore restricted sessionStorage environments.
    }
}

function consumePendingRedirectFlag() {
    try {
        const wasPending = window.sessionStorage.getItem(PENDING_REDIRECT_FLAG) === "1";
        if (wasPending) setPendingRedirectFlag(false);
        return wasPending;
    } catch {
        return false;
    }
}

async function resolveAuthenticatedOutcome(user, username = null) {
    const userProfile = await userRepository.saveUser(user, username);
    return userProfile?.username
        ? createAuthOutcome("authenticated", { user, userProfile, messageKey: "auth.googleSuccess" })
        : createAuthOutcome("needs_username", { user, userProfile, messageKey: "auth.googleUsernameNeeded" });
}

async function startRedirectLogin(persistence) {
    setPendingRedirectFlag(true);
    try {
        await setPersistence(auth, persistence);
        await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
        return createAuthOutcome("redirected");
    } catch (error) {
        setPendingRedirectFlag(false);
        throw error;
    }
}

/**
 * Check whether Firebase Auth currently holds an active user session.
 * @returns {boolean}
 */
export function isSignedIn() {
    return Boolean(auth?.currentUser);
}

/**
 * Generic Google sign-in flow delegating popup/redirect behavior to the active platform module.
 * @param {boolean} [rememberMe=true]
 * @returns {Promise<AuthOutcome>}
 */
export async function login(rememberMe = true) {
    if (!auth) {
        return createAuthOutcome("error", {
            errorMessage: "Firebase Authentication is not configured.",
            errorTarget: "auth"
        });
    }

    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    const platformModule = getPlatformAuthModule();

    try {
        if (platformModule.useRedirect) {
            return await startRedirectLogin(persistence);
        }

        // Trigger popup synchronously before any await so iOS WebKit preserves user activation.
        let credential;
        try {
            credential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        } catch (error) {
            if (platformModule.fallbackToRedirect && POPUP_FALLBACK_ERROR_CODES.has(error?.code)) {
                return await startRedirectLogin(persistence);
            }
            throw error;
        }

        await setPersistence(auth, persistence);
        return await resolveAuthenticatedOutcome(credential.user, null);
    } catch (error) {
        return createAuthOutcome("error", {
            errorMessage: error?.message || null,
            messageKey: "auth.loginFailed",
            errorTarget: "auth"
        });
    }
}

/**
 * Resolve any pending Google redirect login once per page load (StrictMode-safe).
 * @returns {Promise<AuthOutcome>}
 */
export function consumeRedirectLogin() {
    if (!redirectResultPromise) {
        redirectResultPromise = (async () => {
            if (!auth) return createAuthOutcome("none");

            const wasPending = consumePendingRedirectFlag();
            const credential = await getRedirectResult(auth, browserPopupRedirectResolver);

            if (credential?.user) {
                return resolveAuthenticatedOutcome(credential.user, null);
            }
            if (wasPending && !auth.currentUser) {
                return createAuthOutcome("error", {
                    messageKey: "auth.redirectStorageBlocked",
                    errorTarget: "auth"
                });
            }
            return createAuthOutcome("none");
        })().catch((error) => {
            redirectResultPromise = null;
            return createAuthOutcome("error", {
                errorMessage: error?.message || null,
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
            errorMessage: null,
            messageKey: "auth.googleSuccess"
        });
    } catch (error) {
        return createAuthOutcome("error", {
            errorMessage: error?.message || null,
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

    const uid = user.uid;
    await userRepository.deleteUser(uid);

    try {
        await deleteUser(user);
    } catch (error) {
        if (error.code === "auth/requires-recent-login") {
            await reauthenticateWithPopup(user, googleProvider, browserPopupRedirectResolver);
            await deleteUser(user);
        } else {
            throw error;
        }
    }
}
