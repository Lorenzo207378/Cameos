import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useUserViewModel } from '../../viewmodel/index.js';
import { normalizeMediaReference, isSameMediaTarget } from '../../models/index.js';
import { useTranslation } from '../../utils/translations.js';
import '../../css/common/text.css';

import '../../css/media/mediaPreferencesBar.css';

/**
 * MediaPreferencesBar
 * Barra pulsanti interattivi per le preferenze utente:
 * - Like con conteggio
 * - Watchlist (Aggiungi/Rimuovi)
 * - Preferiti (Aggiungi/Rimuovi)
 * - Visto (Aggiungi/Rimuovi)
 *
 * @param {Object} props
 * @param {Object|string|number} props.target - Media target (Movie, Series, Season, Episode o targetKey)
 */
export default function MediaPreferencesBar({ target }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const userVm = useUserViewModel({ initialUser: user });

  const targetInfo = useMemo(() => {
    try {
      return normalizeMediaReference(target);
    } catch {
      return null;
    }
  }, [target]);

// Local optimistic preference states
  const [localLiked, setLocalLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(42);
  const [localWatchlist, setLocalWatchlist] = useState(null);
  const [localFavorites, setLocalFavorites] = useState(null);
  const [localWatched, setLocalWatched] = useState(null);

  // Derived preference states
  const activeUser = userVm?.currentUser || userVm?.state?.currentUser || null;
  const watchlist = userVm?.watchlist || userVm?.state?.watchlist || [];
  const favorites = userVm?.favorites || userVm?.state?.favorites || [];
  const watched = userVm?.watched || userVm?.state?.watched || [];

  const remoteInWatchlist = Boolean(
    activeUser && targetInfo && watchlist.some((w) => isSameMediaTarget(w, targetInfo) || w.targetKey === targetInfo.targetKey)
  );
  const remoteInFavorites = Boolean(
    activeUser && targetInfo && favorites.some((f) => isSameMediaTarget(f, targetInfo) || f.targetKey === targetInfo.targetKey)
  );
  const remoteIsWatched = Boolean(
    activeUser && targetInfo && watched.some((w) => isSameMediaTarget(w, targetInfo) || w.targetKey === targetInfo.targetKey)
  );

  const inWatchlist = localWatchlist !== null ? localWatchlist : remoteInWatchlist;
  const inFavorites = localFavorites !== null ? localFavorites : remoteInFavorites;
  const isWatched = localWatched !== null ? localWatched : remoteIsWatched;

  const requireAuthOrGuest = (action) => {
    if (!user) {
      const proceed = window.confirm(t('preferences.loginPrompt'));
      if (proceed) {
        navigate('/Cameos/login');
        return false;
      }
    }
    action();
    return true;
  };

  const handleToggleLike = () => {
    requireAuthOrGuest(() => {
      setLocalLiked((prev) => !prev);
      setLikeCount((prev) => (localLiked ? prev - 1 : prev + 1));
    });
  };

  const handleToggleWatchlist = () => {
    requireAuthOrGuest(async () => {
      setLocalWatchlist((prev) => !(prev !== null ? prev : remoteInWatchlist));
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleWatchlist(targetInfo);
        } catch {
          // Handled in local state
        }
      }
    });
  };

  const handleToggleFavorite = () => {
    requireAuthOrGuest(async () => {
      setLocalFavorites((prev) => !(prev !== null ? prev : remoteInFavorites));
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleFavorite(targetInfo);
        } catch {
          // Handled in local state
        }
      }
    });
  };

  const handleToggleWatched = () => {
    requireAuthOrGuest(async () => {
      setLocalWatched((prev) => !(prev !== null ? prev : remoteIsWatched));
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleWatched(targetInfo);
        } catch {
          // Handled in local state
        }
      }
    });
  };

    const watchlistLabel = inWatchlist
    ? t('preferences.inWatchlist')
    : t('preferences.addWatchlist');

  const favoritesLabel = inFavorites
    ? t('preferences.inFavorites')
    : t('preferences.addFavorites');

  const watchedLabel = isWatched
    ? t('preferences.watched')
    : t('preferences.markWatched');

  const likeLabel = localLiked
    ? t('preferences.liked')
    : t('preferences.like');

  return (
    <div className="media-preferences-bar">
      {/* MI PIACE */}
      <button
        type="button"
        onClick={handleToggleLike}
        className={isMobile ? 'media-pref-icon-btn' : `btn rounded-pill fw-semibold shadow-sm media-pref-like-btn ${
          localLiked ? 'btn-danger' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
        aria-label={`${likeLabel} (${likeCount})`}
        aria-pressed={localLiked}
        title={`${likeLabel} (${likeCount})`}
      >
        <i className={`bi ${localLiked ? 'bi-heart-fill' : 'bi-heart'} ${!isMobile && localLiked ? 'text-white' : 'text-danger'}`} />
        <span>{likeCount}</span>
      </button>

      {/* WATCHLIST */}
      <button
        type="button"
        onClick={handleToggleWatchlist}
        className={isMobile ? 'media-pref-icon-btn' : `btn rounded-pill fw-semibold shadow-sm ${
          inWatchlist ? 'btn-success text-white' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
        aria-label={watchlistLabel}
        aria-pressed={inWatchlist}
        title={watchlistLabel}
      >
        <i className={`bi ${inWatchlist ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'} ${inWatchlist ? (isMobile ? 'text-success' : 'text-white') : (isMobile ? 'text-white' : '')}`} />
        {!isMobile && <span>{watchlistLabel}</span>}
      </button>

      {/* PREFERITI */}
      <button
        type="button"
        onClick={handleToggleFavorite}
        className={isMobile ? 'media-pref-icon-btn' : `btn rounded-pill fw-semibold shadow-sm ${
          inFavorites ? 'btn-warning text-dark' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
        aria-label={favoritesLabel}
        aria-pressed={inFavorites}
        title={favoritesLabel}
      >
        <i className={`bi ${inFavorites ? 'bi-star-fill' : 'bi-star'} ${inFavorites ? (isMobile ? 'text-warning' : 'text-dark') : (isMobile ? 'text-white' : 'text-warning')}`} />
        {!isMobile && <span>{favoritesLabel}</span>}
      </button>

      {/* VISTO */}
      <button
        type="button"
        onClick={handleToggleWatched}
        className={isMobile ? 'media-pref-icon-btn' : `btn rounded-pill fw-semibold shadow-sm ${
          isWatched ? 'btn-success text-white' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
        aria-label={watchedLabel}
        aria-pressed={isWatched}
        title={watchedLabel}
      >
        <i className={`bi ${isWatched ? 'bi-check-circle-fill' : 'bi-check-circle'} ${isWatched ? (isMobile ? 'text-success' : 'text-white') : (isMobile ? 'text-white' : '')}`} />
        {!isMobile && <span>{watchedLabel}</span>}
      </button>
    </div>
  );
}
