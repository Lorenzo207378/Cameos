import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useUserViewModel } from '../../viewmodel/index.js';
import { normalizeMediaReference, isSameMediaTarget } from '../../models/utils/index.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ClickSpark from '../reactbits/ClickSpark/ClickSpark.jsx';
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
 * @param {React.ReactNode} [props.actionRight] - Optional action rendered aligned to the right
 * @param {React.ReactNode} [props.children] - Optional slot alternative for actionRight
 */
export default function MediaPreferencesBar({ target, actionRight = null, children }) {
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

  const targetKey = targetInfo?.targetKey || '';
  const initialLikes = Number(target?.likesCount ?? userVm?.currentMediaStats?.likesCount ?? 0) || 0;

  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  const [likeState, setLikeState] = useState({ liked: false, count: initialLikes });
  const [localWatchlist, setLocalWatchlist] = useState(null);
  const [localFavorites, setLocalFavorites] = useState(null);
  const [localWatched, setLocalWatched] = useState(null);
  const [guestPromptVisible, setGuestPromptVisible] = useState(false);
  const [syncError, setSyncError] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setLikeState({ liked: false, count: initialLikes });
    setLocalWatchlist(null);
    setLocalFavorites(null);
    setLocalWatched(null);
    setGuestPromptVisible(false);
    setSyncError('');
  }

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
  const { liked: localLiked, count: likeCount } = likeState;

  const runPreferenceAction = async (action) => {
    setSyncError('');
    if (!user) {
      setGuestPromptVisible(true);
    }
    await action();
  };

  const handleToggleLike = () => {
    void runPreferenceAction(() => {
      setLikeState((prev) => {
        const nextLiked = !prev.liked;
        return {
          liked: nextLiked,
          count: Math.max(0, prev.count + (nextLiked ? 1 : -1))
        };
      });
    });
  };

  const handleToggleWatchlist = () => {
    void runPreferenceAction(async () => {
      const previousOverride = localWatchlist;
      const nextValue = !inWatchlist;
      setLocalWatchlist(nextValue);
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleWatchlist(targetInfo);
        } catch {
          if (mountedRef.current) {
            setLocalWatchlist(previousOverride);
            setSyncError(t('preferences.syncError'));
          }
        }
      }
    });
  };

  const handleToggleFavorite = () => {
    void runPreferenceAction(async () => {
      const previousOverride = localFavorites;
      const nextValue = !inFavorites;
      setLocalFavorites(nextValue);
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleFavorite(targetInfo);
        } catch {
          if (mountedRef.current) {
            setLocalFavorites(previousOverride);
            setSyncError(t('preferences.syncError'));
          }
        }
      }
    });
  };

  const handleToggleWatched = () => {
    void runPreferenceAction(async () => {
      const previousOverride = localWatched;
      const nextValue = !isWatched;
      setLocalWatched(nextValue);
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleWatched(targetInfo);
        } catch {
          if (mountedRef.current) {
            setLocalWatched(previousOverride);
            setSyncError(t('preferences.syncError'));
          }
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
    <div className="media-preferences-wrapper">
      <ClickSpark
        sparkColor="#10b981"
        sparkSize={10}
        sparkRadius={22}
        sparkCount={8}
        duration={420}
        className="media-preferences-spark"
      >
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
            aria-pressed={Boolean(inWatchlist)}
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
            aria-pressed={Boolean(inFavorites)}
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
            aria-pressed={Boolean(isWatched)}
            title={watchedLabel}
          >
            <i className={`bi ${isWatched ? 'bi-check-circle-fill' : 'bi-check-circle'} ${isWatched ? (isMobile ? 'text-success' : 'text-white') : (isMobile ? 'text-white' : '')}`} />
            {!isMobile && <span>{watchedLabel}</span>}
          </button>

          {(actionRight || children) && (
            <div className="ms-auto flex-shrink-0 media-pref-action-right">
              {actionRight || children}
            </div>
          )}
        </div>
      </ClickSpark>

      {guestPromptVisible && !user && (
        <div className="media-pref-feedback glass-card rounded-3 px-3 py-2 mt-2 d-flex align-items-center justify-content-between gap-2 small" role="status">
          <span className="text-white-50">{t('preferences.loginNotice')}</span>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate('/Cameos/login')}
              className="btn btn-sm btn-success rounded-pill px-3 py-1 fw-semibold"
            >
              {t('preferences.loginAction')}
            </button>
            <button
              type="button"
              onClick={() => setGuestPromptVisible(false)}
              className="btn btn-sm btn-link text-white-50 p-0 text-decoration-none"
              aria-label={t('common.close')}
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>
      )}

      {syncError && (
        <p className="text-danger small mt-2 mb-0" role="alert">
          {syncError}
        </p>
      )}
    </div>
  );
}
