import { Nav as BsNav, NavLink } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

const NAV_ITEMS = [
    { label: "Films", to: "/Cameos/", icon: "bi-film" },
    { label: "Tv Series", to: "/Cameos/", icon: "bi-tv" },
    { label: "Profile", to: "/Cameos/", icon: "bi-person" },
    { label: "Friends", to: "/Cameos/", icon: "bi-people" },
];

export default function BottomNavbar() {
    const location = useLocation();
    const currentPath = location.pathname;

    const signUpPath = "/Cameos/signup";
    const loginPath = "/Cameos/login";

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined"
            ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
            : false
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }
        const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
        const handleChange = (event) => setIsMobile(event.matches);

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    if (!isMobile || currentPath === signUpPath || currentPath === loginPath) {
        return null;
    }

    return (
        <nav
            className="floating-bottom-navbar"
            aria-label="Mobile navigation"
        >
            <BsNav className="w-100 justify-content-around align-items-center flex-row flex-nowrap">
                {NAV_ITEMS.map((item) => (
                    <BsNav.Item key={item.label}>
                        <BsNav.Link
                            as={NavLink}
                            to={item.to}
                            className="floating-bottom-nav-link d-flex flex-column align-items-center justify-content-center px-2 py-1"
                        >
                            <i className={`bi ${item.icon} floating-bottom-nav-icon`}></i>
                            <span className="floating-bottom-nav-label">{item.label}</span>
                        </BsNav.Link>
                    </BsNav.Item>
                ))}
            </BsNav>
        </nav>
    );
}
