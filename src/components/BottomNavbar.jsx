import { Nav as BsNav } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

const NAV_ITEMS = [
    { label: "Films", to: "/Cameos/", icon: "bi-camera-reels" },
    { label: "Tv Series", to: "/Cameos/", icon: "bi-tv" },
    { label: "Profile", to: "/Cameos/", icon: "bi-person" },
    { label: "Friends", to: "/Cameos/", icon: "bi-people" },
];

export default function BottomNavbar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const {user} = useAuth();

    const loginPath = "/Cameos/login";

    const navigate = useNavigate();

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined"
            ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
            : false
    );
    const [selectedItem, setSelectedItem] = useState(NAV_ITEMS[0].label);

    const handleMenuClick = (event, label) => {
        if (!user) {
            event.preventDefault();
            navigate(loginPath);
            return;
        }
        setSelectedItem(label);
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

    if (!isMobile || currentPath === loginPath) {
        return null;
    }

    return (
        <BsNav
            className=
                "
                floating-bottom-navbar
                justify-content-center
                gap-2
                align-items-center
                flex-row
                flex-nowrap
                ps-4
                pe-4
                "
            style={{width: "fit-content", height: "fit-content"}}
        >
            {NAV_ITEMS.map((item) => (
                <BsNav.Item key={item.label}>
                    <BsNav.Link
                        as={Link}
                        to={item.to}
                        className={`floating-bottom-nav-link d-flex flex-column align-items-center justify-content-center px-2 py-1 ${
                            selectedItem === item.label ? "active" : ""
                        }`}
                        onClick={(event) => handleMenuClick(event, item.label)}
                    >
                        <i
                            className={`bi ${
                                selectedItem === item.label
                                    ? item.selectedIcon || `${item.icon}-fill`
                                    : item.icon
                            } floating-bottom-nav-icon`}
                        ></i>
                        <span className="floating-bottom-nav-label">{item.label}</span>
                    </BsNav.Link>
                </BsNav.Item>
            ))}
        </BsNav>
    );
}
