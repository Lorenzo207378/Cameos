import {
    Card as BsCard,
    Form as BsForm,
    Button as BsButton
} from "react-bootstrap";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    signUp,
    login,
    logout,
    validateUsername
} from "../backend/user/authentication.js";
import GoogleIcon from "../assets/google.png";
import "../App.css";

export default function Authentication({ mode = "signup" }) {
    const isSignUp = mode === "signup";

    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [photoError, setPhotoError] = useState("");

    const [googleSignUpSuccess, setGoogleSignUpSuccess] = useState(false);
    const [authMessage, setAuthMessage] = useState("");
    const [authError, setAuthError] = useState("");
    const [usernameError, setUsernameError] = useState("");

    const {
        register,
        handleSubmit
    } = useForm();

    const handleGoogleSignUp = async (rememberMe = false) => {
        setAuthError("");
        setAuthMessage("");
        try {
            await signUp(rememberMe, profilePhoto);
            setGoogleSignUpSuccess(true);
            setAuthMessage("Google sign up completed successfully! Please enter a valid username.");
        } catch (error) {
            setAuthError(error.message || "Error during Google sign up.");
        }
    };

    const handleGoogleLogin = async (rememberMe = false) => {
        setAuthError("");
        setAuthMessage("");
        try {
            await login(rememberMe);
            setAuthMessage("Logged in with Google successfully!");
        } catch (error) {
            setAuthError(error.message || "Error during Google login.");
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleGoogleLogout = async () => {
        setAuthError("");
        setAuthMessage("");
        try {
            await logout();
            setGoogleSignUpSuccess(false);
            setAuthMessage("Logged out successfully.");
        } catch (error) {
            setAuthError(error.message || "Error during logout.");
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
            setAuthMessage(result.message);
        } catch (error) {
            setUsernameError(error.message || "Error validating username.");
        }
    };

    const onSubmit = async (data) => {
        if (!isSignUp) {
            await handleGoogleLogin(data.rememberMe);
            return;
        }

        if (!googleSignUpSuccess) {
            await handleGoogleSignUp(data.rememberMe);
        } else {
            await handleUsernameValidation(data.username);
        }
    };

    return (
        <div className={"page"}>
            <BsCard className={"card-2pxb-dark-background card-border-primary"}>
                <BsCard.Body>
                    <BsCard.Title
                        style={{color: "white"}}
                    >
                        {isSignUp ? "Welcome to the world of " : "Welcome back to "}
                        <span
                            className=
                                "
                                placeholder-wave
                                card-title-emphasized
                                "
                            style={{color: "var(--app-primary-emphasis-color)"}}
                            >
                            Cameos </span>!
                    </BsCard.Title>
                    <BsCard.Subtitle
                        className="mb-2 auth-subtitle"
                        style={{color: "white"}}
                    >
                        {isSignUp ? "Sign up to join our community" : "Log in to continue"}
                    </BsCard.Subtitle>

                    <BsForm
                        className={"mt-4"}
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate>

                        <BsButton
                            variant="primary"
                            className="signup-button centered-content d-block mx-auto p-2 ps-3 pe-3"
                            type="submit"
                        >
                            {isSignUp ? "Sign Up with Google" : "Log In with Google"}
                            <img
                                src={GoogleIcon}
                                alt="Google Icon"
                                style={{ width: "24px", height: "24px", marginLeft: "12px" }}
                            />
                        </BsButton>

                        {isSignUp && googleSignUpSuccess &&
                            <BsForm.Group className="mb-3" controlId="formUsername">
                                <BsForm.Label className={"form-label-primary"}
                                >
                                    Username
                                </BsForm.Label>
                                <BsForm.Control
                                    type="text"
                                    placeholder="Username"
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
                                label="Remember me"
                                className="remember-me"
                                inputClassName="remember-me-checkbox"
                                labelClassName="remember-me-label"
                                {...register("rememberMe")}
                            />
                        </BsForm.Group>

                        {authMessage && (
                            <BsForm.Text
                                className="d-block mt-2"
                                style={{ color: "var(--app-primary-emphasis-color)" }}
                            >
                                {authMessage}
                            </BsForm.Text>
                        )}
                        {authError && (
                            <BsForm.Text className="d-block mt-2 text-danger">
                                {authError}
                            </BsForm.Text>
                        )}
                        {isSignUp ? (
                            <BsCard.Text
                                className={"mt-2 text-center white-text"}>
                                Already have an account?
                                <Link
                                    className="form-link-text ms-2"
                                    to="/login"
                                >
                                    Log in
                                </Link>
                            </BsCard.Text>
                        ) : (
                            <BsCard.Text
                                className={"mt-2 text-center white-text"}>
                                Don&apos;t have an account?
                                <Link
                                    className="form-link-text ms-2"
                                    to="/signup"
                                >
                                    Sign up
                                </Link>
                            </BsCard.Text>
                        )}
                    </BsForm>
                </BsCard.Body>
            </BsCard>
        </div>
    )
}