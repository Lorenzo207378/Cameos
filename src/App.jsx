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
import ProfileReviews from "./pages/ProfileReviews.jsx";
import ProfileMediaCategory from "./pages/ProfileMediaCategory.jsx";
import Friends from "./pages/Friends.jsx";
import MovieCategory from "./pages/MovieCategory.jsx";
import TVSeriesCategory from "./pages/TVSeriesCategory.jsx";
import { APP_ROUTES } from "./utils/appRoutes.js";
import { usePreventPinchZoom } from "./utils/domUtils.js";

function App() {
    usePreventPinchZoom();
    const { pathname } = useLocation();

    return (
        <div className="app background-color d-flex flex-column w-100 min-vh-100">
            <Navbar />
            <main className="flex-grow-1 d-flex flex-column w-100">
                <Routes>
                    {/* QUATTRO PAGINE PRINCIPALI: FILMS (DEFAULT), TV SERIES, PROFILE, FRIENDS */}
                    <Route path={APP_ROUTES.home} element={<Movies />} />
                    <Route path={APP_ROUTES.movies} element={<Movies />} />
                    <Route path={APP_ROUTES.series} element={<TVSeries />} />
                    <Route path={APP_ROUTES.tv} element={<TVSeries />} />
                    <Route path={APP_ROUTES.search} element={<Search />} />
                    <Route path={APP_ROUTES.profile} element={<Profile key={pathname} />} />
                    <Route path={APP_ROUTES.profileReviews} element={<ProfileReviews key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.profileCollection} element={<ProfileMediaCategory key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.profileUser} element={<Profile key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.profileReviewsUser} element={<ProfileReviews key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.profileCollectionUser} element={<ProfileMediaCategory key={pathname} />} />
                    <Route path={APP_ROUTES.friends} element={<Friends />} />

                    {/* PAGINE DI DETTAGLIO: FILMDETAIL, TVSERIESDETAIL, SEASONDETAIL, PERSONDETAIL, FILMSCATEGORY */}
                    <Route path={APP_ROUTES.patterns.moviesCategory} element={<MovieCategory key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.movieDetail} element={<MovieDetail key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.seriesCategory} element={<TVSeriesCategory key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.seriesDetail} element={<TVSeriesDetail key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.seriesSeason} element={<TVSeriesDetail key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.seriesEpisode} element={<TVSeriesEpisodeDetail key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.personDetail} element={<PersonDetail key={pathname} />} />
                    <Route path={APP_ROUTES.patterns.actorDetail} element={<PersonDetail key={pathname} />} />

                    {/* AUTENTICAZIONE */}
                    <Route
                        path={APP_ROUTES.login}
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
