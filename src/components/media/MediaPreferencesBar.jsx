import PropTypes from 'prop-types';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useReviewViewModel, useUserViewModel } from '../../viewmodel/index.js';
import { normalizeMediaReference, isSameMediaTarget } from '../../models/utils/index.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';
import ClickSpark from '../reactbits/ClickSpark/ClickSpark.jsx';
import '../../css/common/text.css';
import '../../css/media/mediaPreferencesBar.css';

const EMPTY_OVERRIDES = { watchlist: null, favorites: null, watched: null };

/**
 * MediaPreferencesBar
 * Barra pulsanti interattivi per le preferenze utente (watchlist, preferiti, visto)
 * e il like della community sincronizzato su `MediaStats` (`likedBy`).
 *
 * @param {Object} props
 * @param {Object|string|number} props.target - Media target (Movie, Series, Season, Episode o targetKey)
 * @param {Object|string|number|null} [props.watchlistTarget=null] - Optional override target for watchlist (e.g. selected TV Season)
 * @param {import('react').ReactNode} [props.actionRight] - Optional action rendered aligned to the right
 * @param {import('react').ReactNode} [props.children] - Optional slot alternative for actionRight
 */
export default function MediaPreferencesBar({ target, watchlistTarget = null, actionRight = null, children = undefined }) {
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

  const watchlistTargetInfo = useMemo(() => {
    if (!watchlistTarget) return targetInfo;
    try {
      return normalizeMediaReference(watchlistTarget);
    } catch {
      return targetInfo;
    }
  }, [watchlistTarget, targetInfo]);

  const targetKey = targetInfo?.targetKey || '';
  const watchlistTargetKey = watchlistTargetInfo?.targetKey || targetKey;

  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  const [prevWatchlistTargetKey, setPrevWatchlistTargetKey] = useState(watchlistTargetKey);
  const [localLike, setLocalLike] = useState(null);
  const [localOverrides, setLocalOverrides] = useState(EMPTY_OVERRIDES);
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
    setPrevWatchlistTargetKey(watchlistTargetKey);
    setLocalLike(null);
    setLocalOverrides(EMPTY_OVERRIDES);
    setGuestPromptVisible(false);
    setSyncError('');
  } else if (watchlistTargetKey !== prevWatchlistTargetKey) {
    setPrevWatchlistTargetKey(watchlistTargetKey);
    setLocalOverrides((prev) => ({ ...prev, watchlist: null }));
    setSyncError('');
  }

  const activeUser = user?.uid
    ? (userVm.currentUser?.uid === user.uid ? userVm.currentUser : userProfile)
    : null;

  const hasTarget = (list, refInfo = targetInfo) => {
    const matchKey = refInfo?.targetKey;
    return Boolean(
      activeUser && refInfo && (list || []).some((entry) => isSameMediaTarget(entry, refInfo) || entry.targetKey === matchKey)
    );
  };

  const mediaStats = targetInfo && currentMediaStats?.targetKey === targetKey ? currentMediaStats : null;
  const remoteLiked = Boolean(user?.uid && mediaStats?.likedBy?.includes(user.uid));
  const localLiked = localLike !== null ? localLike.liked : remoteLiked;
  const likeCount = localLike !== null ? localLike.count : (mediaStats?.likesCount ?? 0);

  const inWatchlist = localOverrides.watchlist ?? hasTarget(activeUser?.watchlist, watchlistTargetInfo);
  const inFavorites = localOverrides.favorites ?? hasTarget(activeUser?.favorites, targetInfo);
  const isWatched = localOverrides.watched ?? hasTarget(activeUser?.watched, targetInfo);

  const handleTogglePreference = async (field, currentValue, toggleFn, targetRef = targetInfo) => {
    setSyncError('');
    if (!user?.uid) {
      setGuestPromptVisible(true);
      return;
    }
    if (!targetRef) return;

    const previousOverride = localOverrides[field];
    setLocalOverrides((prev) => ({ ...prev, [field]: !currentValue }));
    const updated = await toggleFn(targetRef);
    if (!mountedRef.current) return;

    if (!updated) {
      setLocalOverrides((prev) => ({ ...prev, [field]: previousOverride }));
      setSyncError(userVm.error || t('preferences.syncError'));
      return;
    }

    setLocalOverrides((prev) => ({ ...prev, [field]: null }));
    void loadMediaStats(targetRef);
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
    setLocalLike({ liked: nextLiked, count: Math.max(0, likeCount + (nextLiked ? 1 : -1)) });

    const updatedStats = await toggleMediaLike(user.uid, targetInfo);
    if (!mountedRef.current) return;

    if (!updatedStats) {
      setLocalLike(previousOverride);
      setSyncError(reviewVm.error || t('preferences.syncError'));
      return;
    }

    setLocalLike(null);
  };

  const likeLabel = localLiked ? t('preferences.liked') : t('preferences.like');
  const preferenceButtons = [
    {
      field: 'watchlist',
      active: Boolean(inWatchlist),
      label: inWatchlist ? t('preferences.inWatchlist') : t('preferences.addWatchlist'),
      icon: inWatchlist ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus',
      activeBtnClass: 'btn-success text-white',
      iconClass: inWatchlist ? (isMobile ? 'text-success' : 'text-white') : (isMobile ? 'text-white' : ''),
      toggleFn: toggleWatchlist,
      targetRef: watchlistTargetInfo
    },
    {
      field: 'favorites',
      active: Boolean(inFavorites),
      label: inFavorites ? t('preferences.inFavorites') : t('preferences.addFavorites'),
      icon: inFavorites ? 'bi-star-fill' : 'bi-star',
      activeBtnClass: 'btn-warning text-dark',
      iconClass: inFavorites ? (isMobile ? 'text-warning' : 'text-dark') : (isMobile ? 'text-white' : 'text-warning'),
      toggleFn: toggleFavorite,
      targetRef: targetInfo
    },
    {
      field: 'watched',
      active: Boolean(isWatched),
      label: isWatched ? t('preferences.watched') : t('preferences.markWatched'),
      icon: isWatched ? 'bi-check-circle-fill' : 'bi-check-circle',
      activeBtnClass: 'btn-success text-white',
      iconClass: isWatched ? (isMobile ? 'text-success' : 'text-white') : (isMobile ? 'text-white' : ''),
      toggleFn: toggleWatched,
      targetRef: targetInfo
    }
  ];

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
        <div className="media-preferences-bar d-flex flex-nowrap flex-md-wrap align-items-center">
          <button
            type="button"
            onClick={() => { void handleToggleLike(); }}
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

          {preferenceButtons.map(({ field, active, label, icon, activeBtnClass, iconClass, toggleFn, targetRef }) => (
            <button
              key={field}
              type="button"
              onClick={() => { void handleTogglePreference(field, active, toggleFn, targetRef); }}
              className={isMobile ? 'media-pref-icon-btn' : `btn rounded-pill fw-semibold shadow-sm ${
                active ? activeBtnClass : 'btn-dark border-secondary border-opacity-50 text-white'
              }`}
              aria-label={label}
              aria-pressed={active}
              title={label}
            >
              <i className={`bi ${icon} ${iconClass}`.trim()} />
              {!isMobile && <span>{label}</span>}
            </button>
          ))}

          {(actionRight || children) && (
            <div className="d-inline-flex align-items-center ms-auto flex-shrink-0 media-pref-action-right">
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
              onClick={() => navigate(APP_ROUTES.login)}
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

MediaPreferencesBar.propTypes = {
  target: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
  watchlistTarget: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
    PropTypes.number
  ]),
  actionRight: PropTypes.node,
  children: PropTypes.node
};
