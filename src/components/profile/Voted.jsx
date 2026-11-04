import { useEffect, useState } from "react";
import SeriesCard from "../tv/SeriesCard.jsx";
import { tvDetails, tvEpisodeDetails } from "../../api/tmdb";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useTranslation } from "../../contexts/LanguageContext.jsx";
import { getUserDoc } from "../../backend/user/user.js";
import { Series, Episode } from "../../models/utils/index.js";

export default function Voted() {
    const { t, langKey, formatTranslation } = useTranslation();
    const { user } = useAuth();
    const [seriesList, setSeriesList] = useState([]);
    const [episodesList, setEpisodesList] = useState([]);
    const [loading, setLoading] = useState(Boolean(user));
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("series");

    useEffect(() => {
        if (!user) {
            return;
        }

        let cancelled = false;
        async function load() {
            setLoading(true);
            setError("");
            try {
                const data = await getUserDoc(user.uid);
                const votedSeriesIds = data?.votedSeries || [];
                const votedEpisodes = data?.votedEpisodes || [];

                const seriesDetails = await Promise.all(
                    votedSeriesIds.map((id) =>
                        tvDetails(id)
                            .then((detail) => (detail ? new Series(detail) : null))
                            .catch(() => null)
                    )
                );

                const episodeDetails = await Promise.all(
                    votedEpisodes.map((ep) =>
                        tvEpisodeDetails(ep.seriesId, ep.seasonNumber, ep.episodeNumber)
                            .then((detail) =>
                                detail
                                    ? new Episode({ ...detail, seriesId: ep.seriesId, seasonNumber: ep.seasonNumber, episodeNumber: ep.episodeNumber })
                                    : null
                            )
                            .catch(() => null)
                    )
                );

                if (cancelled) return;
                setSeriesList(seriesDetails.filter(Boolean));
                setEpisodesList(episodeDetails.filter(Boolean));
            } catch (e) {
                if (!cancelled) setError(e.message || t('profile.votedError'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [user, t]);

    const activeSeries = user ? seriesList : [];
    const activeEpisodes = user ? episodesList : [];
    const isLoading = user ? loading : false;

    if (isLoading) return <p className="lm-state">{t('profile.loadingVoted')}</p>;
    if (error) return <p className="lm-state is-error">{error}</p>;

    if (activeSeries.length === 0 && activeEpisodes.length === 0) {
        return <p className="lm-state">{t('profile.noVoted')}</p>;
    }

    return (
        <div>
            <div className="lm-tabs mb-3">
                <button
                    type="button"
                    className={`lm-tab ${activeTab === "series" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("series")}
                >
                    {t('profile.votedSeries')} ({activeSeries.length})
                </button>
                <button
                    type="button"
                    className={`lm-tab ${activeTab === "episodes" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("episodes")}
                >
                    {t('profile.votedEpisodes')} ({activeEpisodes.length})
                </button>
            </div>

            {activeTab === "series" && (
                activeSeries.length === 0 ? (
                    <p className="lm-state">{t('profile.noVotedSeries')}</p>
                ) : (
                    <div className="lm-grid">
                        {activeSeries.map((series) => (
                            <SeriesCard key={series.id} series={series} onSelect={() => {}} />
                        ))}
                    </div>
                )
            )}

            {activeTab === "episodes" && (
                activeEpisodes.length === 0 ? (
                    <p className="lm-state">{t('profile.noVotedEpisodes')}</p>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {activeEpisodes.map((ep) => {
                            const still = ep.getStillUrl?.(langKey);
                            return (
                                <div key={`${ep.seriesId}-${ep.seasonNumber}-${ep.episodeNumber}`} className="lm-episode-card border rounded p-3 bg-dark text-white">
                                    <div className="d-flex gap-3 align-items-start">
                                        {still ? (
                                            <img
                                                src={still}
                                                alt={ep.name}
                                                className="rounded"
                                                style={{ width: "7.5rem", objectFit: "cover" }}
                                            />
                                        ) : (
                                            <span className="lm-card__placeholder" style={{ aspectRatio: "2 / 3", width: "7.5rem" }}>
                                                <i className="bi bi-film"></i>
                                            </span>
                                        )}
                                        <div className="flex-grow-1">
                                            <h5 className="mb-1">
                                                Ep. {ep.episodeNumber}: {ep.name}
                                            </h5>
                                            <p className="text-muted mb-1 small">
                                                {formatTranslation(t('detail.seriesIdLabel'), { id: ep.seriesId })} · {formatTranslation(t('detail.seasonLabel'), { number: ep.seasonNumber })}
                                            </p>
                                            <p className="mb-0 small">
                                                {ep.getOverview?.(langKey) || t('common.noOverview')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}
