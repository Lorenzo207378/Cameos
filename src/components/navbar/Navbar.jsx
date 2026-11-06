import { useState } from 'react';
import {
    Navbar as BsNavbar,
    Container,
    Button as BsButton,
    Nav as BsNav,
} from 'react-bootstrap';

import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/components/navbar.css';
import SearchBar from './SearchBar.jsx';

const logoUrl = new URL('../../assets/app-icon.png', import.meta.url).href;

export default function Navbar() {
    const { user, userProfile, loading } = useAuth();
    const { isMobile} = useDevice();
    const { t, langKey, setLanguage } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    const [failedAvatarUrl, setFailedAvatarUrl] = useState(null);
    const avatarUrl = userProfile?.photoURL || user?.photoURL || null;
    const displayName = userProfile?.username || user?.displayName || null;
    const isAvatarBroken = Boolean(avatarUrl && failedAvatarUrl === avatarUrl);

    const loginPath = "/Cameos/login";
    const homePath = "/Cameos/";
    const isAuthPage = currentPath === loginPath;
    const isMediaDetail = [
        '/Cameos/movie/:id',
        '/Cameos/series/:id',
        '/Cameos/series/:id/season/:seasonNumber/episode/:episodeNumber',
        '/Cameos/actor/:id',
        '/Cameos/person/:id'
    ].some((path) => matchPath(path, currentPath));

    const handleProtectedNavigation = (event) => {
        if (!user) {
            event.preventDefault();
            navigate(loginPath);
        }
    };

    const toggleLanguage = () => {
        setLanguage(langKey === 'it' ? 'en' : 'it');
    };

    if (isMobile) {
        return (
            <BsNavbar
                data-bs-theme="dark"
                style={{
                    backgroundColor: "var(--app-primary-color)",
                }}
                className={`shadow-sm w-100 flex-nowrap sticky-top navbar-safe-top`}
            >
                <Container fluid className="d-flex align-items-center justify-content-between flex-nowrap px-2 gap-2">
                    <Link to={homePath} className="navbar-brand navbar-brand-link fw-bold flex-shrink-0 me-0 p-0">
                        <img
                            alt="Logo"
                            src={logoUrl}
                            width="32"
                            height="32"
                            className="d-inline-block align-top navbar-brand-logo"
                        />
                    </Link>

                    {!isAuthPage && (
                        <SearchBar />
                    )}

                    <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-auto">
                        <BsButton
                            variant="outline-secondary"
                            size="sm"
                            className="text-white fw-bold px-2 py-0 border-opacity-50"
                            style={{ fontSize: "0.6875rem", minWidth: "2.125rem", height: "1.875rem" }}
                            onClick={toggleLanguage}
                            aria-label={t('nav.changeLanguage')}
                            title={langKey === 'it' ? t('nav.switchToEnglish') : t('nav.switchToItalian')}
                        >
                            {langKey.toUpperCase()}
                        </BsButton>

                        {!loading && !user ? (
                            <BsNav className="flex-row flex-shrink-0">
                                <Link
                                    className="btn btn-outline-light shadow-lg border-2 centered-content text-nowrap px-2 py-1"
                                    style={{
                                        font: "bold 0.875rem Arial, sans-serif",
                                    }}
                                    to={loginPath}
                                >
                                    {t('nav.login')}
                                </Link>
                            </BsNav>
                        ) : (
                            <BsNav className="flex-row flex-shrink-0">
                                <Link to="/Cameos/profile" className="text-white text-decoration-none d-flex align-items-center">
                                    {avatarUrl && !isAvatarBroken ? (
                                        <img
                                            src={avatarUrl}
                                            className="rounded-circle border border-white"
                                            alt="avatar"
                                            referrerPolicy="no-referrer"
                                            onError={() => setFailedAvatarUrl(avatarUrl)}
                                            style={{ width: '2rem', height: '2rem', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div
                                            className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center border border-white"
                                            style={{ width: '2rem', height: '2rem', fontSize: '0.8125rem' }}
                                        >
                                            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                </Link>
                            </BsNav>
                        )}
                    </div>
                </Container>
            </BsNavbar>
        );
    }

    // Navbar Desktop
    return (
        <BsNavbar
            expand="lg"
            data-bs-theme="dark"
            style={{
                backgroundColor: "var(--app-primary-color)",
            }}
            className={`shadow-sm w-100 flex-nowrap sticky-top ${isMediaDetail ? 'mb-0' : 'mb-4'}`}
        >
            <Container fluid className="justify-content-start flex-nowrap px-4">
                <Link to={homePath} className="navbar-brand navbar-brand-link fw-bold flex-shrink-0 d-flex align-items-center gap-2">
                    <img
                        alt="Logo"
                        src={logoUrl}
                        width="32"
                        height="32"
                        className="d-inline-block align-top navbar-brand-logo"
                    />
                    <span className="navbar-brand-name">
                        {t('nav.brand')}
                    </span>
                </Link>

                <BsNav
                    className={`flex-row gap-3 ms-3 ms-xl-3 flex-shrink-0 ${
                        isAuthPage ? "invisible" : ""
                    }`}
                    variant="underline"
                >
                    <Link className={`nav-link nav-item ${currentPath === homePath || currentPath === '/Cameos/movies' ? 'active text-white fw-bold' : ''}`} to={homePath}>
                        {t('nav.movies')}
                    </Link>
                    <Link className={`nav-link nav-item ${currentPath.includes('/Cameos/series') || currentPath.includes('/Cameos/tv') ? 'active text-white fw-bold' : ''}`} to="/Cameos/series">
                        {t('nav.tvSeries')}
                    </Link>
                    <Link
                        className={`nav-link nav-item ${currentPath.includes('/Cameos/friends') ? 'active text-white fw-bold' : ''}`}
                        to="/Cameos/friends"
                        onClick={handleProtectedNavigation}
                    >
                        {t('nav.friends')}
                    </Link>
                </BsNav>

                {!isAuthPage && (
                    <div className="navbar-search-wrapper d-flex justify-content-center align-items-center min-w-0">
                        <SearchBar />
                    </div>
                )}

                <div className={`${isAuthPage ? 'ms-auto' : ''} d-flex align-items-center gap-3 flex-shrink-0`}>
                    <BsButton
                        variant="outline-light"
                        size="sm"
                        className="rounded-pill px-3 py-1 fw-bold text-uppercase d-flex align-items-center gap-1 border-opacity-50"
                        style={{ fontSize: "0.8125rem" }}
                        onClick={toggleLanguage}
                        aria-label={t('nav.changeLanguage')}
                        title={langKey === 'it' ? t('nav.switchToEnglish') : t('nav.switchToItalian')}
                    >
                        <i className="bi bi-translate"></i>
                        <span>{langKey.toUpperCase()}</span>
                    </BsButton>

                    {!loading && (
                        !user ? (
                            <BsNav className="flex-row gap-2 flex-shrink-0">
                                <Link
                                    className="btn btn-outline-light shadow-lg border-2 centered-content text-nowrap"
                                    style={{
                                        font: "bold 1rem Arial, sans-serif",
                                    }}
                                    to={loginPath}
                                >
                                    {t('nav.login')}
                                </Link>
                            </BsNav>
                        ) : (
                            <BsNav className="flex-row gap-3 align-items-center flex-shrink-0">
                                <Link to="/Cameos/profile" className="text-decoration-none d-flex align-items-center gap-2 text-white">
                                    {avatarUrl && !isAvatarBroken ? (
                                        <img
                                            src={avatarUrl}
                                            className={"rounded-circle"}
                                            alt="avatar"
                                            referrerPolicy="no-referrer"
                                            onError={() => setFailedAvatarUrl(avatarUrl)}
                                            style={{ width: "2.25rem", height: "2.25rem" }}
                                        />
                                    ) : (
                                        <div
                                            className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center border border-white"
                                            style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.875rem' }}
                                        >
                                            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}

                                    <span className="small fw-semibold d-none d-xl-inline">{displayName || t('nav.user')}</span>
                                </Link>
                            </BsNav>
                        )
                    )}
                </div>
            </Container>
        </BsNavbar>
    );
}
