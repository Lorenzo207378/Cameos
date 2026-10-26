import { useEffect, useState } from "react";
import { tvEpisodeDetails, profileUrl } from "../../api/tmdb";

export default function EpisodeDetail({ seriesId, seasonNumber, episodeNumber, onClose }) {
    const [episode, setEpisode] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        tvEpisodeDetails(seriesId, seasonNumber, episodeNumber)
            .then((data) => {
                setEpisode(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [seriesId, seasonNumber, episodeNumber]);

    if (loading) return <p className="lm-state">Caricamento episodio…</p>;
    if (!episode) return null;

    // Costruzione dell'immagine del fotogramma dell'episodio
    const stillUrl = episode.still_path
        ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
        : null;

    return (
        <div className="lm-episode-detail p-3 border rounded mt-3 bg-dark text-white">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Episodio {episode.episode_number}: {episode.name}</h4>
                <button type="button" className="btn btn-sm btn-outline-light" onClick={onClose}>
                    Chiudi
                </button>
            </div>

            {/* Immagine (Still) e Trama */}
            <div className="d-flex gap-3 mb-3">
                {stillUrl && (
                    <img
                        src={stillUrl}
                        alt={episode.name}
                        className="rounded"
                        style={{ width: "200px", objectFit: "cover" }}
                    />
                )}
                <p>{episode.overview || "Nessuna descrizione disponibile."}</p>
            </div>

            {/* Sezione Guest Stars / Cameos */}
            {episode.guest_stars?.length > 0 && (
                <div>
                    <h5>Guest Stars & Cameos</h5>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                        {episode.guest_stars.map((actor) => (
                            <div key={actor.id} className="d-flex align-items-center gap-2 border p-1 rounded">
                                {actor.profile_path ? (
                                    <img
                                        src={profileUrl(actor.profile_path)}
                                        alt={actor.name}
                                        style={{ width: "35px", height: "35px", borderRadius: "50%", objectFit: "cover" }}
                                    />
                                ) : (
                                    <i className="bi bi-person circle"></i>
                                )}
                                <small>
                                    <strong>{actor.name}</strong> <br />
                                    <span className="text-muted">({actor.character})</span>
                                </small>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}