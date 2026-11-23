import PropTypes from 'prop-types';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useNetwork } from '../../contexts/NetworkContext.jsx';
import { useModal } from '../../utils/domUtils.js';
import '../../css/media/mediaTrailer.css';
import '../../css/common/mediaIconButton.css';

/**
 * Compact trailer preview box (or mobile pill) that opens a fullscreen video modal.
 * Supports YouTube/Vimeo selector when both exist and shows an offline notice when disconnected.
 * @param {Object} props
 * @param {Object|null} props.media - Movie, Series, Season, or Episode domain model
 * @param {'corner'|'inline'} [props.placement='corner']
 * @param {string|null} [props.fallbackImage=null]
 * @param {string} [props.ctaLabel='']
 * @returns {import('react').JSX.Element|null}
 */
export default function MediaTrailerCard({ media, placement = 'corner', fallbackImage = null, ctaLabel = '' }) {
  const { t, langKey } = useTranslation();
  const { isMobile } = useDevice();
  const { isOffline } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(/** @type {string | null} */ (null));
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);

  /** @type {Array<{ site: string, name?: string, embedUrl: string }>} */
  const platformTrailers = media?.getTrailersByPlatform?.(langKey) || [];
  const activeTrailer = platformTrailers.find((item) => item.site === selectedSite) || platformTrailers[0] || null;
  const showOfflineBox = isOffline && showOfflineNotice;

  const handleClose = () => setIsOpen(false);
  const dialogRef = useModal(Boolean(activeTrailer) && isOpen && !isOffline, handleClose);

  if (!media || !activeTrailer) return null;

  const mediaTitle = media.getTitle?.(langKey) || media.getName?.(langKey);
  const coverSrc =
    media.getBackdropUrl?.(langKey)
    || media.getStillUrl?.(langKey, 'w780')
    || fallbackImage
    || media.getPosterUrl?.(langKey);

  const ctaText = ctaLabel || t('detail.watchTrailer');
  const label = `${ctaText} - ${mediaTitle || activeTrailer.name}`;

  const handleTriggerClick = () => {
    if (isOffline) {
      setShowOfflineNotice((prev) => !prev);
      return;
    }
    setIsOpen(true);
  };

  return (
    <div className={`media-trailer-wrapper position-relative d-inline-flex flex-column align-items-end media-trailer-wrapper--${placement}`}>
      {isMobile ? (
        <button
          type="button"
          onClick={handleTriggerClick}
          className="media-trailer-pill media-trailer-mobile-pill shadow-lg"
          aria-label={label}
        >
          <i className="bi bi-play-fill media-trailer-mobile-pill-icon" aria-hidden="true" />
          <span>{ctaText}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTriggerClick}
          className="media-trailer-trigger position-relative d-block p-0 shadow-lg"
          aria-label={label}
        >
          {coverSrc && <img src={coverSrc} alt="" className="media-trailer-thumb" />}
          <span className="media-trailer-scrim d-flex flex-column align-items-center justify-content-center gap-1 p-2">
            <span className="media-trailer-play-circle" aria-hidden="true">
              <i className="bi bi-play-fill" />
            </span>
            <span className="media-trailer-cta-pill">{ctaText}</span>
          </span>
        </button>
      )}

      {showOfflineBox && (
        <div className="media-trailer-offline-box d-flex align-items-center gap-2 p-2 shadow-lg" role="alert">
          <i className="bi bi-wifi-off text-warning flex-shrink-0" aria-hidden="true" />
          <span className="media-trailer-offline-text">{t('detail.trailerOffline')}</span>
          <button
            type="button"
            onClick={() => setShowOfflineNotice(false)}
            className="btn-close btn-close-white media-trailer-offline-close"
            aria-label={t('common.close')}
          />
        </div>
      )}

      {isOpen && !isOffline && typeof document !== 'undefined' && createPortal(
        <dialog
          ref={dialogRef}
          className="media-trailer-modal-backdrop m-0 border-0 w-100 h-100"
          aria-label={t('detail.watchTrailer')}
        >
          <div className="media-trailer-modal-card d-flex flex-column gap-2">
            <div className="d-flex align-items-center justify-content-between gap-2">
              {platformTrailers.length > 1 && (
                <div className="media-trailer-platform-menu d-inline-flex align-items-center gap-2 flex-wrap">
                  {platformTrailers.map(/** @returns {import('react').JSX.Element} */ (item) => {
                    const isActive = item.site === activeTrailer.site;
                    return (
                      <button
                        key={item.site}
                        type="button"
                        onClick={() => setSelectedSite(item.site)}
                        className={`media-trailer-pill media-trailer-platform-pill ${isActive ? 'is-active' : ''}`}
                        aria-pressed={isActive}
                      >
                        <i className={`bi ${item.site === 'YouTube' ? 'bi-youtube' : 'bi-vimeo'}`} aria-hidden="true" />
                        <span>{item.site}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="media-icon-button ms-auto"
                aria-label={t('common.close')}
                title={t('common.close')}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="media-trailer-player-frame">
              <iframe
                key={activeTrailer.embedUrl}
                src={activeTrailer.embedUrl}
                title={activeTrailer.name || mediaTitle || t('detail.watchTrailer')}
                className="media-trailer-iframe"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              />
            </div>
          </div>
        </dialog>,
        document.body
      )}
    </div>
  );
}

MediaTrailerCard.propTypes = {
  media: PropTypes.object,
  placement: PropTypes.oneOf(['corner', 'inline']),
  fallbackImage: PropTypes.string,
  ctaLabel: PropTypes.string
};
