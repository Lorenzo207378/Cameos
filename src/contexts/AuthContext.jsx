import {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback
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

    useEffect(() => {
        let isMounted = true;
        const fallbackTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 1500);

        const unsubscribe = onAuthStateChanged(
            auth,
            async (currentUser) => {
                clearTimeout(fallbackTimer);
                if (!isMounted) return;

                setUser(currentUser);

                if (currentUser?.uid) {
                    try {
                        let domainUser = await userRepository.getSessionUser(currentUser.uid);
                        if (!domainUser) {
                            domainUser = await userRepository.saveUser(currentUser);
                        }
                        if (isMounted) setUserProfile(domainUser);
                    } catch {
                        if (isMounted) setUserProfile(null);
                    }
                } else {
                    await userRepository.clearSessionUser();
                    if (isMounted) setUserProfile(null);
                }

                if (isMounted) setLoading(false);
            },
            () => {
                clearTimeout(fallbackTimer);
                if (isMounted) setLoading(false);
            }
        );

        // Listen for online reconnection to sync any pending offline user updates to Firestore
        const handleOnline = () => {
            if (auth.currentUser?.uid) {
                userRepository.syncPendingChanges(auth.currentUser.uid).then((synced) => {
                    if (synced && isMounted) {
                        setUserProfile(synced);
                    }
                });
            }
        };

        if (typeof window !== "undefined") {
            window.addEventListener("online", handleOnline);
        }

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimer);
            unsubscribe();
            if (typeof window !== "undefined") {
                window.removeEventListener("online", handleOnline);
            }
        };
    }, []);

    const updateUserProfile = useCallback(async (updates) => {
        const uid = user?.uid || userProfile?.uid;
        if (!uid) throw new Error("No authenticated user found.");
        const updated = await userRepository.updateUser(uid, updates);
        setUserProfile(updated);
        return updated;
    }, [user, userProfile]);

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            login: loginUser,
            logout: logoutUser,
            deleteUserProfile: deleteProfile,
            updateUserProfile
        }}>
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
