import { Nav as BsNav } from "react-bootstrap";
import { Link, useLocation } from "react-router-dom";
import { useDevice } from "../../contexts/DeviceContext.jsx";
import { useTranslation } from "../../contexts/LanguageContext.jsx";
import '../../css/components/navbar.css';

const ALLOWED_NAVBAR_PATHS = new Set([
    '/',
    '/Cameos',
    '/Cameos/movies',
    '/Cameos/series',
    '/Cameos/tv'
]);

export default function BottomNavbar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const { isMobile } = useDevice();
    const { t } = useTranslation();

    const normalizedPath = currentPath.endsWith('/') && currentPath.length > 1
        ? currentPath.slice(0, -1)
        : currentPath;

    if (!isMobile || !ALLOWED_NAVBAR_PATHS.has(normalizedPath)) {
        return null;
    }

    const navItems = [
        { id: "films", label: t('nav.movies'), to: "/Cameos/", icon: "bi-camera-reels" },
        { id: "series", label: t('nav.tvSeries'), to: "/Cameos/series", icon: "bi-tv" }
    ];

    const getActiveId = (path) => {
        if (path.includes("/Cameos/series") || path.includes("/Cameos/tv")) return "series";
        return "films";
    };

    const activeId = getActiveId(currentPath);

    return (
        <BsNav
            className="floating-bottom-navbar justify-content-center gap-2 align-items-center flex-row flex-nowrap ps-4 pe-4"
        >
            {navItems.map((item) => {
                const isActive = activeId === item.id;
                return (
                    <BsNav.Item key={item.id}>
                        <Link
                            to={item.to}
                            className={`nav-link floating-bottom-nav-link d-flex flex-column align-items-center justify-content-center px-2 py-1 ${
                                isActive ? "active" : ""
                            }`}
                        >
                            <i
                                className={`bi ${
                                    isActive
                                        ? `${item.icon}-fill`
                                        : item.icon
                                } floating-bottom-nav-icon`}
                            ></i>
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
