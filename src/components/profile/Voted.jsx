import { useEffect, useState } from "react";
import SeriesCard from "../tv/SeriesCard";
import { tvDetails, tvEpisodeDetails } from "../../api/tmdb";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { getUserDoc } from "../../backend/user/user.js";

export default function Voted() {
    const { user } = useAuth();
    const [seriesList, setSeriesList] = useState([]);
    const [episodesList, setEpisodesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("series");

    useEffect(() => {
        if (!user) {
            setSeriesList([]);
            setEpisodesList([]);
            setLoading(false);
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
                    votedSeriesIds.map((id) => tvDetails(id).catch(() => null))
                );

                const episodeDetails = await Promise.all(
                    votedEpisodes.map((ep) =>
                        tvEpisodeDetails(ep.seriesId, ep.seasonNumber, ep.episodeNumber)
                            .then((detail) => ({ ...detail, seriesId: ep.seriesId, seasonNumber: ep.seasonNumber, episodeNumber: ep.episodeNumber }))
                            .catch(() => null)
                    )
                );

                if (cancelled) return;
                setSeriesList(seriesDetails.filter(Boolean));
                setEpisodesList(episodeDetails.filter(Boolean));
            } catch (e) {
                if (!cancelled) setError(e.message || "Errore nel caricamento dei voti.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [user]);

    if (loading) return <p className="lm-state">Caricamento voti…</p>;
    if (error) return <p className="lm-state is-error">{error}</p>;

    if (seriesList.length === 0 && episodesList.length === 0) {
        return <p className="lm-state">Nessun voto registrato.</p>;
    }

    return (
        <div>
            <div className="lm-tabs mb-3">
                <button
                    type="button"
                    className={`lm-tab ${activeTab === "series" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("series")}
                >
                    Serie votate ({seriesList.length})
                </button>
                <button
                    type="button"
                    className={`lm-tab ${activeTab === "episodes" ? "is-active" : ""}`}
                    onClick={() => setActiveTab("episodes")}
                >
                    Episodi votati ({episodesList.length})
                </button>
            </div>

            {activeTab === "series" && (
                seriesList.length === 0 ? (
                    <p className="lm-state">Nessuna serie votata.</p>
                ) : (
                    <div className="lm-grid">
                        {seriesList.map((series) => (
                            <SeriesCard key={series.id} series={series} onSelect={() => {}} />
                        ))}
                    </div>
                )
            )}

            {activeTab === "episodes" && (
                episodesList.length === 0 ? (
                    <p className="lm-state">Nessun episodio votato.</p>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {episodesList.map((ep) => (
                            <div key={`${ep.seriesId}-${ep.seasonNumber}-${ep.episodeNumber}`} className="lm-episode-card border rounded p-3 bg-dark text-white">
                                <div className="d-flex gap-3 align-items-start">
                                    {ep.still_path ? (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                            alt={ep.name}
                                            className="rounded"
                                            style={{ width: "120px", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <span className="lm-card__placeholder" style={{ aspectRatio: "2 / 3", width: "120px" }}>
                                            <i className="bi bi-film"></i>
                                        </span>
                                    )}
                                    <div className="flex-grow-1">
                                        <h5 className="mb-1">
                                            Ep. {ep.episode_number}: {ep.name}
                                        </h5>
                                        <p className="text-muted mb-1 small">
                                            Serie ID: {ep.seriesId} · Stagione {ep.seasonNumber}
                                        </p>
                                        <p className="mb-0 small">
                                            {ep.overview || "Nessuna descrizione disponibile."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
        </div>
    );
}