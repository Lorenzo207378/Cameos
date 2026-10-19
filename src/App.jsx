import {useState} from 'react'
import {auth, db} from './firebase'
import Navbar from './components/Navbar'
import {Container} from "react-bootstrap";
import Authentication from "./pages/Authentication.jsx";
import {Routes, Route} from "react-router-dom";
import Home from "./pages/Home.jsx";

function App() {
    const [count, setCount] = useState(0)
    const [showAlert, setShowAlert] = useState(true)

    return (
        <div className="app background-color d-flex flex-column min-vh-100 w-100">
            <Navbar/>
            <Container
                fluid
                className="justify-content-center align-items-center d-flex flex-grow-1 px-2"
            >
                <div className="w-100" style={{maxWidth: "500px"}}>
                    <Routes>
                        <Route path="/" element={<Home/>}></Route>
                        <Route path={"/login"} element={<Authentication mode="login"/>}></Route>
                        <Route path={"/signup"} element={<Authentication mode="signup"/>}></Route>
                    </Routes>
                </div>
            </Container>
        </div>
    )
}

export default App