import { formatYear } from "../../utils/formatters.js";

export default function SeriesCard({ series, onSelect }) {
    const poster = typeof series.getPosterUrl === 'function' ? series.getPosterUrl() : series.posterUrl;

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
                <span>{formatYear(series.firstAirDate)}</span>
                <span>·</span>
                <span className="lm-rating">
                    ★ {series.voteAverage ? series.voteAverage.toFixed(1) : "—"}
                </span>
            </span>
        </button>
    );
}
