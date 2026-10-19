import {
    browserLocalPersistence,
    browserSessionPersistence,
    // createUserWithEmailAndPassword,
    // signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    setPersistence,
    updateProfile
} from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../../firebase.js";
import User from "../../models/user/User.js";

const googleProvider = new GoogleAuthProvider();

/* ==========================================================================
   VECCHIA IMPLEMENTAZIONE CON EMAIL E PASSWORD
   ========================================================================== */

/*
// Vecchia implementazione di insertUserToFirestore (Email e Password)
export async function insertUserToFirestore(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const newUser = new User(user);
        await setDoc(userRef, newUser);

        return newUser;
    }else{
        await setDoc(userRef, { updatedAt: serverTimestamp() }, { merge: true });
        return userSnap.data();
    }
}

// Vecchia implementazione di signUp con Email e Password
export async function signUp(
    email,
    password,
    userName,
    rememberMe = false,
    profilePhoto = null
){
    await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {};
    if (userName) {
        profile.displayName = userName.trim();
    }
    if (profilePhoto) {
        const photoRef = ref(storage, `profile-photos/${credential.user.uid}`);
        await uploadBytes(photoRef, profilePhoto, { contentType: profilePhoto.type });
        profile.photoURL = await getDownloadURL(photoRef);
    }
    if (Object.keys(profile).length > 0) {
        await updateProfile(credential.user, profile);
    }
    await insertUserToFirestore(credential.user);
    return credential.user;
}

// Vecchia implementazione di login con Email e Password
export async function login(email, password, rememberMe = false){
    await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await insertUserToFirestore(credential.user);
    return credential.user;
}

// Vecchia implementazione di logout (Email e Password)
export async function logout(){
    await signOut(auth);
}
*/

/* ==========================================================================
   NUOVA IMPLEMENTAZIONE CON GOOGLE OAUTH
   ========================================================================== */

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

export async function signUp(rememberMe = false, profilePhoto = null) {
    await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const credential = await signInWithPopup(auth, googleProvider);

    if (profilePhoto) {
        const photoRef = ref(storage, `profile-photos/${credential.user.uid}`);
        await uploadBytes(photoRef, profilePhoto, { contentType: profilePhoto.type });
        const photoURL = await getDownloadURL(photoRef);
        await updateProfile(credential.user, { photoURL });
    }

    await insertUserToFirestore(credential.user);
    return credential.user;
}

export async function login(rememberMe = false) {
    await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const credential = await signInWithPopup(auth, googleProvider);
    await insertUserToFirestore(credential.user);
    return credential.user;
}

export async function logout() {
    await signOut(auth);
}
