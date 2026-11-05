import {
    doc,
    getDoc
} from "firebase/firestore";
import { db } from "../../firebase.js";

const USERS_COL = "users";

export async function getUserDoc(uid) {
    const ref = doc(db, USERS_COL, uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}
