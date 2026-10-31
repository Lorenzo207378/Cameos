import {
    Navbar as BsNavbar,
    Container,
    Button as BsButton,
    Nav as BsNav,
} from 'react-bootstrap';

import Logo from '../../assets/app-icon.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useTranslation } from '../../utils/translations.js';
import '../../css/components/navbar.css';

export default function Navbar() {
    const { user, loading } = useAuth();
    const { isMobile} = useDevice();
    const { t, langKey, setLanguage } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    const loginPath = "/Cameos/login";
    const homePath = "/Cameos/";
    const isAuthPage = currentPath === loginPath;
    const isMediaDetail =
        currentPath.includes('/film') ||
        currentPath.includes('/movie') ||
        currentPath.includes('/media') ||
        currentPath.includes('/actor/') ||
        currentPath.includes('/series/') ||
        currentPath.includes('/tv/');

    const handleProtectedNavigation = (event) => {
        if (!user) {
            event.preventDefault();
            navigate(loginPath);
        }
    };

    const handleSearchClick = () => {
        // Can open search or navigate
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
                className={`shadow-sm w-100 flex-nowrap sticky-top navbar-safe-top ${isMediaDetail ? 'mb-0' : 'mb-3'}`}
            >
                <Container fluid className="d-flex align-items-center justify-content-between flex-nowrap px-2 gap-2">
                    <BsNavbar.Brand as={Link} to={homePath} className="fw-bold flex-shrink-0 me-0 p-0">
                        <img
                            alt="Logo"
                            src={Logo}
                            width="32"
                            height="32"
                            className="d-inline-block align-top"
                        />
                    </BsNavbar.Brand>

                    {!isAuthPage && (
                        <div className="input-group navbar-search navbar-search-mobile flex-nowrap">
                            <button
                                className="navSearchBar-button px-2 d-flex align-items-center justify-content-center"
                                type="button"
                                id="button-search-mobile"
                                onClick={handleSearchClick}
                                aria-label={t('nav.searchAriaLabel')}
                            >
                                <i className="bi bi-search" style={{ fontSize: '0.8125rem' }}></i>
                            </button>
                            <input
                                type="text"
                                className="form-control input-navbar"
                                placeholder={t('nav.searchPlaceholder')}
                                aria-label={t('nav.searchAriaLabel')}
                                aria-describedby="button-search-mobile"
                            />
                        </div>
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
                                <BsButton
                                    variant="outline-light"
                                    className="shadow-lg border-2 centered-content text-nowrap px-2 py-1"
                                    style={{
                                        font: "bold 0.875rem Arial, sans-serif",
                                    }}
                                    as={Link}
                                    to={loginPath}
                                >
                                    {t('nav.login')}
                                </BsButton>
                            </BsNav>
                        ) : (
                            <BsNav className="flex-row flex-shrink-0">
                                <Link to="/Cameos/profile" className="text-white text-decoration-none d-flex align-items-center">
                                    {user?.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            className="rounded-circle border border-white"
                                            alt="avatar"
                                            style={{ width: '2rem', height: '2rem', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div
                                            className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center border border-white"
                                            style={{ width: '2rem', height: '2rem', fontSize: '0.8125rem' }}
                                        >
                                            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
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
                <BsNavbar.Brand as={Link} to={homePath} className="fw-bold flex-shrink-0 d-flex align-items-center gap-2">
                    <img
                        alt="Logo"
                        src={Logo}
                        width="32"
                        height="32"
                        className="d-inline-block align-top"
                    />
                    <span
                        style={{
                            color: "white",
                            textShadow: "2px solid black",
                            font: "bold 24px Arial, sans-serif"
                        }}
                    >
                        {t('nav.brand')}
                    </span>
                </BsNavbar.Brand>

                <BsNav
                    className={`flex-row gap-3 ms-3 ms-xl-3 flex-shrink-0 ${
                        isAuthPage ? "invisible" : ""
                    }`}
                    variant="underline"
                >
                    <BsNav.Link as={Link} className={`nav-item ${currentPath === homePath || currentPath === '/Cameos/movies' ? 'active text-white fw-bold' : ''}`} to={homePath}>
                        {t('nav.movies')}
                    </BsNav.Link>
                    <BsNav.Link as={Link} className={`nav-item ${currentPath.includes('/Cameos/series') || currentPath.includes('/Cameos/tv') ? 'active text-white fw-bold' : ''}`} to="/Cameos/series">
                        {t('nav.tvSeries')}
                    </BsNav.Link>
                    <BsNav.Link
                        as={Link}
                        className={`nav-item ${currentPath.includes('/Cameos/friends') ? 'active text-white fw-bold' : ''}`}
                        to="/Cameos/friends"
                        onClick={handleProtectedNavigation}
                    >
                        {t('nav.friends')}
                    </BsNav.Link>
                </BsNav>

                {!isAuthPage && (
                    <div className="navbar-search-wrapper d-flex justify-content-center align-items-center min-w-0">
                        <div className="input-group navbar-search navbar-search-desktop flex-nowrap">
                            <button
                                className="navSearchBar-button ps-3 pe-3 d-flex align-items-center justify-content-center"
                                type="button"
                                id="button-search"
                                onClick={handleSearchClick}
                                aria-label={t('nav.searchAriaLabel')}
                            >
                                <i className="bi bi-search" style={{ fontSize: '0.9375rem' }}></i>
                            </button>
                            <input
                                type="text"
                                className="form-control input-navbar"
                                placeholder={t('nav.searchPlaceholderDesktop')}
                                aria-label={t('nav.searchAriaLabel')}
                                aria-describedby="button-search"
                            />
                        </div>
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
                                <BsButton
                                    variant="outline-light"
                                    className="shadow-lg border-2 centered-content text-nowrap"
                                    style={{
                                        font: "bold 1rem Arial, sans-serif",
                                    }}
                                    as={Link}
                                    to={loginPath}
                                >
                                    {t('nav.login')}
                                </BsButton>
                            </BsNav>
                        ) : (
                            <BsNav className="flex-row gap-3 align-items-center flex-shrink-0">
                                <Link to="/Cameos/profile" className="text-decoration-none d-flex align-items-center gap-2 text-white">
                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            className={"rounded-circle"}
                                            alt="avatar"
                                            style={{ width: "2.25rem", height: "2.25rem" }}
                                        />
                                    ) : (
                                        <div
                                            className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center border border-white"
                                            style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.875rem' }}
                                        >
                                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}

                                    <span className="small fw-semibold d-none d-xl-inline">{user.displayName || t('nav.user')}</span>
                                </Link>
                            </BsNav>
                        )
                    )}
                </div>
            </Container>
        </BsNavbar>
    );
}
