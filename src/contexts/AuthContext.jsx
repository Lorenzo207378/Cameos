import {
    createContext,
    useState,
    useEffect,
    useContext
} from "react";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase.js";
import {
    login as loginUser,
    logout as logoutUser,
    deleteUserProfile as deleteProfile
} from "../backend/user/authentication.js";

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fallbackTimer = setTimeout(() => {
            setLoading(false);
        }, 1500);

        const unsubscribe = onAuthStateChanged(
            auth,
            (currentUser) => {
                clearTimeout(fallbackTimer);
                setUser(currentUser);
                setLoading(false);
            },
            () => {
                clearTimeout(fallbackTimer);
                setLoading(false);
            }
        );

        return () => {
            clearTimeout(fallbackTimer);
            unsubscribe();
        };
    }, []);

    return(
        <AuthContext.Provider value={{
            user,
            loading,
            login: loginUser,
            logout: logoutUser,
            deleteUserProfile: deleteProfile
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
