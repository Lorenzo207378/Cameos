import {
    Navbar as BsNavbar,
    Container,
    Button as BsButton,
    Nav as BsNav,
    NavLink,
} from 'react-bootstrap'

import { Link } from 'react-router-dom'

export default function Navbar(){
    return (
        <BsNavbar
            expand={"lg"}
            data-bs-theme="dark"
            style={{
                backgroundColor: "red"
            }}
            className={"shadow-sm mb-4"}
        >
            <Container className="justify-content-start">
                <BsNavbar.Brand as={Link} to={"/"} className={"fw-bold"}>
                    <img
                        alt="Logo"
                        src={"./assets/react.svg"}
                        width="30"
                        height="30"
                        className="d-inline-block align-top me-1"
                    />
                    <span
                        style={{
                            color: "white",
                            textShadow: "2px solid black",
                            font: "bold 24px Arial, sans-serif"
                        }}
                    >
                        FastestFanta
                    </span>
                </BsNavbar.Brand>
                <BsNav
                    className="flex-row gap-3 ms-5"
                    variant={"underline"}
                >
                    <BsNav.Link as={NavLink} to={"/"}>
                        Rules
                    </BsNav.Link>
                    <BsNav.Link as={NavLink} to={"/"}>
                        Driver Info
                    </BsNav.Link>
                </BsNav>
            </Container>
        </BsNavbar>
    )
}