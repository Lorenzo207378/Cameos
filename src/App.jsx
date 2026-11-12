import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from './components/navbar/Navbar.jsx';
import BottomNavbar from './components/navbar/BottomNavbar.jsx';
import { Container } from "react-bootstrap";
import Authentication from "./pages/Authentication.jsx";
import Movies from "./pages/Movies.jsx";
import TVSeries from "./pages/TVSeries.jsx";
import MovieDetail from "./pages/MovieDetail.jsx";
import TVSeriesDetail from "./pages/TVSeriesDetail.jsx";
import TVSeriesEpisodeDetail from "./pages/TVSeriesEpisodeDetail.jsx";
import PersonDetail from "./pages/PersonDetail.jsx";
import Search from "./pages/Search.jsx";
import Profile from "./pages/Profile.jsx";
import Friends from "./pages/Friends.jsx";
import MovieCategory from "./pages/MovieCategory.jsx";
import TVSeriesCategory from "./pages/TVSeriesCategory.jsx";

function App() {
    const basePath = "/Cameos/";
    const { pathname } = useLocation();

    return (
        <div className="app background-color d-flex flex-column w-100 min-vh-100">
            <Navbar />
            <main className="flex-grow-1 d-flex flex-column w-100">
                <Routes>
                    {/* QUATTRO PAGINE PRINCIPALI: FILMS (DEFAULT), TV SERIES, PROFILE, FRIENDS */}
                    <Route path={basePath} element={<Movies />} />
                    <Route path={basePath + "movies"} element={<Movies />} />
                    <Route path={basePath + "series"} element={<TVSeries />} />
                    <Route path={basePath + "tv"} element={<TVSeries />} />
                    <Route path={basePath + "search"} element={<Search />} />
                    <Route path={basePath + "profile"} element={<Profile />} />
                    <Route path={basePath + "friends"} element={<Friends />} />

                    {/* PAGINE DI DETTAGLIO: FILMDETAIL, TVSERIESDETAIL, SEASONDETAIL, PERSONDETAIL, FILMSCATEGORY */}
                    <Route path={basePath + "movies/category/:category"} element={<MovieCategory key={pathname} />} />
                    <Route path={basePath + "movie/:id"} element={<MovieDetail key={pathname} />} />
                    <Route path={basePath + "series/category/:category"} element={<TVSeriesCategory key={pathname} />} />
                    <Route path={basePath + "series/:id"} element={<TVSeriesDetail key={pathname} />} />
                    <Route path={basePath + "series/:id/season/:seasonNumber/episode/:episodeNumber"} element={<TVSeriesEpisodeDetail key={pathname} />} />
                    <Route path={basePath + "person/:id"} element={<PersonDetail key={pathname} />} />
                    <Route path={basePath + "actor/:id"} element={<PersonDetail key={pathname} />} />

                    {/* AUTENTICAZIONE */}
                    <Route
                        path={basePath + "login"}
                        element={
                            <Container fluid className="justify-content-center align-items-center d-flex flex-grow-1 px-2 my-auto py-5">
                                <div className="w-100" style={{ maxWidth: "31.25rem" }}>
                                    <Authentication mode="login" />
                                </div>
                            </Container>
                        }
                    />
                    {/* FALLBACK ALLA PAGINA DEFAULT (FILMS) */}
                    <Route path="*" element={<Movies />} />
                </Routes>
            </main>
            <BottomNavbar />
        </div>
    );
}

export default App;
