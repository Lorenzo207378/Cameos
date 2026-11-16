import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useReviewViewModel, useUserViewModel } from '../../viewmodel/index.js';
import { normalizeMediaReference, isSameMediaTarget } from '../../models/utils/index.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ClickSpark from '../reactbits/ClickSpark/ClickSpark.jsx';
import '../../css/common/text.css';

import '../../css/media/mediaPreferencesBar.css';

/**
 * MediaPreferencesBar
 * Barra pulsanti interattivi per le preferenze utente (watchlist, preferiti, visto)
 * e il like della community sincronizzato su `MediaStats` (`likedBy`).
 *
 * @param {Object} props
 * @param {Object|string|number} props.target - Media target (Movie, Series, Season, Episode o targetKey)
 * @param {import('react').ReactNode} [props.actionRight] - Optional action rendered aligned to the right
 * @param {import('react').ReactNode} [props.children] - Optional slot alternative for actionRight
 */
export default function MediaPreferencesBar({ target, actionRight = null, children = undefined }) {
  const { user, userProfile } = useAuth();
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const userVm = useUserViewModel({ initialUser: userProfile || user });
  const reviewVm = useReviewViewModel();

  const { loadUser, toggleWatchlist, toggleFavorite, toggleWatched } = userVm;
  const { loadMediaStats, toggleMediaLike, currentMediaStats } = reviewVm;

  const targetInfo = useMemo(() => {
    try {
      return normalizeMediaReference(target);
    } catch {
      return null;
    }
  }, [target]);

  const targetKey = targetInfo?.targetKey || '';

  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  const [localLike, setLocalLike] = useState(null);
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

  useEffect(() => {
    if (!user?.uid) return undefined;
    void loadUser(user.uid);
    return undefined;
  }, [user?.uid, loadUser]);

  useEffect(() => {
    if (!targetInfo) return undefined;
    void loadMediaStats(targetInfo);
    return undefined;
  }, [targetInfo, loadMediaStats]);

  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setLocalLike(null);
    setLocalWatchlist(null);
    setLocalFavorites(null);
    setLocalWatched(null);
    setGuestPromptVisible(false);
    setSyncError('');
  }

  const activeUser = user?.uid
    ? (userVm.currentUser?.uid === user.uid ? userVm.currentUser : userProfile)
    : null;
  const watchlist = activeUser?.watchlist || [];
  const favorites = activeUser?.favorites || [];
  const watched = activeUser?.watched || [];

  const remoteInWatchlist = Boolean(
    activeUser && targetInfo && watchlist.some((w) => isSameMediaTarget(w, targetInfo) || w.targetKey === targetKey)
  );
  const remoteInFavorites = Boolean(
    activeUser && targetInfo && favorites.some((f) => isSameMediaTarget(f, targetInfo) || f.targetKey === targetKey)
  );
  const remoteIsWatched = Boolean(
    activeUser && targetInfo && watched.some((w) => isSameMediaTarget(w, targetInfo) || w.targetKey === targetKey)
  );

  const mediaStats = targetInfo && currentMediaStats?.targetKey === targetKey
    ? currentMediaStats
    : null;
  const remoteLiked = Boolean(user?.uid && mediaStats?.likedBy?.includes(user.uid));
  const remoteLikesCount = mediaStats?.likesCount ?? 0;

  const localLiked = localLike !== null ? localLike.liked : remoteLiked;
  const likeCount = localLike !== null ? localLike.count : remoteLikesCount;
  const inWatchlist = localWatchlist !== null ? localWatchlist : remoteInWatchlist;
  const inFavorites = localFavorites !== null ? localFavorites : remoteInFavorites;
  const isWatched = localWatched !== null ? localWatched : remoteIsWatched;

  const runPreferenceToggle = async ({ currentValue, previousOverride, setLocal, toggleFn }) => {
    setSyncError('');
    if (!user?.uid) {
      setGuestPromptVisible(true);
      return;
    }
    if (!targetInfo) return;

    setLocal(!currentValue);
    const updated = await toggleFn(targetInfo);
    if (!mountedRef.current) return;

    if (!updated) {
      setLocal(previousOverride);
      setSyncError(userVm.error || t('preferences.syncError'));
      return;
    }

    setLocal(null);
    void loadMediaStats(targetInfo);
  };

  const handleToggleLike = async () => {
    setSyncError('');
    if (!user?.uid) {
      setGuestPromptVisible(true);
      return;
    }
    if (!targetInfo) return;

    const previousOverride = localLike;
    const nextLiked = !localLiked;
    const nextCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLocalLike({ liked: nextLiked, count: nextCount });

    const updatedStats = await toggleMediaLike(user.uid, targetInfo);
    if (!mountedRef.current) return;

    if (!updatedStats) {
      setLocalLike(previousOverride);
      setSyncError(reviewVm.error || t('preferences.syncError'));
      return;
    }

    setLocalLike(null);
  };

  const handleToggleWatchlist = () => {
    void runPreferenceToggle({
      currentValue: inWatchlist,
      previousOverride: localWatchlist,
      setLocal: setLocalWatchlist,
      toggleFn: toggleWatchlist
    });
  };

  const handleToggleFavorite = () => {
    void runPreferenceToggle({
      currentValue: inFavorites,
      previousOverride: localFavorites,
      setLocal: setLocalFavorites,
      toggleFn: toggleFavorite
    });
  };

  const handleToggleWatched = () => {
    void runPreferenceToggle({
      currentValue: isWatched,
      previousOverride: localWatched,
      setLocal: setLocalWatched,
      toggleFn: toggleWatched
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
            onClick={() => {
              void handleToggleLike();
            }}
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
