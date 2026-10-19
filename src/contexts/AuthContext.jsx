import {
    createContext,
    useState,
    useEffect,
    useContext
} from "react";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase.js";
import {
    insertUserToFirestore,
    login as loginUser,
    signUp as signUpUser,
    logout as logoutUser
} from "../backend/user/authentication.js";

const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return(
        <AuthContext.Provider value={{
            user,
            loading,
            signUp: signUpUser,
            login: loginUser,
            logout: logoutUser
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