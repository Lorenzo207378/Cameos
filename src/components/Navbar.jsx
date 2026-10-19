import {
    Navbar as BsNavbar,
    Container,
    Button as BsButton,
    Nav as BsNav,
    NavLink,
} from 'react-bootstrap'
import Logo from '../assets/app-icon.png'
import Search from '../assets/search.png'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Navbar(){
    const {user, loading, logout} = useAuth();
    const location = useLocation();
    const currentPath = location.pathname;

    return (
        <BsNavbar
            expand={"lg"}
            data-bs-theme="dark"
            style={{
                backgroundColor: "var(--app-primary-color)",
            }}
            className={"shadow-sm mb-4 w-100"}
        >
            <Container fluid className="justify-content-start px-4">
                <BsNavbar.Brand as={Link} to={"/"} className={"fw-bold flex-shrink-0"}>
                    <img
                        alt="Logo"
                        src={Logo}
                        width="32"
                        height="32"
                        className="d-inline-block align-top me-1"
                    />
                    <span
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
                    className={`flex-row gap-3 ms-5 flex-shrink-0 ${
                        currentPath === "/signup" || currentPath === "/login"
                            ? "invisible"
                            : ""
                    }`}
                    variant={"underline"}
                >
                    <BsNav.Link as={NavLink} to={"/"}>
                        Films
                    </BsNav.Link>
                    <BsNav.Link as={NavLink} to={"/"}>
                        Tv Series
                    </BsNav.Link>
                    <BsNav.Link as={NavLink} to={"/"}>
                        Profile
                    </BsNav.Link>
                    <BsNav.Link as={NavLink} to={"/"}>
                        Friends
                    </BsNav.Link>
                </BsNav>
                <div className="input-group navbar-search ms-5 me-5">
                    <button className="searchBar-button ps-3 pe-2" type="button"
                            id="button-search">
                        <img
                            src={Search}
                            alt="Search"
                            width="20"
                            height="20"
                            className={""}
                        />
                    </button>
                    <input
                        type="text"
                        size="24"
                        className="form-control input-navbar"
                        placeholder="Search Films or TV Series"
                           aria-label="Example text with button addon" aria-describedby="button-search"/>
                </div>
                {!loading && (!user && (

                    <BsNav className="ms-auto flex-row gap-2 flex-shrink-0">
                        <BsButton
                            variant="outline-light"
                            className={"shadow-lg border-2 centered-content"}
                            style={{
                                font: "bold 16px Arial, sans-serif",
                            }}
                            as={Link}
                            to={"/login"}
                        >
                            Log In
                        </BsButton>
                        <BsButton
                            variant="primary"
                            className="signup-button centered-content"
                            style={{
                                font: "bold 16px Arial, sans-serif",
                                boxShadow: "0 3px 6px rgba(0, 0, 0, 0.35)"
                            }}
                            as={Link}
                            to={"/signup"}
                        >
                            Sign Up
                        </BsButton>
                    </BsNav>))}
            </Container>
        </BsNavbar>
    )
}