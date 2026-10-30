import { useEffect, useState } from "react";
import SeriesCard from "../tv/SeriesCard.jsx";
import { tvDetails } from "../../api/tmdb";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useTranslation } from "../../utils/translations.js";
import { getUserDoc } from "../../backend/user/user.js";

export default function Watchlist() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [seriesList, setSeriesList] = useState([]);
    const [loading, setLoading] = useState(Boolean(user));
    const [error, setError] = useState("");

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
                const ids = data?.watchlist || [];
                const details = await Promise.all(
                    ids.map((id) => tvDetails(id).catch(() => null))
                );
                if (cancelled) return;
                setSeriesList(details.filter(Boolean));
            } catch (e) {
                if (!cancelled) setError(e.message || t('profile.watchlistError'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [user, t]);

    const activeList = user ? seriesList : [];
    const isLoading = user ? loading : false;

    if (isLoading) return <p className="lm-state">{t('profile.loadingWatchlist')}</p>;
    if (error) return <p className="lm-state is-error">{error}</p>;
    if (activeList.length === 0) {
        return <p className="lm-state">{t('profile.noWatchlist')}</p>;
    }

    return (
        <div className="lm-grid">
            {activeList.map((series) => (
                <SeriesCard key={series.id} series={series} onSelect={() => {}} />
            ))}
        </div>
    );
}
