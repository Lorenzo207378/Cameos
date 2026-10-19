import {
    Card as BsCard,
    Form as BsForm,
    Button as BsButton
} from "react-bootstrap";

import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../App.css";

export default function Authentication() {
    const isSignUp = "signup";

    const {
        register
    } = useForm();

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
                        noValidate>
                        <BsForm.Group className="mb-3" controlId="formEmail">
                            <BsForm.Label className={"form-label-primary"}

                            >
                                Email address
                            </BsForm.Label>
                            <BsForm.Control
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                                        message: "Invalid email address"
                                    }
                                })}
                                type="email"
                                placeholder="example@example.com"
                            />
                        </BsForm.Group>
                        <BsForm.Group className="mb-3" controlId="formPassword">
                            <BsForm.Label className={"form-label-primary"}

                            >
                                Password
                            </BsForm.Label>
                            <BsForm.Control
                                {...register("password", {
                                    required: "Password is required",
                                    minLength: {
                                        value: 8,
                                        message: "Password must be at least 8 characters"
                                    }
                                })}
                                type="password"
                                placeholder="Password"
                            />
                           </BsForm.Group>
                        {isSignUp &&
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
                                </BsForm.Group>}

                        <BsForm.Group className="mb-3" controlId="formRememberMe">
                            <BsForm.Check
                                type="checkbox"
                                label="Remember me"
                                className="remember-me"
                                inputClassName="remember-me-checkbox"
                                labelClassName="remember-me-label"
                                {...register("rememberMe")}
                            />
                        </BsForm.Group>
                        <BsButton
                            variant="primary"
                            className="signup-button centered-content p-2 ps-3 pe-3"
                            style={{
                                font: "bold 14px Arial, sans-serif",
                                boxShadow: "0 3px 6px rgba(0, 0, 0, 0.35)"
                            }}
                            type="submit"
                            >
                            {isSignUp ? "Sign Up" : "Log In"}
                        </BsButton>
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

/*
                 {submitError && <BsForm.Text className="d-block mb-3 text-danger">{submitError}</BsForm.Text>}
     {errors.password &&
                                <BsForm.Text className="text-danger">{errors.password.message}</BsForm.Text>}
                                              {errors.email && <BsForm.Text className="text-danger">{errors.email.message}</BsForm.Text>}
{errors.username &&
                                    <BsForm.Text className="text-danger">{errors.username.message}</BsForm.Text>}
disabled={submitting}
*/