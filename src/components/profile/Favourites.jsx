import { useEffect, useState } from "react";
import SeriesCard from "../tv/SeriesCard.jsx";
import { tvDetails } from "../../api/tmdb";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { getUserDoc } from "../../backend/user/user.js";

export default function Favourites() {
    const { user } = useAuth();
    const [seriesList, setSeriesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!user) {
            setSeriesList([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        async function load() {
            setLoading(true);
            setError("");
            try {
                const data = await getUserDoc(user.uid);
                const ids = data?.favorites || [];
                const details = await Promise.all(
                    ids.map((id) => tvDetails(id).catch(() => null))
                );
                if (cancelled) return;
                setSeriesList(details.filter(Boolean));
            } catch (e) {
                if (!cancelled) setError(e.message || "Errore nel caricamento dei preferiti.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [user]);

    if (loading) return <p className="lm-state">Caricamento preferiti…</p>;
    if (error) return <p className="lm-state is-error">{error}</p>;
    if (seriesList.length === 0) {
        return <p className="lm-state">Nessuna serie nei preferiti.</p>;
    }

    return (
        <div className="lm-grid">
            {seriesList.map((series) => (
                <SeriesCard key={series.id} series={series} onSelect={() => {}} />
            ))}
        </div>
    );
}