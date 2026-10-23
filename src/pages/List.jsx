import { useEffect, useRef, useState } from "react";
import {
    TIME_WINDOWS,
    TV_GENRES,
    TV_SORT_OPTIONS,
    discoverTv,
    personDetails,
    posterUrl,
    profileUrl,
    searchTv,
    trendingTv,
    tvDetails,
    tvEpisodeDetails,
    tvSeasonDetails,
} from "../api/tmdb";
import "../App.css";
import "../css/List.css";

const MODES = [
    { id: "catalog", label: "Catalogo" },
    { id: "trending", label: "Tendenze" },
    { id: "search", label: "Ricerca" },
];

const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function formatYear(date) {
    return date ? String(date).slice(0, 4) : "—";
}

function formatDate(date) {
    if (!date) {
        return "—";
    }
    const [year, month, day] = String(date).split("-");
    if (!year || !month || !day) {
        return "—";
    }
    return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

function formatCount(value) {
    return typeof value === "number" ? value.toLocaleString("it-IT") : "—";
}

function SeriesCard({ series, onSelect }) {
    const poster = posterUrl(series.poster_path);

    return (
        <button type="button" className="lm-card" onClick={() => onSelect(series)}>
            <span className="lm-card__poster">
                {poster ? (
                    <img src={poster} alt={series.name} loading="lazy" />
                ) : (
                    <span className="lm-card__placeholder">
                        <i className="bi bi-tv"></i>
                    </span>
                )}
            </span>
            <span className="lm-card__title">{series.name}</span>
            <span className="lm-card__meta">
                <span>{formatYear(series.first_air_date)}</span>
                <span>·</span>
                <span className="lm-rating">★ {series.vote_average ? series.vote_average.toFixed(1) : "—"}</span>
            </span>
        </button>
    );
}

export default function List() {
    const [mode, setMode] = useState("catalog");
    const [timeWindow, setTimeWindow] = useState("week");
    const [sortBy, setSortBy] = useState("popularity.desc");
    const [genreId, setGenreId] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);

    const [results, setResults] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedSeriesId, setSelectedSeriesId] = useState(null);
    const [seriesPreview, setSeriesPreview] = useState(null);
    const [seriesDetail, setSeriesDetail] = useState(null);
    const [seriesLoading, setSeriesLoading] = useState(false);
    const [seriesError, setSeriesError] = useState("");

    const [openSeason, setOpenSeason] = useState(null);
    const [seasonEpisodes, setSeasonEpisodes] = useState([]);
    const [seasonLoading, setSeasonLoading] = useState(false);
    const [seasonError, setSeasonError] = useState("");

    const [selectedEpisode, setSelectedEpisode] = useState(null);
    const [episodeDetail, setEpisodeDetail] = useState(null);
    const [episodeLoading, setEpisodeLoading] = useState(false);
    const [episodeError, setEpisodeError] = useState("");

    const [selectedPerson, setSelectedPerson] = useState(null);
    const [personDetail, setPersonDetail] = useState(null);
    const [personLoading, setPersonLoading] = useState(false);
    const [personError, setPersonError] = useState("");

    const searchRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        if (mode !== "search") {
            return undefined;
        }
        const timer = setTimeout(() => {
            const trimmed = searchInput.trim();
            setQuery(trimmed);
            setPage(1);
            if (trimmed.length < 2) {
                setResults([]);
                setTotalPages(0);
                setTotalResults(0);
                setLoading(false);
            } else {
                setLoading(true);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput, mode]);

    useEffect(() => {
        if (mode === "search" && query.length < 2) {
            return undefined;
        }

        const requestId = ++requestIdRef.current;
        let active = true;

        const load = async () => {
            try {
                let payload;
                if (mode === "trending") {
                    payload = await trendingTv({ timeWindow, page });
                } else if (mode === "search") {
                    payload = await searchTv({ query, page });
                } else {
                    payload = await discoverTv({ page, sortBy, genreId });
                }

                if (!active || requestId !== requestIdRef.current) {
                    return;
                }

                const items = (payload.results || []).filter(
                    (item) => !item.media_type || item.media_type === "tv"
                );
                setError("");
                setResults((current) => (page > 1 ? [...current, ...items] : items));
                setTotalPages(payload.total_pages || 0);
                setTotalResults(payload.total_results || 0);
            } catch (err) {
                if (!active || requestId !== requestIdRef.current) {
                    return;
                }
                setError(err.message);
            } finally {
                if (active && requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [mode, timeWindow, query, page, sortBy, genreId]);

    useEffect(() => {
        if (!selectedSeriesId) {
            return undefined;
        }

        const requestId = ++requestIdRef.current;
        let active = true;

        tvDetails(selectedSeriesId)
            .then((data) => {
                if (active && requestId === requestIdRef.current) {
                    setSeriesDetail(data);
                }
            })
            .catch((err) => {
                if (active && requestId === requestIdRef.current) {
                    setSeriesError(err.message);
                }
            })
            .finally(() => {
                if (active && requestId === requestIdRef.current) {
                    setSeriesLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [selectedSeriesId]);

    useEffect(() => {
        if (openSeason === null || !selectedSeriesId) {
            return undefined;
        }

        const requestId = ++requestIdRef.current;
        let active = true;

        tvSeasonDetails(selectedSeriesId, openSeason)
            .then((data) => {
                if (active && requestId === requestIdRef.current) {
                    setSeasonEpisodes(data.episodes || []);
                }
            })
            .catch((err) => {
                if (active && requestId === requestIdRef.current) {
                    setSeasonError(err.message);
                }
            })
            .finally(() => {
                if (active && requestId === requestIdRef.current) {
                    setSeasonLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [openSeason, selectedSeriesId]);

    const handleModeChange = (nextMode) => {
        setMode(nextMode);
        setPage(1);
        setLoading(true);
        setResults([]);
        setTotalPages(0);
        setTotalResults(0);
        if (nextMode === "search") {
            setQuery(searchInput.trim());
            searchRef.current?.focus();
        }
    };

    const handleSearchInput = (value) => {
        setSearchInput(value);
        if (value.trim() && mode !== "search") {
            setMode("search");
            setPage(1);
            setLoading(true);
            setResults([]);
            setTotalPages(0);
            setTotalResults(0);
        }
    };

    const handleSortChange = (event) => {
        setSortBy(event.target.value);
        setPage(1);
        setLoading(true);
        setResults([]);
    };

    const handleGenreChange = (event) => {
        setGenreId(event.target.value);
        setPage(1);
        setLoading(true);
        setResults([]);
    };

    const handleTimeWindowChange = (window) => {
        setTimeWindow(window);
        setPage(1);
        setLoading(true);
        setResults([]);
    };

    const handleLoadMore = () => {
        setLoading(true);
        setPage((current) => current + 1);
    };

    const handleSeriesSelect = (series) => {
        setSelectedSeriesId(series.id);
        setSeriesPreview(series);
        setSeriesDetail(null);
        setSeriesError("");
        setSeriesLoading(true);
        setOpenSeason(null);
        setSeasonEpisodes([]);
        setSeasonLoading(false);
        setSeasonError("");
        setSelectedEpisode(null);
        setEpisodeDetail(null);
        setSelectedPerson(null);
        setPersonDetail(null);
    };

    const handleBack = () => {
        setSelectedSeriesId(null);
        setSeriesPreview(null);
        setSeriesDetail(null);
        setSeriesError("");
        setSeriesLoading(false);
        setOpenSeason(null);
        setSeasonEpisodes([]);
        setSeasonLoading(false);
        setSelectedEpisode(null);
        setEpisodeDetail(null);
        setSelectedPerson(null);
        setPersonDetail(null);
    };

    const handleSeasonToggle = (seasonNumber) => {
        const isClosing = openSeason === seasonNumber;
        setOpenSeason(isClosing ? null : seasonNumber);
        setSeasonEpisodes([]);
        setSeasonError("");
        setSeasonLoading(!isClosing);
        setSelectedEpisode(null);
        setEpisodeDetail(null);
    };

    const handleEpisodeSelect = async (episode) => {
        if (!selectedSeriesId || openSeason === null) {
            return;
        }
        setSelectedEpisode(episode);
        setEpisodeDetail(null);
        setEpisodeError("");
        setEpisodeLoading(true);
        try {
            const data = await tvEpisodeDetails(selectedSeriesId, openSeason, episode.episode_number);
            setEpisodeDetail(data);
        } catch (err) {
            setEpisodeError(err.message);
        } finally {
            setEpisodeLoading(false);
        }
    };

    const handlePersonSelect = async (person) => {
        setSelectedPerson(person);
        setPersonDetail(null);
        setPersonError("");
        setPersonLoading(true);
        try {
            const data = await personDetails(person.id);
            setPersonDetail(data);
        } catch (err) {
            setPersonError(err.message);
        } finally {
            setPersonLoading(false);
        }
    };

    const series = seriesDetail || seriesPreview || {};
    const seasons = seriesDetail?.seasons || [];
    const genres = seriesDetail?.genres || [];
    const networks = seriesDetail?.networks || [];
    const cast = seriesDetail?.credits?.cast || [];
    const tvCredits = personDetail?.combined_credits?.tv || [];
    const detailPoster = posterUrl(series.poster_path);
    const personProfile = profileUrl(personDetail?.profile_path);
    const episodeStill = episodeDetail?.still_path
        ? `https://image.tmdb.org/t/p/w300${episodeDetail.still_path}`
        : "";

    return (
        <div className="list-minimal w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
            {selectedSeriesId ? (
                <>
                    <button type="button" className="lm-back mb-4" onClick={handleBack}>
                        <i className="bi bi-arrow-left me-2"></i>Torna al catalogo
                    </button>

                    {seriesError ? (
                        <p className="lm-state is-error">{seriesError}</p>
                    ) : (
                        <>
                            <div className="lm-detail__hero">
                                <div className="lm-detail__poster">
                                    {detailPoster ? (
                                        <img src={detailPoster} alt={series.name} />
                                    ) : (
                                        <span className="lm-card__placeholder" style={{ aspectRatio: "2 / 3" }}>
                                            <i className="bi bi-tv"></i>
                                        </span>
                                    )}
                                </div>
                                <div className="lm-detail__body">
                                    <h2 className="lm-detail__title">{series.name || "Scheda serie TV"}</h2>
                                    <div className="lm-detail__facts">
                                        <span>
                                            <strong>{formatYear(series.first_air_date)}</strong>
                                        </span>
                                        {series.vote_average ? (
                                            <span>
                                                Voto <strong>{series.vote_average.toFixed(1)}</strong>
                                            </span>
                                        ) : null}
                                        {series.number_of_seasons !== undefined ? (
                                            <span>
                                                <strong>{series.number_of_seasons}</strong> stagioni
                                            </span>
                                        ) : null}
                                        {series.number_of_episodes !== undefined ? (
                                            <span>
                                                <strong>{series.number_of_episodes}</strong> episodi
                                            </span>
                                        ) : null}
                                        {series.status ? (
                                            <span>
                                                Stato <strong>{series.status}</strong>
                                            </span>
                                        ) : null}
                                    </div>
                                    {genres.length > 0 ? (
                                        <div className="lm-detail__facts">
                                            {genres.map((genre) => (
                                                <span key={genre.id}>{genre.name}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                    {networks.length > 0 ? (
                                        <div className="lm-detail__facts">
                                            <span>
                                                Reti <strong>{networks.map((n) => n.name).join(", ")}</strong>
                                            </span>
                                        </div>
                                    ) : null}
                                    <p className="lm-detail__overview">
                                        {series.overview || "Nessuna descrizione disponibile."}
                                    </p>
                                    {seriesLoading ? (
                                        <p className="lm-state">Caricamento dettagli…</p>
                                    ) : null}
                                </div>
                            </div>

                            <section className="lm-section">
                                <h3 className="lm-section__title">Stagioni</h3>
                                {seasons.length === 0 ? (
                                    <p className="lm-state">Nessuna stagione disponibile.</p>
                                ) : (
                                    seasons.map((season) => (
                                        <div className="lm-season" key={season.id}>
                                            <button
                                                type="button"
                                                className="lm-season__toggle"
                                                onClick={() => handleSeasonToggle(season.season_number)}
                                                aria-expanded={openSeason === season.season_number}
                                            >
                                                <span className="lm-season__label">
                                                    <i
                                                        className={`bi ${
                                                            openSeason === season.season_number
                                                                ? "bi-chevron-down"
                                                                : "bi-chevron-right"
                                                        }`}
                                                    ></i>
                                                    <span className="lm-season__name">
                                                        {season.name || `Stagione ${season.season_number}`}
                                                    </span>
                                                </span>
                                                <span className="lm-season__count">
                                                    {season.episode_count} episodi · {formatYear(season.air_date)}
                                                </span>
                                            </button>

                                            {openSeason === season.season_number ? (
                                                <ul className="lm-episodes">
                                                    {seasonLoading ? (
                                                        <li className="lm-episode">
                                                            <span className="lm-episode__title">
                                                                Caricamento episodi…
                                                            </span>
                                                        </li>
                                                    ) : null}
                                                    {seasonError ? (
                                                        <li className="lm-episode">
                                                            <span className="lm-episode__title" style={{ color: "#ff8a8a" }}>
                                                                {seasonError}
                                                            </span>
                                                        </li>
                                                    ) : null}
                                                    {!seasonLoading &&
                                                        seasonEpisodes.map((episode) => (
                                                            <li key={episode.id}>
                                                                <button
                                                                    type="button"
                                                                    className={`lm-episode ${
                                                                        selectedEpisode?.episode_number === episode.episode_number
                                                                            ? "is-active"
                                                                            : ""
                                                                    }`}
                                                                    onClick={() => handleEpisodeSelect(episode)}
                                                                >
                                                                    <span className="lm-episode__number">
                                                                        {episode.episode_number}
                                                                    </span>
                                                                    <span className="lm-episode__title">{episode.name}</span>
                                                                    <span className="lm-episode__meta">
                                                                        {formatDate(episode.air_date)}
                                                                    </span>
                                                                    <span className="lm-episode__meta">
                                                                        {episode.vote_average
                                                                            ? `★ ${episode.vote_average.toFixed(1)}`
                                                                            : ""}
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                </ul>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </section>

                            {selectedEpisode ? (
                                <section className="lm-section">
                                    <h3 className="lm-section__title">
                                        Episodio {selectedEpisode.episode_number}
                                    </h3>
                                    <div className="lm-profile">
                                        <div className="lm-profile__avatar">
                                            {episodeStill ? (
                                                <img src={episodeStill} alt={selectedEpisode.name} />
                                            ) : (
                                                <span className="lm-card__placeholder" style={{ aspectRatio: "2 / 3" }}>
                                                    <i className="bi bi-play-btn"></i>
                                                </span>
                                            )}
                                        </div>
                                        <div className="lm-profile__body">
                                            <h4 className="lm-profile__name">
                                                {episodeDetail?.name || selectedEpisode.name}
                                            </h4>
                                            <p className="lm-profile__role">
                                                Stagione {openSeason} · Episodio {selectedEpisode.episode_number} ·{" "}
                                                {formatDate(episodeDetail?.air_date || selectedEpisode.air_date)}
                                            </p>
                                            {episodeError ? (
                                                <p className="lm-profile__bio" style={{ color: "#ff8a8a" }}>
                                                    {episodeError}
                                                </p>
                                            ) : (
                                                <p className="lm-profile__bio">
                                                    {episodeLoading
                                                        ? "Caricamento episodio…"
                                                        : episodeDetail?.overview ||
                                                          "Nessuna descrizione disponibile."}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            ) : null}

                            <section className="lm-section">
                                <h3 className="lm-section__title">Cast</h3>
                                {cast.length === 0 ? (
                                    <p className="lm-state">Nessun attore disponibile.</p>
                                ) : (
                                    <div className="lm-cast">
                                        {cast.map((person) => (
                                            <button
                                                key={person.id}
                                                type="button"
                                                className="lm-person"
                                                onClick={() => handlePersonSelect(person)}
                                            >
                                                <span className="lm-person__avatar">
                                                    {person.profile_path ? (
                                                        <img
                                                            src={profileUrl(person.profile_path)}
                                                            alt={person.name}
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <span className="lm-card__placeholder" style={{ fontSize: "1rem" }}>
                                                            <i className="bi bi-person"></i>
                                                        </span>
                                                    )}
                                                </span>
                                                <span style={{ minWidth: 0 }}>
                                                    <span className="lm-person__name d-block">{person.name}</span>
                                                    <span className="lm-person__role d-block">{person.character}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {selectedPerson ? (
                                <section className="lm-section">
                                    <h3 className="lm-section__title">Scheda attore</h3>
                                    <div className="lm-profile">
                                        <div className="lm-profile__avatar">
                                            {personProfile ? (
                                                <img src={personProfile} alt={selectedPerson.name} />
                                            ) : (
                                                <span className="lm-card__placeholder" style={{ aspectRatio: "2 / 3" }}>
                                                    <i className="bi bi-person"></i>
                                                </span>
                                            )}
                                        </div>
                                        <div className="lm-profile__body">
                                            <h4 className="lm-profile__name">
                                                {personDetail?.name || selectedPerson.name}
                                            </h4>
                                            {personDetail?.known_for_department ? (
                                                <p className="lm-profile__role">{personDetail.known_for_department}</p>
                                            ) : null}
                                            {personError ? (
                                                <p className="lm-profile__bio" style={{ color: "#ff8a8a" }}>
                                                    {personError}
                                                </p>
                                            ) : (
                                                <p className="lm-profile__bio">
                                                    {personLoading
                                                        ? "Caricamento scheda…"
                                                        : personDetail?.biography || "Nessuna biografia disponibile."}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <h4 className="lm-section__title mt-4">Crediti TV</h4>
                                    {personLoading ? (
                                        <p className="lm-state">Caricamento crediti…</p>
                                    ) : tvCredits.length === 0 ? (
                                        <p className="lm-state">Nessun credito TV disponibile.</p>
                                    ) : (
                                        <ul className="lm-credits">
                                            {tvCredits.map((credit) => (
                                                <li
                                                    className="lm-credit"
                                                    key={`${credit.id}-${credit.character || credit.job || ""}`}
                                                >
                                                    <button
                                                        type="button"
                                                        className="lm-back text-start"
                                                        onClick={() =>
                                                            handleSeriesSelect({ id: credit.id, name: credit.name })
                                                        }
                                                    >
                                                        {credit.name}
                                                        {credit.character ? (
                                                            <span className="text-white-50"> — {credit.character}</span>
                                                        ) : null}
                                                    </button>
                                                    <span className="lm-credit__year">
                                                        {formatYear(credit.first_air_date)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            ) : null}
                        </>
                    )}
                </>
            ) : (
                <>
                    <header className="mb-4">
                        <p className="lm-eyebrow">Catalogo TMDB</p>
                        <h1 className="lm-heading">Serie TV</h1>
                    </header>

                    <div className="lm-toolbar">
                        <div className="lm-tabs" role="tablist">
                            {MODES.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === item.id}
                                    className={`lm-tab ${mode === item.id ? "is-active" : ""}`}
                                    onClick={() => handleModeChange(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="lm-filters">
                            <div className="lm-search">
                                <input
                                    ref={searchRef}
                                    type="search"
                                    className="lm-input"
                                    placeholder="Cerca una serie TV…"
                                    value={searchInput}
                                    onChange={(event) => handleSearchInput(event.target.value)}
                                    aria-label="Cerca serie TV"
                                />
                            </div>

                            {mode === "catalog" ? (
                                <>
                                    <select
                                        className="lm-select"
                                        value={sortBy}
                                        onChange={handleSortChange}
                                        aria-label="Ordina per"
                                    >
                                        {TV_SORT_OPTIONS.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="lm-select"
                                        value={genreId}
                                        onChange={handleGenreChange}
                                        aria-label="Filtra per genere"
                                    >
                                        <option value="">Tutti i generi</option>
                                        {TV_GENRES.map((genre) => (
                                            <option key={genre.id} value={genre.id}>
                                                {genre.label}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            ) : null}

                            {mode === "trending" ? (
                                <div className="lm-segment">
                                    {TIME_WINDOWS.map((window) => (
                                        <button
                                            key={window.id}
                                            type="button"
                                            className={timeWindow === window.id ? "is-active" : ""}
                                            onClick={() => handleTimeWindowChange(window.id)}
                                        >
                                            {window.label}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {error ? (
                        <p className="lm-state is-error">{error}</p>
                    ) : loading && results.length === 0 ? (
                        <div className="lm-grid">
                            {Array.from({ length: 12 }).map((_, index) => (
                                <div className="lm-skeleton" key={index}></div>
                            ))}
                        </div>
                    ) : results.length === 0 ? (
                        <p className="lm-state">
                            {mode === "search"
                                ? "Nessun risultato per questa ricerca."
                                : "Nessun contenuto disponibile."}
                        </p>
                    ) : (
                        <>
                            <div className="lm-grid">
                                {results.map((item) => (
                                    <SeriesCard key={item.id} series={item} onSelect={handleSeriesSelect} />
                                ))}
                            </div>

                            {page < totalPages ? (
                                <div className="d-flex justify-content-center mt-4">
                                    <button
                                        type="button"
                                        className="btn btn-outline-light btn-sm rounded-pill px-4"
                                        onClick={handleLoadMore}
                                        disabled={loading}
                                    >
                                        {loading ? "Caricamento…" : "Carica altri"}
                                    </button>
                                </div>
                            ) : null}

                            <p className="lm-footer-note mt-4">{formatCount(totalResults)} risultati</p>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
