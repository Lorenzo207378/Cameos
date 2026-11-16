import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    consumeRedirectLogin,
    createAuthOutcome,
    getPlatformAuthModule,
    isSignedIn,
    login,
    validateUsername
} from "../../backend/user/authentication.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useTranslation } from "../../contexts/LanguageContext.jsx";

const POPUP_RECOVERY_DELAY_MS = 2500;

/**
 * Manage Google popup/redirect login lifecycle, platform recovery, and common AuthOutcome handling.
 */
export function useAuthLogin() {
    const { t } = useTranslation();
    const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
    const navigate = useNavigate();

    const [needsUsername, setNeedsUsername] = useState(false);
    const [authMessage, setAuthMessage] = useState("");
    const [authError, setAuthError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const mountedRef = useRef(true);
    const attemptCounterRef = useRef(0);
    const popupAttemptIdRef = useRef(0);
    const popupRecoveryTimerRef = useRef(/** @type {number|null} */ (null));

    const requiresUsername = needsUsername
        || Boolean(!authLoading && user && userProfile && !userProfile.username);
    const shouldRedirectHome = Boolean(
        !authLoading && user && !isSubmitting && !requiresUsername && (userProfile?.username || !userProfile)
    );

    const clearPopupRecoveryTimer = () => {
        if (popupRecoveryTimerRef.current !== null) {
            window.clearTimeout(popupRecoveryTimerRef.current);
            popupRecoveryTimerRef.current = null;
        }
    };

    const applyOutcome = (outcome) => {
        if (!outcome || outcome.status === "none") return;

        if (outcome.status === "authenticated") {
            refreshUserProfile?.(outcome.userProfile);
            setNeedsUsername(false);
            setUsernameError("");
            setAuthError("");
            if (outcome.messageKey) setAuthMessage(t(outcome.messageKey));
            navigate("/Cameos/", { replace: true });
            return;
        }

        if (outcome.status === "needs_username") {
            refreshUserProfile?.(outcome.userProfile);
            setNeedsUsername(true);
            setUsernameError("");
            setAuthError("");
            if (outcome.messageKey) setAuthMessage(t(outcome.messageKey));
            return;
        }

        if (outcome.status === "error") {
            const message = outcome.errorMessage
                || (outcome.messageKey ? t(outcome.messageKey) : t("auth.loginFailed"));
            if (outcome.errorTarget === "username") {
                setUsernameError(message);
            } else {
                setAuthError(message);
            }
        }
    };

    const onRedirectOutcome = useEffectEvent((outcome) => {
        applyOutcome(outcome);
    });

    const onReturnToLoginPage = useEffectEvent(() => {
        const pendingAttemptId = popupAttemptIdRef.current;
        if (!pendingAttemptId) return;

        clearPopupRecoveryTimer();
        popupRecoveryTimerRef.current = window.setTimeout(() => {
            popupRecoveryTimerRef.current = null;
            if (!mountedRef.current || popupAttemptIdRef.current !== pendingAttemptId) return;

            if (!isSignedIn()) {
                popupAttemptIdRef.current = 0;
                setIsSubmitting(false);
                applyOutcome(createAuthOutcome("error", {
                    messageKey: "auth.popupNotCompleted",
                    errorTarget: "auth"
                }));
            }
        }, POPUP_RECOVERY_DELAY_MS);
    });

    useEffect(() => {
        let cancelled = false;
        consumeRedirectLogin().then((outcome) => {
            if (!cancelled) onRedirectOutcome(outcome);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        if (!getPlatformAuthModule().recoverStalledPopup) {
            return () => {
                mountedRef.current = false;
            };
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") onReturnToLoginPage();
        };
        const handleWindowFocus = () => onReturnToLoginPage();

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleWindowFocus);

        return () => {
            mountedRef.current = false;
            clearPopupRecoveryTimer();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, []);

    const startGoogleLogin = async (rememberMe = true) => {
        if (isSubmitting) return;
        const attemptId = ++attemptCounterRef.current;
        popupAttemptIdRef.current = attemptId;
        setAuthError("");
        setAuthMessage("");
        setIsSubmitting(true);

        try {
            const outcome = await login(rememberMe);
            if (!mountedRef.current || outcome.redirected) return;

            clearPopupRecoveryTimer();
            const isCurrentAttempt = popupAttemptIdRef.current === attemptId;
            if (isCurrentAttempt) popupAttemptIdRef.current = 0;

            if (outcome.status !== "error" || isCurrentAttempt) {
                applyOutcome(outcome);
            }
        } finally {
            if (mountedRef.current && popupAttemptIdRef.current === 0) {
                setIsSubmitting(false);
            }
        }
    };

    const submitUsername = async (username) => {
        if (isSubmitting) return;
        setUsernameError("");
        setAuthError("");
        setIsSubmitting(true);

        try {
            const outcome = await validateUsername(username);
            if (!mountedRef.current) return;
            applyOutcome(outcome);
        } finally {
            if (mountedRef.current) {
                setIsSubmitting(false);
            }
        }
    };

    return {
        requiresUsername,
        shouldRedirectHome,
        isSubmitting,
        authMessage,
        authError,
        usernameError,
        startGoogleLogin,
        submitUsername
    };
}
