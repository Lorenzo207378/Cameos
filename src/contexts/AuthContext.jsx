import {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
    useMemo,
    useRef
} from "react";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../backend/firebase.js";
import {
    login as loginUser,
    logout as logoutUser,
    deleteUserProfile as deleteProfile
} from "../backend/user/authentication.js";
import { userRepository } from "../repository/index.js";
import { subscribeNetworkStatus } from "../utils/networkStatus.js";

/**
 * @typedef {Object} AuthContextValue
 * @property {import('firebase/auth').User|null} user
 * @property {import('../models/User.js').User|null} userProfile
 * @property {boolean} loading
 * @property {typeof loginUser} login
 * @property {typeof logoutUser} logout
 * @property {typeof deleteProfile} deleteUserProfile
 * @property {(updates: Object) => Promise<import('../models/User.js').User>} updateUserProfile
 * @property {(profile: import('../models/User.js').User|null) => void} refreshUserProfile
 */

/** @type {import('react').Context<AuthContextValue|null>} */
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(auth));
    const sessionId = useRef(0);

    useEffect(() => {
        if (!auth) return undefined;

        let active = true;
        const isCurrentSession = (id, uid) => active
            && sessionId.current === id
            && (auth?.currentUser?.uid || null) === uid;
        const fallbackTimer = setTimeout(() => {
            if (active) setLoading(false);
        }, 1500);

        const syncSession = async (currentUser) => {
            if (!active) return;
            clearTimeout(fallbackTimer);
            const currentSessionId = ++sessionId.current;
            const activeUid = currentUser?.uid || null;

            setUser(currentUser);
            setUserProfile(null);
            setLoading(Boolean(activeUid));

            try {
                if (!activeUid) {
                    await userRepository.clearSessionUser();
                    return;
                }
                const cachedProfile = await userRepository.getSessionUser(activeUid);
                if (!isCurrentSession(currentSessionId, activeUid)) return;
                const domainUser = cachedProfile || await userRepository.saveUser(currentUser);
                if (isCurrentSession(currentSessionId, activeUid)) {
                    setUserProfile(domainUser);
                }
            } catch {
                if (isCurrentSession(currentSessionId, activeUid)) setUserProfile(null);
            } finally {
                if (isCurrentSession(currentSessionId, activeUid)) setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, syncSession, () => {
            clearTimeout(fallbackTimer);
            if (active) setLoading(false);
        });

        const unsubscribeOnline = subscribeNetworkStatus((online) => {
            if (!online) return;
            const onlineUid = auth?.currentUser?.uid;
            const currentSessionId = sessionId.current;
            if (!onlineUid) return;
            userRepository.syncPendingChanges(onlineUid).then((synced) => {
                if (synced && isCurrentSession(currentSessionId, onlineUid)) {
                    setUserProfile(synced);
                }
            }).catch(() => {});
        });

        return () => {
            active = false;
            sessionId.current += 1;
            clearTimeout(fallbackTimer);
            unsubscribe();
            unsubscribeOnline();
        };
    }, []);

    const updateUserProfile = useCallback(async (updates) => {
        const uid = auth?.currentUser?.uid;
        if (!uid) throw new Error("No authenticated user found.");
        const currentSessionId = sessionId.current;
        const updated = await userRepository.updateUser(uid, updates);
        if (sessionId.current === currentSessionId && auth?.currentUser?.uid === uid) {
            setUserProfile(updated);
        }
        return updated;
    }, []);

    const refreshUserProfile = useCallback((profile) => {
        const uid = auth?.currentUser?.uid;
        if (!uid) return;
        if (!profile || profile.uid === uid) {
            setUserProfile(profile || null);
        }
    }, []);

    const value = useMemo(() => ({
        user,
        userProfile,
        loading,
        login: loginUser,
        logout: logoutUser,
        deleteUserProfile: deleteProfile,
        updateUserProfile,
        refreshUserProfile
    }), [user, userProfile, loading, updateUserProfile, refreshUserProfile]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * @returns {AuthContextValue}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
