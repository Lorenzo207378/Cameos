/*
import { formatTranslation } from '../../utils/translationUtils.js';
import { useState } from "react";
import { tvSeasonDetails } from "../../api/tmdb";
import EpisodeDetail from "./EpisodeDetail";
import { useTranslation } from "../../utils/translations.js";

export default function SeasonItem({ seriesId, season }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Stato per l'episodio selezionato
    const [selectedEpNumber, setSelectedEpNumber] = useState(null);

    const handleToggle = () => {
        if (!isOpen && episodes.length === 0) {
            setLoading(true);
            tvSeasonDetails(seriesId, season.season_number)
                .then((data) => {
                    setEpisodes(data.episodes || []);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="lm-season mb-3">
            <button type="button" className="lm-season__toggle" onClick={handleToggle}>
                <span className="lm-season__name">
                    {season.name || formatTranslation(t('detail.seasonLabel'), { number: season.season_number })}
                </span>
            </button>

            {isOpen && (
                <div className="mt-2">
                    <ul className="lm-episodes list-group">
                        {loading ? (
                            <li className="list-group-item">{t('common.loadingMore')}</li>
                        ) : (
                            episodes.map((ep) => (
                                <li key={ep.id} className="list-group-item bg-secondary text-white">
                                    <button
                                        type="button"
                                        className="btn btn-link text-white text-decoration-none p-0 w-100 text-start"
                                        onClick={() => setSelectedEpNumber(ep.episode_number)}
                                    >
                                        <strong>Ep. {ep.episode_number}</strong>: {ep.name}
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>

                    {/!* Mostra i dettagli dell'episodio selezionato *!/}
                    {selectedEpNumber && (
                        <EpisodeDetail
                            seriesId={seriesId}
                            seasonNumber={season.season_number}
                            episodeNumber={selectedEpNumber}
                            onClose={() => setSelectedEpNumber(null)}
                        />
                    )}
                </div>
            )}
        </div>
    );
}*/
