import {createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useState} from "react";
import {AuthContext} from "./AuthContext.jsx";
import {normalizeLanguage, resolveLangKey} from "../models/utils/index.js";
import {getSavedLanguage, translate, formatTranslation, STORAGE_LANG_KEY} from "../utils/translations.js";

/**
 * @typedef {Object} TranslationContextValue
 * @property {'it'|'en'} language
 * @property {'it'|'en'} langKey
 * @property {string} normalizedLang
 * @property {(newLang: string) => void} setLanguage
 * @property {(path: string) => string} t
 * @property {(text: string, params?: Object<string, *>) => string} formatTranslation
 * @property {boolean} isItalian
 * @property {boolean} isEnglish
 */

/** @type {import('react').Context<TranslationContextValue|null>} */
const LanguageContext = createContext(null);

/**
 * Provider React per la gestione reattiva della lingua in tutta l'applicazione.
 * Si sincronizza automaticamente con le preferenze utente (userProfile), il localStorage e il browser.
 */
export function LanguageProvider({ children, userProfile: userProfileProp, onLanguageChange }) {
    const auth = useContext(AuthContext);
    const activeProfile = userProfileProp || auth?.userProfile;
    const profileLang = activeProfile?.language ? resolveLangKey(activeProfile.language) : null;

    const [langKey, setLangKeyState] = useState(() => profileLang || getSavedLanguage());
    const [prevProfileLang, setPrevProfileLang] = useState(profileLang);

    // Sync profile language during render to avoid cascading setState-in-effect renders
    if (profileLang && profileLang !== prevProfileLang) {
        setPrevProfileLang(profileLang);
        setLangKeyState(profileLang);
    }

    // Sincronizzazione localStorage quando cambia la lingua nel profilo utente autenticato
    useEffect(() => {
        if (!profileLang) return;
        try {
            localStorage.setItem(STORAGE_LANG_KEY, profileLang);
        } catch {
            // storage non disponibile
        }
    }, [profileLang]);

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

    const onExternalLanguageChange = useEffectEvent((e) => {
        const incoming = e?.detail?.language;
        if (incoming && incoming !== langKey) {
            setLangKeyState(resolveLangKey(incoming));
        }
    });

    // Listener per eventi di cambio lingua esterni
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        window.addEventListener('cameos:languageChange', onExternalLanguageChange);
        return () => window.removeEventListener('cameos:languageChange', onExternalLanguageChange);
    }, []);

    const tBound = useCallback((path) => translate(path, langKey), [langKey]);

    const value = useMemo(() => ({
        language: langKey,
        langKey,
        normalizedLang: normalizeLanguage(langKey),
        setLanguage,
        t: tBound,
        formatTranslation,
        isItalian: langKey === 'it',
        isEnglish: langKey === 'en'
    }), [langKey, setLanguage, tBound]);

    return (
        <LanguageContext value={value}>
            {children}
        </LanguageContext>
    );
}

/* eslint-disable react-refresh/only-export-components */
/**
 * Hook per utilizzare le traduzioni e la lingua corrente in qualsiasi componente React.
 * @returns {TranslationContextValue}
 */
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
            formatTranslation,
            isItalian: fallbackLang === 'it',
            isEnglish: fallbackLang === 'en'
        };
    }
    return context;
}
/* eslint-enable react-refresh/only-export-components */
