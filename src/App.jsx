import { useState } from 'react'
import { auth, db } from './firebase'
import Navbar from './components/Navbar'
import { Container} from "react-bootstrap";
import Authentication from "./pages/Authentication.jsx";

function App() {
  const [count, setCount] = useState(0)
  const [showAlert, setShowAlert] = useState(true)

  return (
      <Container
          fluid
          className=
              "
              app
              background-color
              justify-content-center
              align-items-center
              d-flex
              px-2"
          style={{minHeight: "100vh", width: "100%"}}>

          <div className="w-100" style={{maxWidth: "500px"}}>
              <Authentication  />
          </div>

      </Container>
  )
}

export default App