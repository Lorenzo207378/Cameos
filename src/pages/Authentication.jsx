import {
    Card as BsCard,
    Form as BsForm,
    Button as BsButton
} from "react-bootstrap";

import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { useAuthLogin } from "../utils/use/useAuthLogin.js";
import { useTranslation } from "../contexts/LanguageContext.jsx";
import { APP_ROUTES } from "../utils/appRoutes.js";
import SpotlightCard from "../components/reactbits/SpotlightCard.jsx";
import "../css/auth/authentication.css";

const GoogleIcon = new URL('../assets/google.png', import.meta.url).href;

export default function Authentication() {
    const { t } = useTranslation();
    const {
        requiresUsername,
        shouldRedirectHome,
        isSubmitting,
        authMessage,
        authError,
        usernameError,
        startGoogleLogin,
        submitUsername
    } = useAuthLogin();

    const {
        register,
        getValues,
        handleSubmit
    } = useForm({
        defaultValues: {
            rememberMe: true,
            username: ""
        }
    });

    if (shouldRedirectHome) {
        return <Navigate to={APP_ROUTES.home} replace />;
    }

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
                        <BsCard.Title className="auth-title">
                            {t('auth.loginTitle')}{" "}
                            <span className="auth-brand-name">
                                Cameos
                            </span>!
                        </BsCard.Title>
                        <BsCard.Subtitle className="mb-2 auth-subtitle">
                            {requiresUsername ? t('auth.usernamePrompt') : t('auth.loginWithGoogle')}
                        </BsCard.Subtitle>

                        <BsForm
                            className={"mt-4"}
                            onSubmit={(event) => {
                                if (!requiresUsername) {
                                    event.preventDefault();
                                    return;
                                }
                                void handleSubmit((data) => submitUsername(data.username))(event);
                            }}
                            noValidate>

                            <BsButton
                                variant="primary"
                                className="auth-submit-button centered-content d-block mx-auto p-2 ps-3 pe-3"
                                type={requiresUsername ? "submit" : "button"}
                                onClick={requiresUsername
                                    ? undefined
                                    : () => void startGoogleLogin(Boolean(getValues("rememberMe")))}
                                disabled={isSubmitting}
                            >
                                {requiresUsername ? t('auth.saveAndContinue') : t('auth.loginWithGoogle')}
                                {!requiresUsername && (
                                    <img
                                        src={GoogleIcon}
                                        alt="Google Icon"
                                        className="auth-google-icon ms-2"
                                    />
                                )}
                            </BsButton>

                            {requiresUsername && (
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
                                    {usernameError && (
                                        <BsForm.Text className="d-block text-danger mt-1" role="alert">
                                            {usernameError}
                                        </BsForm.Text>
                                    )}
                                </BsForm.Group>
                            )}

                            <BsForm.Group className="mt-3" controlId="formRememberMe">
                                <BsForm.Check
                                    type="checkbox"
                                    label={t('auth.rememberMe')}
                                    defaultChecked={true}
                                    className="remember-me"
                                    {...register("rememberMe")}
                                />
                            </BsForm.Group>

                            {authMessage && (
                                <BsForm.Text className="auth-message d-block mt-2">
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
    );
}
