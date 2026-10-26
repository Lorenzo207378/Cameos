import { useEffect, useState } from "react";
import { posterUrl, tvDetails } from "../../api/tmdb";
import { formatYear } from "../utils/formatters";
import SeasonItem from "./SeasonItem";

export default function SeriesDetail({ seriesId, onBack }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        setLoading(true);
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

            {/* Dettagli della serie */}
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
                        {detail.overview || "Nessuna descrizione disponibile."}
                    </p>
                </div>
            </div>

            {/* Sezione Stagioni ed Episodi */}
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
}