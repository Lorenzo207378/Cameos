import { posterUrl } from "../../api/tmdb";
import { formatYear } from "../../utils/formatters.js";

export default function SeriesCard({ series, onSelect }) {
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
                <span className="lm-rating">
                    ★ {series.vote_average ? series.vote_average.toFixed(1) : "—"}
                </span>
            </span>
        </button>
    );
}
