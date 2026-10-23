import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Card, Button, Spinner } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import User from "../models/User.js";
import "../App.css";

export default function Profile() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function fetchProfile() {
            if (!user) {
                setProfile(null);
                return;
            }
            setFetching(true);
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (cancelled) return;
                if (snap.exists()) {
                    setProfile(new User(snap.data()));
                } else {
                    setProfile(new User({
                        uid: user.uid,
                        email: user.email,
                        username: user.displayName,
                        photoURL: user.photoURL
                    }));
                }
            } catch (e) {
                if (!cancelled) setProfile(null);
            } finally {
                if (!cancelled) setFetching(false);
            }
        }
        fetchProfile();
        return () => { cancelled = true; };
    }, [user]);

    if (loading || fetching) {
        return (
            <Container className="d-flex justify-content-center align-items-center flex-grow-1">
                <Spinner animation="border" />
            </Container>
        );
    }

    if (!user) {
        return (
            <Container className="d-flex justify-content-center align-items-center flex-grow-1">
                <Card className="card-2pxb-dark-background card-border-primary" style={{ maxWidth: "400px", width: "100%" }}>
                    <Card.Body className="text-center">
                        <Card.Title style={{ color: "white" }}>Profile</Card.Title>
                        <Card.Text style={{ color: "white" }}>
                            You are not logged in. Please log in or register to view your profile.
                        </Card.Text>
                        <div className="d-flex gap-2 justify-content-center mt-3">
                            <Button as={Link} to="/Cameos/login" variant="primary">Log In</Button>
                            <Button as={Link} to="/Cameos/signup" variant="outline-light">Sign Up</Button>
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    const data = profile || new User({
        uid: user.uid,
        email: user.email,
        username: user.displayName,
        photoURL: user.photoURL
    });

    return (
        <Container className="d-flex justify-content-center align-items-center flex-grow-1">
            <Card className="card-2pxb-dark-background card-border-primary" style={{ maxWidth: "400px", width: "100%" }}>
                <Card.Body className="text-center">
                    {data.photoURL && (
                        <img
                            src={data.photoURL}
                            alt="avatar"
                            style={{ width: "96px", height: "96px", borderRadius: "50%", marginBottom: "12px" }}
                        />
                    )}
                    <Card.Title style={{ color: "white" }}>
                        {data.username || user.displayName || "User"}
                    </Card.Title>
                    <Card.Text style={{ color: "white" }}>{data.email || user.email}</Card.Text>
                    <div style={{ color: "white", fontSize: "14px" }}>
                        <div>Friends: {data.friends?.length ?? 0}</div>
                        <div>Watchlist: {data.watchlist?.length ?? 0}</div>
                        <div>Favorites: {data.favorites?.length ?? 0}</div>
                        <div>Watched: {data.watched?.length ?? 0}</div>
                        <div>Reviews: {data.reviews?.length ?? 0}</div>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}
