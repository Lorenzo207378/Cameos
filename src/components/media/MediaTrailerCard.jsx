import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useModal } from '../../utils/domUtils.js';
import '../../css/media/mediaTrailer.css';
import '../../css/common/mediaIconButton.css';

/**
 * Compact trailer preview box (or mobile pill) that opens a fullscreen video modal.
 * @param {Object} props
 * @param {Object} props.media - Movie or Series domain model
 * @returns {import('react').JSX.Element|null}
 */
export default function MediaTrailerCard({ media }) {
  const { t, langKey } = useTranslation();
  const { isMobile } = useDevice();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);

  const platformTrailers = media?.getTrailersByPlatform?.(langKey) || [];
  const activeTrailer = platformTrailers.find((item) => item.site === selectedSite) || platformTrailers[0] || null;

  const handleClose = () => setIsOpen(false);
  const dialogRef = useModal(Boolean(activeTrailer) && isOpen, handleClose);

  if (!media || !activeTrailer) return null;

  const mediaTitle = media.getTitle?.(langKey) || media.getName?.(langKey);
  const backdropSrc = media.getBackdropUrl?.(langKey);
  const label = `${t('detail.watchTrailer')} - ${mediaTitle || activeTrailer.name}`;

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="media-trailer-pill media-trailer-mobile-pill shadow-lg"
          aria-label={label}
        >
          <i className="bi bi-play-fill media-trailer-mobile-pill-icon" aria-hidden="true" />
          <span>{t('detail.watchTrailer')}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="media-trailer-trigger shadow-lg"
          aria-label={label}
        >
          {backdropSrc && <img src={backdropSrc} alt="" className="media-trailer-thumb" />}
          <span className="media-trailer-scrim">
            <span className="media-trailer-play-circle" aria-hidden="true">
              <i className="bi bi-play-fill" />
            </span>
            <span className="media-trailer-cta-pill">{t('detail.watchTrailer')}</span>
          </span>
        </button>
      )}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <dialog
          ref={dialogRef}
          className="media-trailer-modal-backdrop"
          aria-label={t('detail.watchTrailer')}
        >
          <div className="media-trailer-modal-card">
            <div className="d-flex align-items-center justify-content-between gap-2">
              {platformTrailers.length > 1 && (
                <div className="media-trailer-platform-menu">
                  {platformTrailers.map((item) => {
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
    </>
  );
}
