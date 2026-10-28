import { Nav as BsNav } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useTranslation } from "../../utils/translations.js";
import '../../css/components/navbar.css';

const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

export default function BottomNavbar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const { user } = useAuth();
    const { t } = useTranslation();
    const loginPath = "/Cameos/login";
    const navigate = useNavigate();

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined"
            ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
            : false
    );

    const navItems = [
        { id: "films", label: t('nav.media', 'Movies'), to: "/Cameos/", icon: "bi-camera-reels" },
        { id: "series", label: t('nav.tvSeries', 'Tv Series'), to: "/Cameos/series", icon: "bi-tv" },
        { id: "profile", label: t('nav.profile', 'Profile'), to: "/Cameos/profile", icon: "bi-person" },
        { id: "friends", label: t('nav.friends', 'Friends'), to: "/Cameos/friends", icon: "bi-people" },
    ];

    const getActiveId = (path) => {
        if (path.includes("/Cameos/series") || path.includes("/Cameos/tv")) return "series";
        if (path.includes("/Cameos/profile")) return "profile";
        if (path.includes("/Cameos/friends")) return "friends";
        return "films";
    };

    const activeId = getActiveId(currentPath);

    const handleMenuClick = (event, item) => {
        if (!user && (item.id === "profile" || item.id === "friends")) {
            event.preventDefault();
            navigate(loginPath);
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }
        const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
        const handleChange = (event) => setIsMobile(event.matches);

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    if (!isMobile || currentPath === loginPath || currentPath === "/Cameos/signup") {
        return null;
    }

    return (
        <BsNav
            className="floating-bottom-navbar justify-content-center gap-2 align-items-center flex-row flex-nowrap ps-4 pe-4"
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
                            <span className="floating-bottom-nav-label">{item.label}</span>
                        </BsNav.Link>
                    </BsNav.Item>
                );
            })}
        </BsNav>
    );
}
