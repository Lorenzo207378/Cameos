import {
    browserLocalPersistence,
    browserSessionPersistence,
    deleteUser,
    GoogleAuthProvider,
    reauthenticateWithPopup,
    signInWithPopup,
    signOut,
    setPersistence,
    updateProfile
} from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { auth, db, storage } from "../../firebase.js";
import User from "../../models/User.js";

const googleProvider = new GoogleAuthProvider();

export async function insertUserToFirestore(user, username = null) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const newUser = new User({
            uid: user.uid,
            email: user.email,
            username: username ?? null,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        await setDoc(userRef, { ...newUser });
        return newUser;
    } else {
        const updates = { updatedAt: serverTimestamp() };
        if (username) {
            updates.username = username;
        }
        if (user.photoURL) {
            updates.photoURL = user.photoURL;
        }
        await setDoc(userRef, updates, { merge: true });
        return { ...userSnap.data(), ...updates };
    }
}

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

    const usersRef = collection(db, "users");
    const usernameQuery = query(usersRef, where("username", "==", trimmedUsername));
    const querySnapshot = await getDocs(usernameQuery);

    const alreadyExists = querySnapshot.docs.some(
        (docSnap) => docSnap.id !== user?.uid
    );

    if (alreadyExists) {
        return {
            isValid: false,
            message: "Username is already taken."
        };
    }

    if (user) {
        await updateProfile(user, { displayName: trimmedUsername });
        await insertUserToFirestore(user, trimmedUsername);
    }

    return {
        isValid: true,
        username: trimmedUsername,
        message: "Username confirmed successfully."
    };
}

export async function login(rememberMe = true) {
    await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const credential = await signInWithPopup(auth, googleProvider);
    const userData = await insertUserToFirestore(credential.user);

    return {
        user: credential.user,
        needsUsername: !userData?.username
    };
}

export async function logout() {
    await signOut(auth);
}

export async function deleteUserProfile(user = auth.currentUser) {
    if (!user) {
        throw new Error("No authenticated user found.");
    }

    const uid = user.uid;


    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);

    try {
        await deleteUser(user);
    } catch (error) {
        if (error.code === "auth/requires-recent-login") {
            await reauthenticateWithPopup(user, googleProvider);
            await deleteUser(user);
        } else {
            throw error;
        }
    }
}
