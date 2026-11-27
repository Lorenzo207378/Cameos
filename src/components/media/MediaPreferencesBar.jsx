import PropTypes from 'prop-types';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useUserViewModel } from '../../viewmodel/index.js';
import { normalizeMediaReference, isSameMediaTarget } from '../../models/utils/index.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';
import ClickSpark from '../reactbits/ClickSpark/ClickSpark.jsx';
import '../../css/common/text.css';
import '../../css/media/mediaPreferencesBar.css';

const EMPTY_OVERRIDES = { watchlist: null, favorites: null, watched: null };

/**
 * MediaPreferencesBar
 * Barra pulsanti interattivi per le preferenze utente (watchlist, preferiti, visto).
 *
 * @param {Object} props
 * @param {Object|string|number} props.target - Media target (Movie, Series, Season, Episode o targetKey)
 * @param {Object|string|number|null} [props.watchlistTarget=null] - Optional override target for watchlist (e.g. selected TV Season)
 * @param {'default'|'icons'|'icons-plain'|'stacked'|'triangle'} [props.variant='default'] - Layout mode ('icons' forces glass icon-only buttons, 'icons-plain' keeps invisible hit-area boxes, 'stacked' stacks full-width pills vertically, 'triangle' renders 3 square tiles in a triangle)
 * @param {import('react').ReactNode} [props.actionRight] - Optional action rendered aligned to the right
 * @param {import('react').ReactNode} [props.children] - Optional slot alternative for actionRight
 */
export default function MediaPreferencesBar({
  target,
  watchlistTarget = null,
  variant = 'default',
  actionRight = null,
  children = undefined
}) {
  const { user, userProfile } = useAuth();
  const { t } = useTranslation();
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const userVm = useUserViewModel({ initialUser: userProfile || user });

  const { loadUser, toggleWatchlist, toggleFavorite, toggleWatched } = userVm;

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

  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setPrevWatchlistTargetKey(watchlistTargetKey);
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
  };

  const isPlainIcons = variant === 'icons-plain';
  const useIcons = isMobile || variant === 'icons' || isPlainIcons;
  const isStacked = variant === 'stacked' && !useIcons;
  const isTriangle = variant === 'triangle' && !useIcons;
  const isGlassSurface = isTriangle || isStacked;
  const preferenceButtons = [
    {
      field: 'watchlist',
      tone: 'emerald',
      active: Boolean(inWatchlist),
      label: inWatchlist ? t('preferences.inWatchlist') : t('preferences.addWatchlist'),
      icon: inWatchlist ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus',
      activeBtnClass: 'btn-success text-white',
      iconClass: inWatchlist ? (useIcons ? 'text-success' : 'text-white') : (useIcons ? 'text-white' : ''),
      toggleFn: toggleWatchlist,
      targetRef: watchlistTargetInfo
    },
    {
      field: 'favorites',
      tone: 'amber',
      active: Boolean(inFavorites),
      label: inFavorites ? t('preferences.inFavorites') : t('preferences.addFavorites'),
      icon: inFavorites ? 'bi-star-fill' : 'bi-star',
      activeBtnClass: 'btn-warning text-dark',
      iconClass: inFavorites ? (useIcons ? 'text-warning' : 'text-dark') : (useIcons ? 'text-white' : 'text-warning'),
      toggleFn: toggleFavorite,
      targetRef: targetInfo
    },
    {
      field: 'watched',
      tone: 'emerald',
      active: Boolean(isWatched),
      label: isWatched ? t('preferences.watched') : t('preferences.markWatched'),
      icon: isWatched ? 'bi-check-circle-fill' : 'bi-check-circle',
      activeBtnClass: 'btn-success text-white',
      iconClass: isWatched ? (useIcons ? 'text-success' : 'text-white') : (useIcons ? 'text-white' : ''),
      toggleFn: toggleWatched,
      targetRef: targetInfo
    }
  ];
  const renderedButtons = isTriangle
    ? [preferenceButtons[1], preferenceButtons[0], preferenceButtons[2]]
    : preferenceButtons;
  const iconButtonClass = isPlainIcons ? 'media-pref-icon-btn media-pref-icon-btn--plain' : 'media-pref-icon-btn';
  const barLayoutClass = isStacked
    ? 'd-flex media-preferences-bar--stacked flex-column align-items-stretch w-100'
    : isTriangle
      ? 'media-preferences-bar--triangle'
      : `d-flex flex-nowrap flex-md-wrap align-items-center${isPlainIcons ? ' media-preferences-bar--plain-icons' : ''}`;

  return (
    <div className={`media-preferences-wrapper${isStacked ? ' w-100' : ''}`}>
      <ClickSpark
        sparkColor="#10b981"
        sparkSize={10}
        sparkRadius={22}
        sparkCount={8}
        duration={420}
        className="media-preferences-spark"
      >
        <div className={`media-preferences-bar ${barLayoutClass}`}>
          {renderedButtons.map(
            /** @returns {import('react').JSX.Element} */
            ({ field, tone, active, label, icon, activeBtnClass, iconClass, toggleFn, targetRef }) => {
              const buttonClassName = useIcons
                ? iconButtonClass
                : isGlassSurface
                  ? `btn fw-semibold media-pref-glass-btn media-pref-glass-btn--${tone}${active ? ' is-active' : ''}${
                      isTriangle
                        ? ` media-pref-square-btn${field === 'favorites' ? ' media-pref-square-btn--top' : ''}`
                        : ' media-pref-stacked-btn rounded-pill w-100 text-nowrap'
                    }`
                  : `btn rounded-pill fw-semibold shadow-sm ${
                      active ? activeBtnClass : 'btn-dark border-secondary border-opacity-50 text-white'
                    }`;
              const iconClasses = isGlassSurface ? `bi ${icon} media-pref-icon-badge` : `bi ${icon} ${iconClass}`.trim();

              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => { void handleTogglePreference(field, active, toggleFn, targetRef); }}
                  className={buttonClassName}
                  aria-label={label}
                  aria-pressed={active}
                  title={label}
                >
                  <i className={iconClasses} aria-hidden="true" />
                  {!useIcons && <span>{label}</span>}
                </button>
              );
            }
          )}

          {(actionRight || children) && (
            <div className="d-inline-flex align-items-center ms-auto flex-shrink-0 media-pref-action-right">
              {actionRight || children}
            </div>
          )}
        </div>
      </ClickSpark>

      {guestPromptVisible && !user && (
        <div className="media-pref-feedback glass-card rounded-3 px-3 py-2 mt-2 d-flex flex-wrap align-items-center justify-content-between gap-2 small" role="status">
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
  variant: PropTypes.oneOf(['default', 'icons', 'icons-plain', 'stacked', 'triangle']),
  actionRight: PropTypes.node,
  children: PropTypes.node
};
