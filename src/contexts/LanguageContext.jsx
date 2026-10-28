import {createContext, createElement, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {AuthContext} from "./AuthContext.jsx";
import {normalizeLanguage, resolveLangKey} from "../models/modelUtils.js";
import {getSavedLanguage, translate, STORAGE_LANG_KEY} from "../utils/translationUtils.js";

// eslint-disable-next-line react-refresh/only-export-components
export const LanguageContext = createContext(null);

/**
 * Provider React per la gestione reattiva della lingua in tutta l'applicazione.
 * Si sincronizza automaticamente con le preferenze utente (userProfile), il localStorage e il browser.
 */
export function LanguageProvider({ children, userProfile: userProfileProp, onLanguageChange }) {
    const auth = useContext(AuthContext);
    const activeProfile = userProfileProp || auth?.userProfile;

    const [langKey, setLangKeyState] = useState(() => {
        if (activeProfile?.language) {
            return resolveLangKey(activeProfile.language);
        }
        return getSavedLanguage();
    });

    // Sincronizzazione automatica quando cambia la lingua nel profilo utente autenticato
    useEffect(() => {
        if (activeProfile?.language) {
            const resolved = resolveLangKey(activeProfile.language);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLangKeyState(resolved);
            try {
                localStorage.setItem(STORAGE_LANG_KEY, resolved);
            } catch {
                // storage non disponibile
            }
        }
    }, [activeProfile?.language]);

    const setLanguage = useCallback((newLang) => {
        const resolved = resolveLangKey(newLang);
        setLangKeyState(resolved);
        try {
            localStorage.setItem(STORAGE_LANG_KEY, resolved);
        } catch {
            // storage non disponibile
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cameos:languageChange', { detail: { language: resolved } }));
        }

        if (auth?.updateUserProfile && auth?.user) {
            try {
                auth.updateUserProfile({ language: normalizeLanguage(resolved) }).catch(() => {});
            } catch {
                // ignora
            }
        }

        if (typeof onLanguageChange === 'function') {
            onLanguageChange(normalizeLanguage(resolved));
        }
    }, [auth, onLanguageChange]);

    // Listener per eventi di cambio lingua esterni
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleCustomChange = (e) => {
            const incoming = e?.detail?.language;
            if (incoming && incoming !== langKey) {
                setLangKeyState(resolveLangKey(incoming));
            }
        };
        window.addEventListener('cameos:languageChange', handleCustomChange);
        return () => window.removeEventListener('cameos:languageChange', handleCustomChange);
    }, [langKey]);

    const tBound = useCallback((path) => translate(path, langKey), [langKey]);

    const value = useMemo(() => ({
        language: langKey,
        langKey,
        normalizedLang: normalizeLanguage(langKey),
        setLanguage,
        t: tBound,
        isItalian: langKey === 'it',
        isEnglish: langKey === 'en'
    }), [langKey, setLanguage, tBound]);

    return createElement(LanguageContext.Provider, { value }, children);
}

/**
 * Hook per utilizzare le traduzioni e la lingua corrente in qualsiasi componente React.
 * @returns {{ language: 'it'|'en', langKey: 'it'|'en', normalizedLang: string, setLanguage: Function, t: (path: string) => string, isItalian: boolean, isEnglish: boolean }}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTranslation() {
    const context = useContext(LanguageContext);
    if (!context) {
        const fallbackLang = getSavedLanguage();
        return {
            language: fallbackLang,
            langKey: fallbackLang,
            normalizedLang: normalizeLanguage(fallbackLang),
            setLanguage: () => {},
            t: (path) => translate(path, fallbackLang),
            isItalian: fallbackLang === 'it',
            isEnglish: fallbackLang === 'en'
        };
    }
    return context;
}
