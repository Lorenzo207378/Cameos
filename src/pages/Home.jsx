import { useState } from "react";
import List from "../components/tv/List";

export default function Home() {
    const [activeFilter, setActiveFilter] = useState("Tutti");

    const categories = ["Tutti", "Fantascienza", "Azione", "Thriller", "Dramma", "Animazione", "Classici"];

    const featuredMovie = {
        title: "Dune - Parte Due",
        tagline: "Il destino dell'universo si compie sulle sabbie di Arrakis.",
        rating: "8.6",
        year: "2024",
        duration: "2h 46m",
        genres: ["Fantascienza", "Avventura", "Drammatico"],
        description:
            "Paul Atreides si unisce a Chani e ai Fremen mentre trama la vendetta contro i cospiratori che hanno distrutto la sua famiglia. Di fronte a una scelta tra l'amore della sua vita e il destino dell'universo, farà di tutto per prevenire un futuro terribile che solo lui può prevedere.",
        backdrop: "linear-gradient(135deg, rgba(10, 93, 10, 0.85) 0%, rgba(20, 40, 25, 0.92) 50%, rgba(30, 30, 36, 0.98) 100%)",
        cameoHighlight: "Cameo speciale: Anya Taylor-Joy nel ruolo segreto di Alia Atreides.",
    };

    const trendingMovies = [
        {
            id: 1,
            title: "Interstellar",
            year: "2014",
            duration: "2h 49m",
            genre: "Fantascienza",
            rating: "8.7",
            views: "1.4M",
            cameo: "Matt Damon (Dr. Mann - cameo a sorpresa non accreditato nei trailer)",
            badge: "Top Rated",
            badgeColor: "bg-warning text-dark",
        },
        {
            id: 2,
            title: "Blade Runner 2049",
            year: "2017",
            duration: "2h 44m",
            genre: "Cyberpunk",
            rating: "8.0",
            views: "980K",
            cameo: "Harrison Ford (Rick Deckard)",
            badge: "Cult",
            badgeColor: "bg-info text-dark",
        },
        {
            id: 3,
            title: "Oppenheimer",
            year: "2023",
            duration: "3h 00m",
            genre: "Biografico",
            rating: "8.9",
            views: "2.1M",
            cameo: "Gary Oldman (Harry S. Truman)",
            badge: "Oscar Winner",
            badgeColor: "bg-success text-white",
        },
        {
            id: 4,
            title: "Spider-Man: No Way Home",
            year: "2021",
            duration: "2h 28m",
            genre: "Supereroi",
            rating: "8.2",
            views: "3.5M",
            cameo: "Charlie Cox (Matt Murdock / Daredevil)",
            badge: "Multiverse",
            badgeColor: "bg-danger text-white",
        },
        {
            id: 5,
            title: "The Batman",
            year: "2022",
            duration: "2h 56m",
            genre: "Noir / Crime",
            rating: "7.8",
            views: "1.2M",
            cameo: "Barry Keoghan (Il Joker ad Arkham)",
            badge: "Dark",
            badgeColor: "bg-secondary text-white",
        },
        {
            id: 6,
            title: "Pulp Fiction",
            year: "1994",
            duration: "2h 34m",
            genre: "Cult",
            rating: "8.9",
            views: "4.8M",
            cameo: "Quentin Tarantino (Jimmie Dimmick)",
            badge: "Classico",
            badgeColor: "bg-light text-dark",
        },
    ];

    const tvSeries = [
        {
            id: 101,
            title: "Severance",
            seasons: "2 Stagioni",
            episodes: "19 Episodi",
            network: "Apple TV+",
            rating: "8.7",
            status: "Nuova Stagione",
            genre: "Thriller psicologico",
        },
        {
            id: 102,
            title: "The Bear",
            seasons: "3 Stagioni",
            episodes: "28 Episodi",
            network: "FX / Hulu",
            rating: "8.6",
            status: "In Corso",
            genre: "Commedia drammatica",
        },
        {
            id: 103,
            title: "The Last of Us",
            seasons: "1 Stagione",
            episodes: "9 Episodi",
            network: "HBO",
            rating: "8.8",
            status: "Rinnovata",
            genre: "Post-apocalittico",
        },
        {
            id: 104,
            title: "Stranger Things",
            seasons: "4 Stagioni",
            episodes: "34 Episodi",
            network: "Netflix",
            rating: "8.7",
            status: "Stagione Finale",
            genre: "Mistero / Sci-Fi",
        },
    ];

    const famousCameos = [
        {
            actor: "Stan Lee",
            movie: "Marvel Cinematic Universe (2008-2019)",
            type: "Tradizione Leggendaria",
            description: "Oltre 22 camei iconici: autista di autobus, postino Fed-Ex, veterano di guerra e guardiano cosmico.",
            icon: "bi-stars",
        },
        {
            actor: "Matt Damon",
            movie: "Thor: Ragnarok (2017)",
            type: "Cameo Comico a Sorpresa",
            description: "Interpreta un attore asgardiano teatrale che impersona Loki nella recita commemorativa.",
            icon: "bi-mask",
        },
        {
            actor: "David Bowie",
            movie: "Zoolander (2001)",
            type: "Cameo Giudice Iconico",
            description: "Giudice imparziale nella leggendaria 'sfilata di moda all'ultimo sangue' tra Derek e Hansel.",
            icon: "bi-lightning-charge",
        },
        {
            actor: "Brad Pitt",
            movie: "Deadpool 2 (2018)",
            type: "Cameo di 1 Secondo",
            description: "Appare per soli tre fotogrammi come Vanisher mentre finisce accidentalmente sui cavi della luce.",
            icon: "bi-camera-reels",
        },
    ];

    const communityReviews = [
        {
            author: "Elena Rossi",
            handle: "@elenacine",
            film: "Dune - Parte Due",
            rating: 5,
            comment: "Esperienza visiva e sonora impressionante. Villeneuve ha ridefinito la fantascienza sul grande schermo.",
            likes: 142,
        },
        {
            author: "Marco Bianchi",
            handle: "@marcomovies",
            film: "Interstellar",
            rating: 5,
            comment: "Rivederlo dopo anni fa ancora lo stesso effetto devastante. La colonna sonora di Hans Zimmer è un capolavoro eterno.",
            likes: 89,
        },
        {
            author: "Giulia Neri",
            handle: "@giulia_reviews",
            film: "Severance (Stagione 2)",
            rating: 4,
            comment: "Scrittura brillante, cliffhanger a ogni puntata. La miglior serie thriller degli ultimi cinque anni.",
            likes: 67,
        },
    ];

    return (
        <>
        <List />
        <div className="home w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
            {/* HERO SECTION IN EVIDENZA */}
            <section
                className="p-4 p-md-5 rounded-4 mb-5 shadow-lg position-relative overflow-hidden"
                style={{
                    background: featuredMovie.backdrop,
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
            >
                <div className="row align-items-center g-4">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                            <span className="badge rounded-pill bg-success px-3 py-2 fw-semibold">
                                <i className="bi bi-star-fill me-1 text-warning"></i> IN EVIDENZA OGGI
                            </span>
                            <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-2">
                                {featuredMovie.year}
                            </span>
                            <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-2">
                                {featuredMovie.duration}
                            </span>
                            <span className="badge rounded-pill bg-warning text-dark px-3 py-2 fw-bold">
                                IMDb {featuredMovie.rating}
                            </span>
                        </div>

                        <h1 className="display-4 fw-bold text-white mb-2">{featuredMovie.title}</h1>
                        <p className="fs-5 text-success-emphasis fw-semibold mb-3">{featuredMovie.tagline}</p>
                        <p className="lead text-white-50 mb-4" style={{ maxWidth: "720px" }}>
                            {featuredMovie.description}
                        </p>

                        <div className="p-3 rounded-3 mb-4 bg-dark bg-opacity-50 border border-success border-opacity-25 d-flex align-items-center gap-3">
                            <i className="bi bi-person-badge text-success fs-3 flex-shrink-0"></i>
                            <div>
                                <small className="text-uppercase fw-bold text-success d-block">Dettaglio Cameo</small>
                                <span className="text-white small">{featuredMovie.cameoHighlight}</span>
                            </div>
                        </div>

                        <div className="d-flex flex-wrap gap-3">
                            <button type="button" className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2">
                                <i className="bi bi-play-circle-fill fs-5"></i> Guarda Trailer
                            </button>
                            <button type="button" className="btn btn-outline-light rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2">
                                <i className="bi bi-bookmark-plus fs-5"></i> Aggiungi alla Watchlist
                            </button>
                        </div>
                    </div>

                    <div className="col-lg-4 d-none d-lg-block">
                        <div className="card-2pxb-dark-background rounded-4 p-4 text-white shadow-sm">
                            <h3 className="h5 fw-bold text-white mb-3 d-flex align-items-center gap-2">
                                <i className="bi bi-fire text-danger"></i> Statistiche Rapide
                            </h3>
                            <ul className="list-unstyled mb-0 d-flex flex-column gap-3 small">
                                <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                                    <span className="text-white-50">Generi</span>
                                    <span className="fw-semibold">{featuredMovie.genres.join(", ")}</span>
                                </li>
                                <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                                    <span className="text-white-50">Recensioni Utenti</span>
                                    <span className="text-success fw-bold">96% Positive</span>
                                </li>
                                <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                                    <span className="text-white-50">Camei Rilevati</span>
                                    <span className="badge bg-success rounded-pill">3 Convalidati</span>
                                </li>
                                <li className="d-flex justify-content-between">
                                    <span className="text-white-50">Disponibilità</span>
                                    <span className="fw-semibold text-warning">Cinema & Streaming</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* BARRA FILTRI RAPIDI */}
            <div className="d-flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveFilter(cat)}
                        className={`btn rounded-pill px-3 py-1 text-nowrap fw-semibold small ${
                            activeFilter === cat ? "btn-success" : "btn-dark text-white-50 border-secondary border-opacity-25"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* SEZIONE 1: FILM DEL MOMENTO */}
            <section className="mb-5">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <p className="text-success text-uppercase small fw-bold mb-1">Catalogo</p>
                        <h2 className="h3 text-white fw-bold mb-0">Film del Momento</h2>
                    </div>
                    <span className="text-white-50 small d-none d-sm-inline">6 titoli consigliati</span>
                </div>

                <div className="row g-3 g-md-4">
                    {trendingMovies.map((movie) => (
                        <div className="col-12 col-sm-6 col-lg-4" key={movie.id}>
                            <div className="card-2pxb-dark-background rounded-4 p-4 h-100 text-white d-flex flex-column justify-content-between shadow-sm hover-scale">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <span className={`badge rounded-pill px-3 py-1 small ${movie.badgeColor}`}>
                                            {movie.badge}
                                        </span>
                                        <span className="text-warning small fw-bold d-flex align-items-center gap-1">
                                            <i className="bi bi-star-fill"></i> {movie.rating}
                                        </span>
                                    </div>
                                    <h3 className="h5 fw-bold text-white mb-1">{movie.title}</h3>
                                    <p className="text-white-50 small mb-3">
                                        {movie.genre} • {movie.year} • {movie.duration}
                                    </p>
                                    <div className="bg-dark bg-opacity-75 rounded-3 p-3 mb-3 border border-secondary border-opacity-25">
                                        <small className="text-success d-block fw-semibold mb-1">
                                            <i className="bi bi-eye-fill me-1"></i> Cameo Rilevato:
                                        </small>
                                        <small className="text-white-50">{movie.cameo}</small>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25">
                                    <span className="text-white-50 small">
                                        <i className="bi bi-people me-1"></i> {movie.views} views
                                    </span>
                                    <button type="button" className="btn btn-sm btn-outline-success rounded-pill px-3">
                                        Dettagli
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SEZIONE 2: SERIE TV */}
            <section className="mb-5">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <p className="text-warning text-uppercase small fw-bold mb-1">Binge Watching</p>
                        <h2 className="h3 text-white fw-bold mb-0">Serie TV Più Viste</h2>
                    </div>
                    <span className="badge rounded-pill text-bg-warning px-3 py-2 fw-semibold">Top Trend</span>
                </div>

                <div className="row g-3 g-md-4">
                    {tvSeries.map((series) => (
                        <div className="col-12 col-md-6 col-xl-3" key={series.id}>
                            <div className="card-2pxb-dark-background rounded-4 p-4 h-100 text-white d-flex flex-column justify-content-between shadow-sm">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="badge bg-secondary bg-opacity-50 text-white-50 rounded-pill small">
                                            {series.network}
                                        </span>
                                        <span className="badge bg-success rounded-pill small">{series.status}</span>
                                    </div>
                                    <h3 className="h5 fw-bold text-white mt-2 mb-1">{series.title}</h3>
                                    <p className="text-white-50 small mb-3">{series.genre}</p>
                                </div>
                                <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-25">
                                    <div className="small text-white-50">
                                        <div>{series.seasons}</div>
                                        <div className="text-white-50 small">{series.episodes}</div>
                                    </div>
                                    <span className="text-warning fw-bold small">
                                        <i className="bi bi-star-fill me-1"></i> {series.rating}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SEZIONE 3: CAMEI LEGGENDARI */}
            <section className="mb-5 p-4 p-md-5 rounded-4 card-2pxb-dark-background shadow-lg">
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="p-3 rounded-circle bg-success bg-opacity-25 text-success fs-3">
                        <i className="bi bi-camera-reels-fill"></i>
                    </div>
                    <div>
                        <p className="text-success text-uppercase small fw-bold mb-1">Curiosità & Easter Egg</p>
                        <h2 className="h3 text-white fw-bold mb-0">Camei della Storia del Cinema</h2>
                    </div>
                </div>

                <div className="row g-4">
                    {famousCameos.map((item) => (
                        <div className="col-12 col-md-6" key={item.actor}>
                            <div className="p-4 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-25 h-100">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className={`bi ${item.icon} text-success fs-5`}></i>
                                    <h3 className="h5 text-white fw-bold mb-0">{item.actor}</h3>
                                </div>
                                <p className="text-warning small fw-semibold mb-2">{item.movie}</p>
                                <span className="badge bg-dark text-white-50 border border-secondary border-opacity-50 mb-3 small">
                                    {item.type}
                                </span>
                                <p className="text-white-50 small mb-0">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SEZIONE 4: RECENSIONI DELLA COMMUNITY */}
            <section className="mb-5">
                <div className="d-flex justify-content-between align-items-end mb-4">
                    <div>
                        <p className="text-success text-uppercase small fw-bold mb-1">Community</p>
                        <h2 className="h3 text-white fw-bold mb-0">Ultime Recensioni</h2>
                    </div>
                </div>

                <div className="row g-3 g-md-4">
                    {communityReviews.map((rev) => (
                        <div className="col-12 col-md-4" key={rev.author}>
                            <div className="card-2pxb-dark-background rounded-4 p-4 h-100 text-white d-flex flex-column justify-content-between shadow-sm">
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center" style={{ width: "36px", height: "36px" }}>
                                                {rev.author.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="fw-semibold small">{rev.author}</div>
                                                <div className="text-white-50 small">{rev.handle}</div>
                                            </div>
                                        </div>
                                        <div className="text-warning small">
                                            {[...Array(rev.rating)].map((_, i) => (
                                                <i key={i} className="bi bi-star-fill me-1"></i>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="badge bg-dark text-success mb-2 small">{rev.film}</span>
                                    <p className="text-white-50 small mb-3">"{rev.comment}"</p>
                                </div>
                                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 text-white-50 small">
                                    <span>
                                        <i className="bi bi-heart-fill text-danger me-1"></i> {rev.likes} Mi piace
                                    </span>
                                    <button type="button" className="btn btn-sm btn-link text-white-50 p-0 text-decoration-none">
                                        Rispondi
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SEZIONE 5: NEWSLETTER & FOOTER CALLOUT */}
            <section
                className="rounded-4 p-4 p-md-5 mb-5 text-center shadow-lg"
                style={{
                    background: "linear-gradient(180deg, #262732 0%, #173b25 100%)",
                    border: "1px solid rgba(20, 189, 20, 0.25)",
                }}
            >
                <i className="bi bi-envelope-paper-heart text-success fs-1 mb-3 d-inline-block"></i>
                <h2 className="h3 text-white fw-bold mb-2">Non perderti nessun cameo segreto</h2>
                <p className="text-white-50 mx-auto mb-4" style={{ maxWidth: "600px" }}>
                    Iscriviti alla newsletter settimanale di Cameos per ricevere notifiche su easter egg, apparizioni speciali e approfondimenti di regia.
                </p>
                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mx-auto" style={{ maxWidth: "480px" }}>
                    <input
                        type="email"
                        placeholder="Inserisci la tua email..."
                        className="form-control input-navbar text-white rounded-pill px-4 py-2"
                    />
                    <button type="button" className="btn btn-success rounded-pill px-4 py-2 fw-bold text-nowrap">
                        Iscriviti Ora
                    </button>
                </div>
            </section>
        </div>
        </>
    );
}
