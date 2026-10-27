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
import { userRepository } from "../../repository/user/UserRepository.js";

const googleProvider = new GoogleAuthProvider();

/**
 * Create or update the user in Firestore and local IndexedDB via UserRepository.
 * Always returns a `User` domain model instance.
 * @param {Object} user
 * @param {string|null} [username=null]
 * @returns {Promise<import("../../models/User.js").User>}
 */
export async function insertUserToFirestore(user, username = null) {
    return userRepository.saveUser(user, username);
}

/**
 * Validate and assign a unique username for the authenticated user.
 * @param {string} username
 * @param {Object|null} [user=auth.currentUser]
 * @returns {Promise<Object>}
 */
export async function validateUsername(username, user = auth.currentUser) {
    const trimmedUsername = username ? username.trim() : "";

    if (!trimmedUsername) {
        return {
            isValid: false,
            message: "Username is required."
        };
    }

    if (trimmedUsername.length < 3) {
        return {
            isValid: false,
            message: "Username must be at least 3 characters."
        };
    }

    const isAvailable = await userBackend.isUsernameAvailable(trimmedUsername, user?.uid || null);

    if (!isAvailable) {
        return {
            isValid: false,
            message: "Username is already taken."
        };
    }

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
    await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    // initializeAuth omits the popup resolver to defer iframe setup until login.
    const credential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    const userData = await insertUserToFirestore(credential.user);

    return {
        user: credential.user,
        userProfile: userData,
        needsUsername: !userData?.username
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
 * @param {Object|null} [user=auth.currentUser]
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
