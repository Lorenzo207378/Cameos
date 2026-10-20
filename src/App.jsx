import {Route, Routes} from "react-router-dom";
import Navbar from './components/Navbar'
import BottomNavbar from './components/BottomNavbar'
import {Container} from "react-bootstrap";
import Authentication from "./pages/Authentication.jsx";
import Home from "./pages/Home.jsx";

function App() {
    const basePath = "/Cameos/";

    return (
        <div className="app background-color d-flex flex-column w-100">
            <Navbar/>
            <Container
                fluid
                className="justify-content-center align-items-center d-flex flex-grow-1 px-2"
            >
                <div className="w-100" style={{maxWidth: "500px"}}>
                    <Routes>
                        <Route path={basePath} element={<Home/>}></Route>
                        <Route path={basePath + "login"} element={<Authentication mode="login"/>}></Route>
                        <Route path={basePath + "signup"} element={<Authentication mode="signup"/>}></Route>
                    </Routes>
                </div>
            </Container>
            <BottomNavbar/>
        </div>
    )
}

export default App
