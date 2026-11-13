import {
    Card as BsCard,
    Form as BsForm,
    Button as BsButton
} from "react-bootstrap";

import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    login,
    validateUsername
} from "../backend/user/authentication.js";
import { useTranslation } from "../contexts/LanguageContext.jsx";
import SpotlightCard from "../components/reactbits/SpotlightCard.jsx";
import "../css/auth/authentication.css";

const GoogleIcon = new URL('../assets/google.png', import.meta.url).href;

export default function Authentication() {
    const { t } = useTranslation();
    const [needsUsername, setNeedsUsername] = useState(false);
    const [authMessage, setAuthMessage] = useState("");
    const [authError, setAuthError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const {
        register,
        handleSubmit
    } = useForm();

    const handleGoogleLogin = async (rememberMe = true) => {
        setAuthError("");
        setAuthMessage("");
        setIsSubmitting(true);
        try {
            const { needsUsername: missingUsername } = await login(rememberMe);
            if (!mountedRef.current) return;
            if (missingUsername) {
                setNeedsUsername(true);
                setAuthMessage(t('auth.googleUsernameNeeded'));
            } else {
                setNeedsUsername(false);
                setAuthMessage(t('auth.googleSuccess'));
                navigate("/Cameos/");
            }
        } catch (error) {
            if (mountedRef.current) {
                setAuthError(error.message || t('auth.loginFailed'));
            }
        } finally {
            if (mountedRef.current) {
                setIsSubmitting(false);
            }
        }
    };

    const handleUsernameValidation = async (username) => {
        setUsernameError("");
        setAuthError("");
        setIsSubmitting(true);
        try {
            const result = await validateUsername(username);
            if (!mountedRef.current) return;
            if (!result.isValid) {
                setUsernameError(result.message);
                return;
            }
            setNeedsUsername(false);
            setAuthMessage(result.message);
            navigate("/Cameos/");
        } catch (error) {
            if (mountedRef.current) {
                setUsernameError(error.message || t('auth.usernameValidationFailed'));
            }
        } finally {
            if (mountedRef.current) {
                setIsSubmitting(false);
            }
        }
    };

    const handleFormSubmit = async (data) => {
        if (isSubmitting) return;
        if (!needsUsername) {
            await handleGoogleLogin(data.rememberMe);
        } else {
            await handleUsernameValidation(data.username);
        }
    };

    return (
        <div className={"page"}>
            <SpotlightCard
                spotlightColor="rgba(16, 185, 129, 0.24)"
                spotlightSize={280}
                intensity={0.22}
                borderGlow={0.7}
                className="auth-spotlight-card glass-card card-border-primary rounded-4 p-0"
            >
                <BsCard className={"auth-card border-0 bg-transparent"}>
                <BsCard.Body>
                    <BsCard.Title
                        className="auth-title"
                    >
                        {t('auth.loginTitle')}{" "}
                        <span
                            className="auth-brand-name"
                        >
                            Cameos
                        </span>!
                    </BsCard.Title>
                    <BsCard.Subtitle
                        className="mb-2 auth-subtitle"
                    >
                        {needsUsername ? t('auth.usernamePrompt') : t('auth.loginWithGoogle')}
                    </BsCard.Subtitle>

                    <BsForm
                        className={"mt-4"}
                        onSubmit={(event) => handleSubmit(handleFormSubmit)(event)}
                        noValidate>

                        <BsButton
                            variant="primary"
                            className="auth-submit-button centered-content d-block mx-auto p-2 ps-3 pe-3"
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {needsUsername ? t('auth.saveAndContinue') : t('auth.loginWithGoogle')}
                            {!needsUsername && (
                                <img
                                    src={GoogleIcon}
                                    alt="Google Icon"
                                    className="auth-google-icon"
                                />
                            )}
                        </BsButton>

                        {needsUsername &&
                            <BsForm.Group className="mb-3 mt-3" controlId="formUsername">
                                <BsForm.Control
                                    type="text"
                                    placeholder={t('auth.usernamePlaceholder')}
                                    className="form-control"
                                    {...register("username", {
                                        required: t('auth.usernameRequired'),
                                        minLength: {
                                            value: 3,
                                            message: t('auth.usernameMinLength')
                                        }
                                    })} />
                                {usernameError &&
                                    <BsForm.Text className="d-block text-danger mt-1" role="alert">
                                        {usernameError}
                                    </BsForm.Text>}
                            </BsForm.Group>}

                        <BsForm.Group className="mt-3" controlId="formRememberMe">
                            <BsForm.Check
                                type="checkbox"
                                label={t('auth.rememberMe')}
                                defaultChecked={true}
                                className="remember-me"
                                inputClassName="remember-me-checkbox"
                                labelClassName="remember-me-label"
                                {...register("rememberMe")}
                            />
                        </BsForm.Group>

                        {authMessage && (
                            <BsForm.Text
                                className="auth-message d-block mt-2"
                            >
                                {authMessage}
                            </BsForm.Text>
                        )}
                        {authError && (
                            <BsForm.Text className="d-block mt-2 text-danger" role="alert">
                                {authError}
                            </BsForm.Text>
                        )}
                    </BsForm>
                </BsCard.Body>
            </BsCard>
            </SpotlightCard>
        </div>
    )
}
