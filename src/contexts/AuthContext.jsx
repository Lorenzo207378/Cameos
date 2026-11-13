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
import { auth } from "../firebase.js";
import {
    login as loginUser,
    logout as logoutUser,
    deleteUserProfile as deleteProfile
} from "../backend/user/authentication.js";
import { userRepository } from "../repository/index.js";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const sessionId = useRef(0);

    useEffect(() => {
        let active = true;
        const isCurrentSession = (id, uid) => active
            && sessionId.current === id
            && (auth.currentUser?.uid || null) === uid;
        const fallbackTimer = setTimeout(() => {
            if (active) setLoading(false);
        }, 1500);

        const unsubscribe = onAuthStateChanged(
            auth,
            async (currentUser) => {
                if (!active) return;
                clearTimeout(fallbackTimer);
                const currentSessionId = ++sessionId.current;
                const activeUid = currentUser?.uid || null;

                setUser(currentUser);
                setUserProfile(null);
                setLoading(Boolean(activeUid));

                try {
                    if (activeUid) {
                        let domainUser = await userRepository.getSessionUser(activeUid);
                        if (!isCurrentSession(currentSessionId, activeUid)) return;
                        if (!domainUser) {
                            domainUser = await userRepository.saveUser(currentUser);
                        }
                        if (isCurrentSession(currentSessionId, activeUid)) {
                            setUserProfile(domainUser);
                        }
                    } else {
                        await userRepository.clearSessionUser();
                    }
                } catch {
                    if (isCurrentSession(currentSessionId, activeUid)) {
                        setUserProfile(null);
                    }
                } finally {
                    if (isCurrentSession(currentSessionId, activeUid)) {
                        setLoading(false);
                    }
                }
            },
            () => {
                clearTimeout(fallbackTimer);
                if (active) setLoading(false);
            }
        );

        // Listen for online reconnection to sync any pending offline user updates to Firestore
        const handleOnline = () => {
            const onlineUid = auth.currentUser?.uid;
            const currentSessionId = sessionId.current;
            if (onlineUid) {
                userRepository.syncPendingChanges(onlineUid).then((synced) => {
                    if (synced && isCurrentSession(currentSessionId, onlineUid)) {
                        setUserProfile(synced);
                    }
                }).catch(() => {});
            }
        };

        if (typeof window !== "undefined") {
            window.addEventListener("online", handleOnline);
        }

        return () => {
            active = false;
            sessionId.current += 1;
            clearTimeout(fallbackTimer);
            unsubscribe();
            if (typeof window !== "undefined") {
                window.removeEventListener("online", handleOnline);
            }
        };
    }, []);

    const updateUserProfile = useCallback(async (updates) => {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("No authenticated user found.");
        const currentSessionId = sessionId.current;
        const updated = await userRepository.updateUser(uid, updates);
        if (sessionId.current === currentSessionId && auth.currentUser?.uid === uid) {
            setUserProfile(updated);
        }
        return updated;
    }, []);

    const value = useMemo(() => ({
        user,
        userProfile,
        loading,
        login: loginUser,
        logout: logoutUser,
        deleteUserProfile: deleteProfile,
        updateUserProfile
    }), [user, userProfile, loading, updateUserProfile]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
