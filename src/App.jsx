import { Route, Routes } from "react-router-dom";
import Navbar from './components/Navbar';
import BottomNavbar from './components/BottomNavbar';
import { Container } from "react-bootstrap";
import Authentication from "./pages/Authentication.jsx";
import Films from "./pages/Films.jsx";
import TVSeries from "./pages/TVSeries.jsx";
import FilmDetail from "./pages/FilmDetail.jsx";
import TVSeriesDetail from "./pages/TVSeriesDetail.jsx";
import SeasonDetail from "./pages/SeasonDetail.jsx";
import ActorDetail from "./pages/ActorDetail.jsx";
import Profile from "./pages/Profile.jsx";
import Friends from "./pages/Friends.jsx";

function App() {
    const basePath = "/Cameos/";

    return (
        <div className="app background-color d-flex flex-column w-100 min-vh-100">
            <Navbar />
            <main className="flex-grow-1 d-flex flex-column w-100">
                <Routes>
                    {/* QUATTRO PAGINE PRINCIPALI: FILMS (DEFAULT), TV SERIES, PROFILE, FRIENDS */}
                    <Route path={basePath} element={<Films />} />
                    <Route path={basePath + "films"} element={<Films />} />
                    <Route path={basePath + "series"} element={<TVSeries />} />
                    <Route path={basePath + "tv"} element={<TVSeries />} />
                    <Route path={basePath + "profile"} element={<Profile />} />
                    <Route path={basePath + "profile/:uid"} element={<Profile />} />
                    <Route path={basePath + "friends"} element={<Friends />} />

                    {/* PAGINE DI DETTAGLIO: FILMDETAIL, TVSERIESDETAIL, SEASONDETAIL, ACTORDETAIL */}
                    <Route path={basePath + "films/:id"} element={<FilmDetail />} />
                    <Route path={basePath + "film/:id"} element={<FilmDetail />} />
                    <Route path={basePath + "series/:id"} element={<TVSeriesDetail />} />
                    <Route path={basePath + "tv/:id"} element={<TVSeriesDetail />} />
                    <Route path={basePath + "series/:id/season/:seasonNumber"} element={<SeasonDetail />} />
                    <Route path={basePath + "actor/:id"} element={<ActorDetail />} />
                    <Route path={basePath + "person/:id"} element={<ActorDetail />} />

                    {/* AUTENTICAZIONE */}
                    <Route
                        path={basePath + "login"}
                        element={
                            <Container fluid className="justify-content-center align-items-center d-flex flex-grow-1 px-2 my-auto py-5">
                                <div className="w-100" style={{ maxWidth: "500px" }}>
                                    <Authentication mode="login" />
                                </div>
                            </Container>
                        }
                    />
                    <Route
                        path={basePath + "signup"}
                        element={
                            <Container fluid className="justify-content-center align-items-center d-flex flex-grow-1 px-2 my-auto py-5">
                                <div className="w-100" style={{ maxWidth: "500px" }}>
                                    <Authentication mode="signup" />
                                </div>
                            </Container>
                        }
                    />

                    {/* FALLBACK ALLA PAGINA DEFAULT (FILMS) */}
                    <Route path="*" element={<Films />} />
                </Routes>
            </main>
            <BottomNavbar />
        </div>
    );
}

export default App;
