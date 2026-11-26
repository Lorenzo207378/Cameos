import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import {
    Navbar as BsNavbar,
    Container,
    Nav as BsNav,
} from 'react-bootstrap';

import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/components/navbar.css';
import SearchBar from './SearchBar.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';

const logoUrl = new URL('../../assets/app-icon.png', import.meta.url).href;
const FLUSH_NAVBAR_PATHS = [
    APP_ROUTES.homeRoot,
    APP_ROUTES.home,
    APP_ROUTES.movies,
    APP_ROUTES.series,
    APP_ROUTES.tv,
    APP_ROUTES.search,
    APP_ROUTES.profile,
    APP_ROUTES.profileReviews,
    APP_ROUTES.friends,
    ...Object.values(APP_ROUTES.patterns)
];

/**
 * Shared Login / User Avatar control rendered in both mobile and desktop navbar layouts.
 * @param {Object} props
 * @param {Object|null} props.user
 * @param {boolean} props.loading
 * @param {string|null} props.avatarUrl
 * @param {boolean} props.isAvatarBroken
 * @param {string|null} props.displayName
 * @param {boolean} props.isMobile
 * @param {(event: import('react').MouseEvent) => void} props.onProtectedNavigation
 * @param {(url: string) => void} props.onAvatarError
 */
function NavbarAuthControls({
    user,
    loading,
    avatarUrl,
    isAvatarBroken,
    displayName,
    isMobile,
    onProtectedNavigation,
    onAvatarError
}) {
    const { t } = useTranslation();
    if (loading) return null;

    if (!user) {
        return (
            <BsNav className={`flex-row ${isMobile ? '' : 'gap-2 '}flex-shrink-0`}>
                <Link
                    className={`btn btn-outline-light shadow-lg border-2 centered-content text-nowrap ${
                        isMobile ? 'px-2 py-1 navbar-login-btn-mobile' : 'navbar-login-btn-desktop'
                    }`}
                    to={APP_ROUTES.login}
                >
                    {t('nav.login')}
                </Link>
            </BsNav>
        );
    }

    const avatarSizeClass = isMobile ? 'navbar-avatar-mobile' : 'navbar-avatar-desktop';
    return (
        <BsNav className={`flex-row ${isMobile ? '' : 'gap-3 align-items-center '}flex-shrink-0`}>
            <Link
                to={APP_ROUTES.profile}
                onClick={onProtectedNavigation}
                className={`text-white text-decoration-none d-flex align-items-center${isMobile ? '' : ' gap-2'}`}
            >
                {avatarUrl && !isAvatarBroken ? (
                    <img
                        src={avatarUrl}
                        className={`rounded-circle ${isMobile ? 'border border-white ' : ''}${avatarSizeClass}`}
                        alt="avatar"
                        referrerPolicy="no-referrer"
                        onError={() => onAvatarError(avatarUrl)}
                    />
                ) : (
                    <div
                        className={`rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center border border-white ${avatarSizeClass} ${
                            isMobile ? 'navbar-avatar-fallback-mobile' : 'navbar-avatar-fallback-desktop'
                        }`}
                    >
                        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                )}
                {!isMobile && (
                    <span className="small fw-semibold d-none d-xl-inline">{displayName || t('nav.user')}</span>
                )}
            </Link>
        </BsNav>
    );
}

NavbarAuthControls.propTypes = {
    user: PropTypes.object,
    loading: PropTypes.bool.isRequired,
    avatarUrl: PropTypes.string,
    isAvatarBroken: PropTypes.bool.isRequired,
    displayName: PropTypes.string,
    isMobile: PropTypes.bool.isRequired,
    onProtectedNavigation: PropTypes.func.isRequired,
    onAvatarError: PropTypes.func.isRequired
};

export default function Navbar() {
    const { user, userProfile, avatarDataUrl, loading } = useAuth();
    const { isMobile } = useDevice();
    const { t } = useTranslation();
    const { pathname: currentPath } = useLocation();
    const navigate = useNavigate();

    const [isScrolled, setIsScrolled] = useState(false);
    const [failedAvatarUrl, setFailedAvatarUrl] = useState(/** @type {string|null} */ (null));

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY > 10;
            setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const avatarUrl = avatarDataUrl || userProfile?.photoURL || user?.photoURL || null;
    const displayName = userProfile?.username || user?.displayName || null;
    const isAuthPage = currentPath === APP_ROUTES.login;
    const isNoMarginBottom = FLUSH_NAVBAR_PATHS.some((path) => matchPath(path, currentPath));

    const handleProtectedNavigation = (event) => {
        if (!user) {
            event.preventDefault();
            navigate(APP_ROUTES.login);
        }
    };

    const authControls = (
        <NavbarAuthControls
            user={user}
            loading={loading}
            avatarUrl={avatarUrl}
            isAvatarBroken={Boolean(avatarUrl && failedAvatarUrl === avatarUrl)}
            displayName={displayName}
            isMobile={isMobile}
            onProtectedNavigation={handleProtectedNavigation}
            onAvatarError={setFailedAvatarUrl}
        />
    );

    if (isMobile) {
        return (
            <BsNavbar
                data-bs-theme="dark"
                className={`navbar-top-bar shadow-sm w-100 flex-nowrap sticky-top navbar-safe-top ${isScrolled ? 'navbar-scrolled' : ''}`}
            >
                <Container fluid className="d-flex align-items-center justify-content-between flex-nowrap px-2 gap-2">
                    <Link to={APP_ROUTES.home} className="navbar-brand navbar-brand-link fw-bold flex-shrink-0 me-0 p-0">
                        <img alt="Logo" src={logoUrl} width="32" height="32" className="d-inline-block align-top navbar-brand-logo" />
                    </Link>

                    {!isAuthPage && <SearchBar />}

                    <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-auto">
                        {authControls}
                    </div>
                </Container>
            </BsNavbar>
        );
    }

    return (
        <BsNavbar
            expand="lg"
            data-bs-theme="dark"
            className={`navbar-top-bar shadow-sm w-100 flex-nowrap sticky-top ${isScrolled ? 'navbar-scrolled' : ''} ${isNoMarginBottom ? 'mb-0' : 'mb-4'}`}
        >
            <Container fluid className="justify-content-start flex-nowrap px-4">
                <Link to={APP_ROUTES.home} className="navbar-brand navbar-brand-link fw-bold flex-shrink-0 d-flex align-items-center gap-2">
                    <img alt="Logo" src={logoUrl} width="32" height="32" className="d-inline-block align-top navbar-brand-logo" />
                    <span className="navbar-brand-name">{t('nav.brand')}</span>
                </Link>

                <BsNav
                    className={`flex-row gap-3 ms-3 ms-xl-3 flex-shrink-0 ${isAuthPage ? 'invisible' : ''}`}
                    variant="underline"
                >
                    <Link className={`nav-link nav-item ${APP_ROUTES.isMoviesHome(currentPath) ? 'active text-white fw-bold' : ''}`} to={APP_ROUTES.home}>
                        {t('nav.movies')}
                    </Link>
                    <Link className={`nav-link nav-item ${APP_ROUTES.isSeriesSection(currentPath) ? 'active text-white fw-bold' : ''}`} to={APP_ROUTES.series}>
                        {t('nav.tvSeries')}
                    </Link>
                </BsNav>

                {!isAuthPage && (
                    <div className="navbar-search-wrapper d-flex justify-content-center align-items-center min-w-0">
                        <SearchBar />
                    </div>
                )}

                <div className={`${isAuthPage ? 'ms-auto' : ''} d-flex align-items-center gap-3 flex-shrink-0`}>
                    {authControls}
                </div>
            </Container>
        </BsNavbar>
    );
}
