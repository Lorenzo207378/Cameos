import { useState } from 'react'
import { Container, Navbar, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap'

function App() {
    const [count, setCount] = useState(0)
    const [showAlert, setShowAlert] = useState(true)

    return (
        <>
            {/* Test Navbar a tutta larghezza */}
            <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 shadow-sm">
                <Container>
                    <Navbar.Brand href="#home">
                        <i className="bi bi-camera-reels me-2"></i>
                        Cameos <Badge bg="primary" className="ms-1">Test</Badge>
                    </Navbar.Brand>
                </Container>
            </Navbar>

            {/* Test Griglia e Componenti */}
            <Container>
                {showAlert && (
                    <Alert variant="success" onClose={() => setShowAlert(false)} dismissible>
                        <i className="bi bi-check-circle-fill me-2"></i>
                        <strong>Ottimo!</strong> Bootstrap, React-Bootstrap e le icone funzionano correttamente.
                    </Alert>
                )}

                <Row className="g-4">
                    <Col md={6}>
                        <Card className="h-100 shadow-sm">
                            <Card.Body>
                                <Card.Title>Test Interattività React</Card.Title>
                                <Card.Text className="text-muted">
                                    Prova a cliccare il pulsante qui sotto per verificare che lo stato di React e i componenti Bootstrap lavorino insieme.
                                </Card.Text>
                                <Button variant="primary" onClick={() => setCount(count + 1)}>
                                    <i className="bi bi-hand-index-thumb me-2"></i>
                                    Hai cliccato {count} {count === 1 ? 'volta' : 'volte'}
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={6}>
                        <Card className="h-100 shadow-sm border-primary">
                            <Card.Body>
                                <Card.Title>Test Griglia Responsive</Card.Title>
                                <Card.Text className="text-muted">
                                    Su schermi grandi queste due Card sono affiancate (2 colonne). Prova a restringere la finestra del browser: si impileranno una sopra l'altra.
                                </Card.Text>
                                <Button variant="outline-secondary" onClick={() => setShowAlert(true)}>
                                    Mostra di nuovo l'avviso verde
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    )
}

export default App