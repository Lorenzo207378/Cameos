import {
    Card as BsCard,
    Form as BsForm,
    Button as BsButton
} from "react-bootstrap";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    login,
    validateUsername
} from "../backend/user/authentication.js";
import GoogleIcon from "../assets/google.png";
import { useTranslation } from "../utils/translations.js";
import "../css/auth/authentication.css";

export default function Authentication() {
    const { t } = useTranslation();
    const [needsUsername, setNeedsUsername] = useState(false);
    const [authMessage, setAuthMessage] = useState("");
    const [authError, setAuthError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const navigate = useNavigate();

    const {
        register,
        handleSubmit
    } = useForm();

    const handleGoogleLogin = async (rememberMe = true) => {
        setAuthError("");
        setAuthMessage("");
        try {
            const { needsUsername: missingUsername } = await login(rememberMe);
            if (missingUsername) {
                setNeedsUsername(true);
                setAuthMessage(t('auth.googleUsernameNeeded'));
            } else {
                setNeedsUsername(false);
                setAuthMessage(t('auth.googleSuccess'));
                navigate("/Cameos/");
            }
        } catch (error) {
            setAuthError(error.message || t('auth.loginFailed'));
        }
    };

    const handleUsernameValidation = async (username) => {
        setUsernameError("");
        setAuthError("");
        try {
            const result = await validateUsername(username);
            if (!result.isValid) {
                setUsernameError(result.message);
                return;
            }
            setNeedsUsername(false);
            setAuthMessage(result.message);
            navigate("/Cameos/");
        } catch (error) {
            setUsernameError(error.message || "Error validating username.");
        }
    };

    const onSubmit = async (data) => {
        if (!needsUsername) {
            await handleGoogleLogin(data.rememberMe);
        } else {
            await handleUsernameValidation(data.username);
        }
    };

    return (
        <div className={"page"}>
            <BsCard className={"card-2pxb-dark-background card-border-primary"}>
                <BsCard.Body>
                    <BsCard.Title
                        className="auth-title"
                    >
                        {t('auth.loginTitle')}{" "}
                        <span
                            className="placeholder-wave auth-brand-name"
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
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate>

                        <BsButton
                            variant="primary"
                            className="auth-submit-button centered-content d-block mx-auto p-2 ps-3 pe-3"
                            type="submit"
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
                                        required: "Username is required",
                                        minLength: {
                                            value: 3,
                                            message: "Username must be at least 3 characters"
                                        }
                                    })} />
                                {usernameError &&
                                    <BsForm.Text className="d-block text-danger mt-1">
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
                            <BsForm.Text className="d-block mt-2 text-danger">
                                {authError}
                            </BsForm.Text>
                        )}
                    </BsForm>
                </BsCard.Body>
            </BsCard>
        </div>
    )
}
