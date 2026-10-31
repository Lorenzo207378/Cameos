/*
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { posterUrl, tvDetails } from "../../api/tmdb";
import { formatYear } from "../utils/formatters";
import SeasonItem from "./SeasonItem";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useTranslation } from "../../utils/translations.js";

export default function SeriesDetail({ seriesId, onBack }) {
    const { t, langKey } = useTranslation();
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
            setActionError(t('tv.loginRequiredFavorites'));
            return;
        }
        setIsFavorite((prev) => !prev);
    };

    const handleWatchlistToggle = () => {
        setActionError("");
        if (!user) {
            setActionError(t('tv.loginRequiredWatchlist'));
            return;
        }
        setIsInWatchlist((prev) => !prev);
    };

    const handleRating = (value) => {
        setActionError("");
        if (!user) {
            setActionError(t('tv.loginRequiredVote'));
            return;
        }
        setRating(value);
    };

    if (loading) return <p className="lm-state">{t('tv.loadingDetails')}</p>;
    if (error) return <p className="lm-state is-error">{error}</p>;
    if (!detail) return null;

    const poster = posterUrl(detail.poster_path);
    const seasons = detail.seasons || [];

    return (
        <div>
            <button type="button" className="lm-back mb-4" onClick={onBack}>
                <i className="bi bi-arrow-left me-2"></i>{t('common.back')}
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
                            <span>{t('common.rating')} <strong>{detail.vote_average.toFixed(1)}</strong></span>
                        )}
                        {detail.number_of_seasons && (
                            <span><strong>{detail.number_of_seasons}</strong> {t('detail.seasons')}</span>
                        )}
                    </div>
                    <p className="lm-detail__overview">
                        {(typeof detail.getOverview === 'function' ? detail.getOverview(langKey) : (detail.overview?.[langKey] || detail.overview?.it || detail.overview?.en || (typeof detail.overview === 'string' ? detail.overview : null))) || t('common.noOverview')}
                    </p>

                    {/!* Azioni utente: Preferiti e Valutazione *!/}
                    <div className="mt-3 d-flex flex-column gap-2">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={handleFavoriteToggle}
                                className="lm-back d-flex align-items-center gap-2"
                                aria-label={isFavorite ? t('preferences.removeFavorites') : t('preferences.addFavorites')}
                                title={isFavorite ? t('preferences.removeFavorites') : t('preferences.addFavorites')}
                            >
                                <span style={{ fontSize: "1.25rem", color: isFavorite ? "var(--lm-accent)" : "#fff" }}>
                                    <i className={isFavorite ? "bi bi-heart-fill" : "bi bi-heart"}></i>
                                </span>
                                <span style={{ color: "#fff" }}>
                                    {isFavorite ? t('preferences.inFavorites') : t('preferences.addFavorites')}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={handleWatchlistToggle}
                                className="lm-back d-flex align-items-center gap-2"
                                aria-label={isInWatchlist ? t('preferences.removeWatchlist') : t('preferences.addWatchlist')}
                                title={isInWatchlist ? t('preferences.removeWatchlist') : t('preferences.addWatchlist')}
                            >
                                <span style={{ fontSize: "1.25rem", color: isInWatchlist ? "var(--lm-accent)" : "#fff" }}>
                                    <i className={isInWatchlist ? "bi bi-eye-fill" : "bi bi-eye"}></i>
                                </span>
                                <span style={{ color: "#fff" }}>
                                    {isInWatchlist ? t('preferences.inWatchlist') : t('preferences.addWatchlist')}
                                </span>
                            </button>

                            <div className="d-flex align-items-center gap-2">
                                <span style={{ color: "var(--lm-muted)", fontSize: "0.9rem" }}>{t('tv.yourVote')}</span>
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
                                        <span style={{ color: "var(--lm-muted)", fontSize: "0.85rem", marginLeft: "0.375rem" }}>
                                            {rating}/5
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {actionError && (
                            <div className="lm-state is-error" style={{ textAlign: "left", padding: "0.25rem 0" }}>
                                {actionError}{" "}
                                {!user && (
                                    <>
                                        <Link to="/Cameos/login" className="form-link-text">{t('nav.login')}</Link> o{" "}
                                        <Link to="/Cameos/signup" className="form-link-text">{t('nav.signUp')}</Link>.
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/!* Sezione Stagioni ed Episodi *!/}
            <section className="lm-section mt-5">
                <h3 className="lm-section__title">{t('detail.seasons')}</h3>
                {seasons.length === 0 ? (
                    <p className="lm-state">{t('tv.noSeasons')}</p>
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
