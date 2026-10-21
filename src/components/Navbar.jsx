import {
    Navbar as BsNavbar,
    Container,
    Button as BsButton,
    Nav as BsNav,
} from 'react-bootstrap'

import { useEffect, useState } from 'react'
import Logo from '../assets/app-icon.png'
import Search from '../assets/search.png'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import '../css/Navbar.css'

const MOBILE_MEDIA_QUERY = "(max-width: 768px)";

export default function Navbar(){
    const {user, loading} = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    const loginPath = "/Cameos/login";
    const homePath = "/Cameos/";
    const isAuthPage =  currentPath === loginPath;


    const handleMenuClick = (event) => {
        if (!user) {
            event.preventDefault();
            navigate(loginPath);
        }
    };

    const handleSearchClick = () => {
        if (!user) {
            navigate(loginPath);
        }
    };

    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined"
            ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
            : false
    );

    const [isAppNameHovered, setIsAppNameHovered] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }
        const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
        const handleChange = (event) => setIsMobile(event.matches);

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);


    if (isMobile) {
        return (
            <BsNavbar
                data-bs-theme="dark"
                style={{
                    backgroundColor: "var(--app-primary-color)",
                }}
                className="shadow-sm mb-3 w-100 flex-nowrap sticky-top navbar-safe-top"
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
                                className="navSearchBar-button ps-3 pe-2"
                                type="button"
                                id="button-search-mobile"
                                onClick={handleSearchClick}
                            >
                                <img
                                    src={Search}
                                    alt="Search"
                                    width="18"
                                    height="18"
                                />
                            </button>
                            <input
                                type="text"
                                className="form-control input-navbar"
                                placeholder="Search..."
                                aria-label="Search Films or TV Series"
                                aria-describedby="button-search-mobile"
                            />
                        </div>
                    )}

                    {!loading && !user && (
                        <BsNav className="ms-auto flex-row flex-shrink-0">
                            <BsButton
                                variant="outline-light"
                                className="shadow-lg border-2 centered-content text-nowrap px-2 py-1"
                                style={{
                                    font: "bold 14px Arial, sans-serif",
                                }}
                                as={Link}
                                to={loginPath}
                            >
                                Log In
                            </BsButton>
                        </BsNav>
                    )}
                </Container>
            </BsNavbar>
        );
    }

    // Navbar Desktop
    return (
        <BsNavbar
            expand={"lg"}
            data-bs-theme="dark"
            style={{
                backgroundColor: "var(--app-primary-color)",
            }}
            className={"shadow-sm mb-4 w-100 flex-nowrap"}
        >
            <Container fluid className="justify-content-start flex-nowrap px-4">
                <BsNavbar.Brand as={Link} to={homePath} className={"fw-bold flex-shrink-0"}>
                    <img
                        alt="Logo"
                        src={Logo}
                        width="32"
                        height="32"
                        className="d-inline-block align-top me-1"
                    />
                    <span
                        className={`app-name-navbar ${isAppNameHovered ? "placeholder-wave" : ""}`}
                        data-text="Cameos"
                        onMouseEnter={() => setIsAppNameHovered(true)}
                        onMouseLeave={() => setIsAppNameHovered(false)}
                        onFocus={() => setIsAppNameHovered(true)}
                        onBlur={() => setIsAppNameHovered(false)}
                        tabIndex={0}
                        style={{
                            color: "white",
                            textShadow: "2px solid black",
                            font: "bold 24px Arial, sans-serif"
                        }}
                    >
                        Cameos
                    </span>
                </BsNavbar.Brand>
                <BsNav
                    className={`flex-row gap-3 ms-4 ms-xl-5 flex-shrink-0 ${
                        isAuthPage ? "invisible" : ""
                    }`}
                    variant={"underline"}
                >
                    <BsNav.Link className={"nav-item"} to={homePath} onClick={handleMenuClick}>
                        Films
                    </BsNav.Link>
                    <BsNav.Link className={"nav-item"} to={homePath} onClick={handleMenuClick}>
                        Tv Series
                    </BsNav.Link>
                    <BsNav.Link className={"nav-item"} to={homePath} onClick={handleMenuClick}>
                        Profile
                    </BsNav.Link>
                    <BsNav.Link className={"nav-item"} to={homePath} onClick={handleMenuClick}>
                        Friends
                    </BsNav.Link>
                </BsNav>
                {!isAuthPage && (
                    <div className="input-group navbar-search flex-nowrap mx-3 mx-xl-5">
                        <button
                            className="navSearchBar-button ps-3 pe-2"
                            type="button"
                            id="button-search"
                            onClick={handleSearchClick}
                        >
                            <img
                                src={Search}
                                alt="Search"
                                width="20"
                                height="20"
                                className={"align-content-center d-flex"}
                            />
                        </button>
                        <input
                            type="text"
                            size="24"
                            className="form-control input-navbar"
                            placeholder="Search Films or TV Series"
                            aria-label="Example text with button addon" aria-describedby="button-search"/>
                    </div>
                )}
                {!loading && (!user && (

                    <BsNav className="ms-auto flex-row gap-2 flex-shrink-0">
                        <BsButton
                            variant="outline-light"
                            className={"shadow-lg border-2 centered-content text-nowrap"}
                            style={{
                                font: "bold 16px Arial, sans-serif",
                            }}
                            as={Link}
                            to={loginPath}
                        >
                            Log In
                        </BsButton>
                    </BsNav>))}
            </Container>
        </BsNavbar>
    )
}
