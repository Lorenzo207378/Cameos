import { useEffect, useState } from "react";
import {
    TV_GENRES,
    TV_SORT_OPTIONS,
    discoverTv,
    searchTv,
    trendingTv,
} from "../../api/tmdb";
import SeriesCard from "./SeriesCard";
import SeriesDetail from "./SeriesDetail";
import { formatCount } from "../../utils/formatters.js";
import { useTranslation } from "../../utils/translations.js";
import "../../css/tv/list.css";

export default function List() {
    const { t } = useTranslation();
    const MODES = [
        { id: "catalog", label: t('tv.modesCatalog') },
        { id: "trending", label: t('tv.modesTrending') },
        { id: "search", label: t('tv.modesSearch') },
    ];
    // Stati per i filtri di navigazione
    const [mode, setMode] = useState("catalog");
    const [sortBy, setSortBy] = useState("popularity.desc");
    const [genreId, setGenreId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    // Stati per i dati caricati dall'API
    const [results, setResults] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Stato per la serie selezionata
    const [selectedSeriesId, setSelectedSeriesId] = useState(null);

    // Caricamento dati principale
    useEffect(() => {
        // In modalità ricerca, non cercare se la stringa è vuota
        if (mode === "search" && !searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError("");

        let fetchPromise;
        if (mode === "trending") {
            fetchPromise = trendingTv({ timeWindow: "week", page });
        } else if (mode === "search") {
            fetchPromise = searchTv({ query: searchQuery, page });
        } else {
            fetchPromise = discoverTv({ page, sortBy, genreId });
        }

        fetchPromise
            .then((data) => {
                const items = data.results || [];
                setResults((prev) => (page > 1 ? [...prev, ...items] : items));
                setTotalPages(data.total_pages || 0);
                setTotalResults(data.total_results || 0);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [mode, sortBy, genreId, searchQuery, page]);

    // Gestori cambio filtri (resettano la pagina a 1)
    const handleModeChange = (newMode) => {
        setMode(newMode);
        setPage(1);
        setResults([]);
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        if (mode !== "search") setMode("search");
        setPage(1);
    };

    return (
        <div className="list-minimal w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
            {selectedSeriesId ? (
                /* Vista Dettaglio */
                <SeriesDetail
                    seriesId={selectedSeriesId}
                    onBack={() => setSelectedSeriesId(null)}
                />
            ) : (
                /* Vista Elenco */
                <>
                    <header className="mb-4">
                        <p className="lm-eyebrow">{t('tv.tmdbCatalog')}</p>
                        <h1 className="lm-heading">{t('tv.series')}</h1>
                    </header>

                    {/* Toolbar dei filtri */}
                    <div className="lm-toolbar">
                        <div className="lm-tabs">
                            {MODES.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`lm-tab ${mode === item.id ? "is-active" : ""}`}
                                    onClick={() => handleModeChange(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="lm-filters">
                            <input
                                type="search"
                                className="lm-input"
                                placeholder={t('tv.searchPlaceholder')}
                                value={searchQuery}
                                onChange={handleSearch}
                            />

                            {mode === "catalog" && (
                                <>
                                    <select
                                        className="lm-select"
                                        value={sortBy}
                                        onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                                    >
                                        {TV_SORT_OPTIONS.map((opt) => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="lm-select"
                                        value={genreId}
                                        onChange={(e) => { setGenreId(e.target.value); setPage(1); }}
                                    >
                                        <option value="">{t('tv.allGenres')}</option>
                                        {TV_GENRES.map((g) => (
                                            <option key={g.id} value={g.id}>{g.label}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Risultati e Griglia */}
                    {error && <p className="lm-state is-error">{error}</p>}

                    <div className="lm-grid">
                        {results.map((item) => (
                            <SeriesCard
                                key={item.id}
                                series={item}
                                onSelect={(s) => setSelectedSeriesId(s.id)}
                            />
                        ))}
                    </div>

                    {/* Pulsante Carica Altri */}
                    {page < totalPages && (
                        <div className="d-flex justify-content-center mt-4">
                            <button
                                type="button"
                                className="btn btn-outline-light btn-sm rounded-pill px-4"
                                onClick={() => setPage((prev) => prev + 1)}
                                disabled={loading}
                            >
                                {loading ? t('common.loadingMore') : t('common.loadMore')}
                            </button>
                        </div>
                    )}

                    <p className="lm-footer-note mt-4">{formatCount(totalResults)} {t('common.resultsCount')}</p>
                </>
            )}
        </div>
    );
}
