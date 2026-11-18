import { Nav as BsNav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { useDevice } from "../../contexts/DeviceContext.jsx";
import { useTranslation } from "../../contexts/LanguageContext.jsx";
import { APP_ROUTES } from "../../utils/appRoutes.js";
import '../../css/components/navbar.css';

const SERIES_CATALOG_PATHS = new Set([APP_ROUTES.series, APP_ROUTES.tv]);

export default function BottomNavbar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const { isMobile } = useDevice();
    const { t } = useTranslation();

    const normalizedPath = APP_ROUTES.normalizePath(currentPath);
    const isFilmsCatalog = APP_ROUTES.isMoviesHome(normalizedPath);
    const isSeriesCatalog = SERIES_CATALOG_PATHS.has(normalizedPath);

    if (!isMobile || (!isFilmsCatalog && !isSeriesCatalog)) {
        return null;
    }

    /** @type {Array<{ id: string, label: string, to: string, icon: string }>} */
    const navItems = [
        { id: "films", label: t('nav.movies'), to: APP_ROUTES.home, icon: "bi-camera-reels" },
        { id: "series", label: t('nav.tvSeries'), to: APP_ROUTES.series, icon: "bi-tv" }
    ];

    const activeId = isSeriesCatalog ? 'series' : 'films';

    return (
        <BsNav
            as="nav"
            aria-label={t('nav.media')}
            className="floating-bottom-navbar d-flex flex-row flex-nowrap align-items-center justify-content-center gap-2"
        >
            {navItems.map(/** @returns {import('react').JSX.Element} */ (item) => {
                const isActive = activeId === item.id;
                return (
                    <BsNav.Item key={item.id}>
                        <Link
                            to={item.to}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            className={`nav-link floating-bottom-nav-link d-flex flex-column align-items-center justify-content-center px-2 py-1 ${
                                isActive ? 'active' : ''
                            }`.trim()}
                        >
                            <i
                                aria-hidden="true"
                                className={`bi ${
                                    isActive
                                        ? `${item.icon}-fill`
                                        : item.icon
                                } floating-bottom-nav-icon`}
                            />
                            {isActive && (
                                <span className="floating-bottom-nav-label">{item.label}</span>
                            )}
                        </Link>
                    </BsNav.Item>
                );
            })}
        </BsNav>
    );
}
