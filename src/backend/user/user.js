import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    updateDoc
} from "firebase/firestore";
import { db } from "../../firebase.js";

const USERS_COL = "users";

export async function getUserDoc(uid) {
    const ref = doc(db, USERS_COL, uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

export async function mergeUserDoc(uid, data) {
    const ref = doc(db, USERS_COL, uid);
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function setArrayField(uid, field, value) {
    const ref = doc(db, USERS_COL, uid);
    await updateDoc(ref, {
        [field]: value,
        updatedAt: serverTimestamp()
    });
}

export async function pushToArrayField(uid, field, item) {
    const ref = doc(db, USERS_COL, uid);
    await updateDoc(ref, {
        [field]: [...(await getItemArray(uid, field)), item],
        updatedAt: serverTimestamp()
    });
}

export async function removeFromArrayField(uid, field, predicate) {
    const current = await getItemArray(uid, field);
    const updated = current.filter((item) => !predicate(item));
    await setArrayField(uid, field, updated);
}

async function getItemArray(uid, field) {
    const data = await getUserDoc(uid);
    return data?.[field] || [];
}