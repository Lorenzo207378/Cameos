import { useEffect, useState } from "react";
import { tvDetails } from "../../api/tmdb";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useTranslation } from "../../contexts/LanguageContext.jsx";
import { getUserDoc } from "../../backend/user/user.js";
import { Series } from "../../models/Series.js";

export default function Favourites() {
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
                const ids = data?.favorites || [];
                const details = await Promise.all(
                    ids.map((id) =>
                        tvDetails(id)
                            .then((detail) => (detail ? new Series(detail) : null))
                            .catch(() => null)
                    )
                );
                if (cancelled) return;
                setSeriesList(details.filter(Boolean));
            } catch (e) {
                if (!cancelled) setError(e.message || t('profile.favoritesError'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => { cancelled = true; };
    }, [user, t]);

    const activeList = user ? seriesList : [];
    const isLoading = user ? loading : false;

    if (isLoading) return <p className="lm-state">{t('profile.loadingFavorites')}</p>;
    if (error) return <p className="lm-state is-error">{error}</p>;
    if (activeList.length === 0) {
        return <p className="lm-state">{t('profile.noFavorites')}</p>;
    }

    return (
        <></>
    );
}
