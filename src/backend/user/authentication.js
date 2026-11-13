import {
    browserLocalPersistence,
    browserPopupRedirectResolver,
    browserSessionPersistence,
    deleteUser,
    GoogleAuthProvider,
    reauthenticateWithPopup,
    signInWithPopup,
    signOut,
    setPersistence,
    updateProfile
} from "firebase/auth";
import { auth } from "../../firebase.js";
import { userBackend } from "./UserBackend.js";
import { userRepository } from "../../repository/index.js";

const googleProvider = new GoogleAuthProvider();
const invalidUsername = (message) => ({ isValid: false, message });

/**
 * Validate and assign a unique username for the authenticated user.
 * @param {string} username
 * @param {import("firebase/auth").User|null} [user=auth.currentUser]
 * @returns {Promise<Object>}
 */
export async function validateUsername(username, user = auth.currentUser) {
    const trimmedUsername = username ? username.trim() : "";
    if (!trimmedUsername) return invalidUsername("Username is required.");
    if (trimmedUsername.length < 3) return invalidUsername("Username must be at least 3 characters.");

    const isAvailable = await userBackend.isUsernameAvailable(trimmedUsername, user?.uid || null);
    if (!isAvailable) return invalidUsername("Username is already taken.");

    let userProfile = null;
    if (user) {
        await updateProfile(user, { displayName: trimmedUsername });
        userProfile = await userRepository.saveUser(user, trimmedUsername);
    }

    return {
        isValid: true,
        username: trimmedUsername,
        userProfile,
        message: "Username confirmed successfully."
    };
}

/**
 * Sign in with Google popup and persist session in Firebase Auth + UserRepository.
 * @param {boolean} [rememberMe=true]
 * @returns {Promise<Object>}
 */
export async function login(rememberMe = true) {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

    // initializeAuth omits the popup resolver to defer iframe setup until login.
    const credential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    const userProfile = await userRepository.saveUser(credential.user, null);

    return {
        user: credential.user,
        userProfile,
        needsUsername: !userProfile?.username
    };
}

/**
 * Clear local IndexedDB session user and sign out from Firebase Auth.
 * @returns {Promise<void>}
 */
export async function logout() {
    await userRepository.clearSessionUser();
    await signOut(auth);
}

/**
 * Delete user profile from Firestore, IndexedDB, and Firebase Auth.
 * @param {import("firebase/auth").User|null} [user=auth.currentUser]
 * @returns {Promise<void>}
 */
export async function deleteUserProfile(user = auth.currentUser) {
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
