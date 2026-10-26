import {Route, Routes} from "react-router-dom";
import Navbar from './components/Navbar'
import BottomNavbar from './components/BottomNavbar'
import {Container} from "react-bootstrap";
import Authentication from "./pages/Authentication.jsx";
import Home from "./pages/Home.jsx";
import Series from "./pages/Series.jsx";
import Profile from "./pages/Profile.jsx";


function App() {
    const basePath = "/Cameos/";

    return (
        <div className="app background-color d-flex flex-column w-100">
            <Navbar/>
            <main className="flex-grow-1 d-flex flex-column w-100">
                <Routes>
                    <Route path={basePath} element={<Home/>}></Route>
                    <Route path={basePath + "series"} element={<Series/>}></Route>
                    <Route
                        path={basePath + "login"}
                        element={
                            <Container fluid className="justify-content-center align-items-center d-flex flex-grow-1 px-2">
                                <div className="w-100" style={{maxWidth: "500px"}}>
                                    <Authentication mode="login"/>
                                </div>
                            </Container>
                        }
                    />
                    <Route path={basePath + "profile"} element={<Profile/>}></Route>
                    <Route
                        path={basePath + "signup"}
                        element={
                            <Container fluid className="justify-content-center align-items-center d-flex flex-grow-1 px-2">
                                <div className="w-100" style={{maxWidth: "500px"}}>
                                    <Authentication mode="signup"/>
                                </div>
                            </Container>
                        }
                    />
                </Routes>
            </main>
            <BottomNavbar/>
        </div>
    )
}

export default App
