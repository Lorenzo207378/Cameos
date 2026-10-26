/*
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { posterUrl, tvDetails } from "../../api/tmdb";
import { formatYear } from "../utils/formatters";
import SeasonItem from "./SeasonItem";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function SeriesDetail({ seriesId, onBack }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [rating, setRating] = useState(null);
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        setLoading(true);
        setIsFavorite(false);
        setIsInWatchlist(false);
        setRating(null);
        setActionError("");
        tvDetails(seriesId)
            .then((data) => {
                setDetail(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [seriesId]);

    const handleFavoriteToggle = () => {
        setActionError("");
        if (!user) {
            setActionError("Devi essere registrato/loggato per aggiungere questa serie ai preferiti.");
            return;
        }
        setIsFavorite((prev) => !prev);
    };

    const handleWatchlistToggle = () => {
        setActionError("");
        if (!user) {
            setActionError("Devi essere registrato/loggato per aggiungere questa serie alla watchlist.");
            return;
        }
        setIsInWatchlist((prev) => !prev);
    };

    const handleRating = (value) => {
        setActionError("");
        if (!user) {
            setActionError("Devi essere registrato/loggato per assegnare un voto alla serie.");
            return;
        }
        setRating(value);
    };

    if (loading) return <p className="lm-state">Caricamento dettagli…</p>;
    if (error) return <p className="lm-state is-error">{error}</p>;
    if (!detail) return null;

    const poster = posterUrl(detail.poster_path);
    const seasons = detail.seasons || [];

    return (
        <div>
            <button type="button" className="lm-back mb-4" onClick={onBack}>
                <i className="bi bi-arrow-left me-2"></i>Torna al catalogo
            </button>

            {/!* Dettagli della serie *!/}
            <div className="lm-detail__hero">
                <div className="lm-detail__poster">
                    {poster ? (
                        <img src={poster} alt={detail.name} />
                    ) : (
                        <span className="lm-card__placeholder" style={{ aspectRatio: "2 / 3" }}>
                            <i className="bi bi-tv"></i>
                        </span>
                    )}
                </div>
                <div className="lm-detail__body">
                    <h2 className="lm-detail__title">{detail.name}</h2>
                    <div className="lm-detail__facts">
                        <span><strong>{formatYear(detail.first_air_date)}</strong></span>
                        {detail.vote_average && (
                            <span>Voto <strong>{detail.vote_average.toFixed(1)}</strong></span>
                        )}
                        {detail.number_of_seasons && (
                            <span><strong>{detail.number_of_seasons}</strong> stagioni</span>
                        )}
                    </div>
                    <p className="lm-detail__overview">
                        {(typeof detail.getOverview === 'function' ? detail.getOverview('it') : (detail.overview?.it || detail.overview?.en || (typeof detail.overview === 'string' ? detail.overview : null))) || "Nessuna descrizione disponibile."}
                    </p>

                    {/!* Azioni utente: Preferiti e Valutazione *!/}
                    <div className="mt-3 d-flex flex-column gap-2">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={handleFavoriteToggle}
                                className="lm-back d-flex align-items-center gap-2"
                                aria-label={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                                title={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                            >
                                <span style={{ fontSize: "1.25rem", color: isFavorite ? "var(--lm-accent)" : "#fff" }}>
                                    <i className={isFavorite ? "bi bi-heart-fill" : "bi bi-heart"}></i>
                                </span>
                                <span style={{ color: "#fff" }}>
                                    {isFavorite ? "Nei preferiti" : "Aggiungi ai preferiti"}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={handleWatchlistToggle}
                                className="lm-back d-flex align-items-center gap-2"
                                aria-label={isInWatchlist ? "Rimuovi dalla watchlist" : "Aggiungi alla watchlist"}
                                title={isInWatchlist ? "Rimuovi dalla watchlist" : "Aggiungi alla watchlist"}
                            >
                                <span style={{ fontSize: "1.25rem", color: isInWatchlist ? "var(--lm-accent)" : "#fff" }}>
                                    <i className={isInWatchlist ? "bi bi-eye-fill" : "bi bi-eye"}></i>
                                </span>
                                <span style={{ color: "#fff" }}>
                                    {isInWatchlist ? "In watchlist" : "Aggiungi alla watchlist"}
                                </span>
                            </button>

                            <div className="d-flex align-items-center gap-2">
                                <span style={{ color: "var(--lm-muted)", fontSize: "0.9rem" }}>Il tuo voto:</span>
                                <div className="d-flex align-items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => handleRating(star)}
                                            className="lm-back p-0"
                                            aria-label={`Vota ${star} stelle`}
                                            title={`Vota ${star} stelle`}
                                        >
                                            <span style={{ fontSize: "1.1rem", color: rating && star <= rating ? "var(--lm-accent)" : "#fff" }}>
                                                <i className={rating && star <= rating ? "bi bi-star-fill" : "bi bi-star"}></i>
                                            </span>
                                        </button>
                                    ))}
                                    {rating && (
                                        <span style={{ color: "var(--lm-muted)", fontSize: "0.85rem", marginLeft: "6px" }}>
                                            {rating}/5
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {actionError && (
                            <div className="lm-state is-error" style={{ textAlign: "left", padding: "4px 0" }}>
                                {actionError}{" "}
                                {!user && (
                                    <>
                                        <Link to="/Cameos/login" className="form-link-text">Accedi</Link> o{" "}
                                        <Link to="/Cameos/signup" className="form-link-text">Registrati</Link>.
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/!* Sezione Stagioni ed Episodi *!/}
            <section className="lm-section mt-5">
                <h3 className="lm-section__title">Stagioni</h3>
                {seasons.length === 0 ? (
                    <p className="lm-state">Nessuna stagione disponibile.</p>
                ) : (
                    seasons.map((season) => (
                        <SeasonItem
                            key={season.id}
                            seriesId={seriesId}
                            season={season}
                        />
                    ))
                )}
            </section>
        </div>
    );
}*/
