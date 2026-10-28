import { Route, Routes, useParams } from "react-router-dom";
import Navbar from './components/navbar/Navbar.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import BottomNavbar from './components/navbar/BottomNavbar.jsx';
import { Container } from "react-bootstrap";
import Authentication from "./pages/Authentication.jsx";
import Movies from "./pages/Movies.jsx";
import TVSeries from "./pages/TVSeries.jsx";
import MovieDetail from "./pages/MovieDetail.jsx";
import TVSeriesDetail from "./pages/TVSeriesDetail.jsx";
import SeasonDetail from "./pages/SeasonDetail.jsx";
import ActorDetail from "./pages/ActorDetail.jsx";
import Profile from "./pages/Profile.jsx";
import Friends from "./pages/Friends.jsx";
import MovieCategory from "./pages/MovieCategory.jsx";

const MOVIE_CATEGORY_KEYS = new Set([
  'upcoming',
  'animation',
  'adventure',
  'action',
  'comedy',
  'crime',
  'drama',
  'sciFi',
  'fantasy',
  'horror',
  'romance',
  'sagas',
  'thriller',
  'war'
]);

function FilmDetailOrCategory() {
  const { id } = useParams();
  if (id && MOVIE_CATEGORY_KEYS.has(id)) {
    return <MovieCategory />;
  }
  return <MovieDetail />;
}

function App() {
    const basePath = "/Cameos/";

    return (
        <div className="app background-color d-flex flex-column w-100 min-vh-100">
            <ScrollToTop />
            <Navbar />
            <main className="flex-grow-1 d-flex flex-column w-100">
                <Routes>
                    {/* QUATTRO PAGINE PRINCIPALI: FILMS (DEFAULT), TV SERIES, PROFILE, FRIENDS */}
                    <Route path={basePath} element={<Movies />} />
                    <Route path={basePath + "films"} element={<Movies />} />
                    <Route path={basePath + "movies"} element={<Movies />} />
                    <Route path={basePath + "series"} element={<TVSeries />} />
                    <Route path={basePath + "tv"} element={<TVSeries />} />
                    <Route path={basePath + "profile"} element={<Profile />} />
                    <Route path={basePath + "profile/:uid"} element={<Profile />} />
                    <Route path={basePath + "friends"} element={<Friends />} />

                    {/* PAGINE DI DETTAGLIO: FILMDETAIL, TVSERIESDETAIL, SEASONDETAIL, ACTORDETAIL, FILMSCATEGORY */}
                    <Route path={basePath + "films/category/:category"} element={<MovieCategory />} />
                    <Route path={basePath + "movies/category/:category"} element={<MovieCategory />} />
                    <Route path={basePath + "media/:id"} element={<MovieDetail />} />
                    <Route path={basePath + "film/:id"} element={<MovieDetail />} />
                    <Route path={basePath + "movie/:id"} element={<MovieDetail />} />
                    <Route path={basePath + "films/:id"} element={<FilmDetailOrCategory />} />
                    <Route path={basePath + "movies/:id"} element={<FilmDetailOrCategory />} />
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
                    {/* FALLBACK ALLA PAGINA DEFAULT (FILMS) */}
                    <Route path="*" element={<Movies />} />
                </Routes>
            </main>
            <BottomNavbar />
        </div>
    );
}

export default App;
