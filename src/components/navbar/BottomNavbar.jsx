import { Nav as BsNav } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useDevice } from "../../contexts/DeviceContext.jsx";
import { useTranslation } from "../../utils/translations.js";
import '../../css/components/navbar.css';

const ALLOWED_NAVBAR_PATHS = new Set([
    '/',
    '/Cameos',
    '/Cameos/movies',
    '/Cameos/series',
    '/Cameos/tv',
    '/Cameos/friends'
]);

export default function BottomNavbar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const { user } = useAuth();
    const { isMobile } = useDevice();
    const { t } = useTranslation();
    const loginPath = "/Cameos/login";
    const navigate = useNavigate();

    const normalizedPath = currentPath.endsWith('/') && currentPath.length > 1
        ? currentPath.slice(0, -1)
        : currentPath;

    if (!isMobile || !ALLOWED_NAVBAR_PATHS.has(normalizedPath)) {
        return null;
    }

    const navItems = [
        { id: "films", label: t('nav.media'), to: "/Cameos/", icon: "bi-camera-reels" },
        { id: "series", label: t('nav.tvSeries'), to: "/Cameos/series", icon: "bi-tv" },
        { id: "friends", label: t('nav.friends'), to: "/Cameos/friends", icon: "bi-people" },
    ];

    const getActiveId = (path) => {
        if (path.includes("/Cameos/series") || path.includes("/Cameos/tv")) return "series";
        if (path.includes("/Cameos/friends")) return "friends";
        return "films";
    };

    const activeId = getActiveId(currentPath);

    const handleMenuClick = (event, item) => {
        if (!user && item.id === "friends") {
            event.preventDefault();
            navigate(loginPath);
        }
    };

    return (
        <BsNav
            className="floating-bottom-navbar justify-content-center gap-2 align-items-center flex-row flex-nowrap ps-3 pe-3"
            style={{ width: "fit-content", height: "fit-content" }}
        >
            {navItems.map((item) => {
                const isActive = activeId === item.id;
                return (
                    <BsNav.Item key={item.id}>
                        <BsNav.Link
                            as={Link}
                            to={item.to}
                            className={`floating-bottom-nav-link d-flex flex-column align-items-center justify-content-center px-2 py-1 ${
                                isActive ? "active" : ""
                            }`}
                            onClick={(event) => handleMenuClick(event, item)}
                        >
                            <i
                                className={`bi ${
                                    isActive
                                        ? `${item.icon}-fill`
                                        : item.icon
                                } floating-bottom-nav-icon`}
                            ></i>
                        </BsNav.Link>
                    </BsNav.Item>
                );
            })}
        </BsNav>
    );
}
