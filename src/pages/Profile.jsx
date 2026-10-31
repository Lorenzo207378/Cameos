import { formatTranslation } from '../utils/translationUtils.js';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Card, Button, Spinner, Nav, ButtonGroup } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import User from "../models/User.js";
import Watchlist from "../components/profile/Watchlist.jsx";
import Favourites from "../components/profile/Favourites.jsx";
import Voted from "../components/profile/Voted.jsx";
import { useTranslation } from "../utils/translations.js";

export default function Profile() {
    const { user, loading } = useAuth();
    const { t, langKey, setLanguage } = useTranslation();
    const [profile, setProfile] = useState(null);
    const [fetching, setFetching] = useState(false);
    const [activeSection, setActiveSection] = useState("watchlist");

    const sections = [
        { id: "watchlist", label: t('profile.watchlistTab'), component: Watchlist },
        { id: "favourites", label: t('profile.favoritesTab'), component: Favourites },
        { id: "voted", label: t('profile.votedTab'), component: Voted },
    ];

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
            } catch {
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
                <Card className="card-2pxb-dark-background card-border-primary" style={{ maxWidth: "25rem", width: "100%" }}>
                    <Card.Body className="text-center">
                        <Card.Title style={{ color: "white" }}>{t('profile.title')}</Card.Title>
                        <Card.Text style={{ color: "white" }}>
                            {t('profile.notLoggedInText')}
                        </Card.Text>
                        <div className="d-flex gap-2 justify-content-center mt-3">
                            <Button as={Link} to="/Cameos/login" variant="primary">{t('profile.loginBtn')}</Button>
                            <Button as={Link} to="/Cameos/signup" variant="outline-light">{t('profile.signupBtn')}</Button>
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

    const ActiveComponent = sections.find((s) => s.id === activeSection)?.component || Watchlist;

    return (
        <Container className="d-flex justify-content-center align-items-center flex-grow-1 py-4">
            <div className="w-100" style={{ maxWidth: "68.75rem" }}>
                <Card className="card-2pxb-dark-background card-border-primary mb-4">
                    <Card.Body className="text-center">
                        {data.photoURL && (
                            <img
                                src={data.photoURL}
                                alt="avatar"
                                style={{ width: "6rem", height: "6rem", borderRadius: "50%", marginBottom: "0.75rem" }}
                            />
                        )}
                        <Card.Title style={{ color: "white" }}>
                            {data.username || user.displayName || t('nav.user')}
                        </Card.Title>
                        <Card.Text style={{ color: "white" }}>{data.email || user.email}</Card.Text>
                        <div style={{ color: "white", fontSize: "0.875rem" }} className="mb-3">
                            <div>{formatTranslation(t('profile.friendsCount'), { count: data.friends?.length ?? 0 })}</div>
                            <div>{formatTranslation(t('profile.watchlistCount'), { count: data.watchlist?.length ?? 0 })}</div>
                            <div>{formatTranslation(t('profile.favoritesCount'), { count: data.favorites?.length ?? 0 })}</div>
                            <div>{formatTranslation(t('profile.watchedCount'), { count: data.watched?.length ?? 0 })}</div>
                            <div>{formatTranslation(t('profile.reviewsCount'), { count: data.reviews?.length ?? 0 })}</div>
                        </div>

                        {/* SELETTORE LINGUA UTENTE */}
                        <div className="pt-2 border-top border-secondary border-opacity-25 d-flex flex-column align-items-center gap-2">
                            <span className="text-white-50 small fw-semibold">
                                <i className="bi bi-globe me-1"></i>
                                {t('profile.languageSettings')}
                            </span>
                            <ButtonGroup size="sm">
                                <Button
                                    variant={langKey === 'it' ? 'success' : 'outline-secondary'}
                                    className="fw-semibold px-3"
                                    onClick={() => setLanguage('it')}
                                >
                                    🇮🇹 {t('profile.italianLang')}
                                </Button>
                                <Button
                                    variant={langKey === 'en' ? 'success' : 'outline-secondary'}
                                    className="fw-semibold px-3"
                                    onClick={() => setLanguage('en')}
                                >
                                    🇬🇧 {t('profile.englishLang')}
                                </Button>
                            </ButtonGroup>
                        </div>
                    </Card.Body>
                </Card>

                <Nav
                    justify
                    className="mb-4"
                    activeKey={activeSection}
                    onSelect={(key) => setActiveSection(key)}
                >
                    {sections.map((section) => (
                        <Nav.Item key={section.id}>
                            <Nav.Link eventKey={section.id} active={activeSection === section.id}>
                                {section.label}
                            </Nav.Link>
                        </Nav.Item>
                    ))}
                </Nav>

                <ActiveComponent />
            </div>
        </Container>
    );
}
