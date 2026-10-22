import { Nav as BsNav } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

const NAV_ITEMS = [
    { label: "Films", to: "/Cameos/", icon: "bi-camera-reels" },
    { label: "Tv Series", to: "/Cameos/series", icon: "bi-tv" },
    { label: "Profile", to: "/Cameos/profile", icon: "bi-person" },
    { label: "Friends", to: "/Cameos/friends", icon: "bi-people" },
];

export default function BottomNavbar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const { user } = useAuth();
    const loginPath = "/Cameos/login";
    const navigate = useNavigate();

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined"
            ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
            : false
    );

    const getActiveLabel = (path) => {
        if (path.includes("/Cameos/series") || path.includes("/Cameos/tv")) return "Tv Series";
        if (path.includes("/Cameos/profile")) return "Profile";
        if (path.includes("/Cameos/friends")) return "Friends";
        return "Films";
    };

    const activeLabel = getActiveLabel(currentPath);

    const handleMenuClick = (event, item) => {
        if (!user && (item.label === "Profile" || item.label === "Friends")) {
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
            {NAV_ITEMS.map((item) => {
                const isActive = activeLabel === item.label;
                return (
                    <BsNav.Item key={item.label}>
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
