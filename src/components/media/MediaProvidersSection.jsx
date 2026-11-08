import { useId } from 'react';
import { useModal } from '../../utils/domUtils.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import MediaProviders from './MediaProviders.jsx';
import '../../css/media/mediaProvidersSection.css';
import '../../css/common/mediaIconButton.css';

/**
 * Watch providers section.
 * Renders the available options blocks (MediaProviders) with clean spacing,
 * without extra cards or footers on desktop, or as a modal overlay on mobile.
 *
 * @param {Object} props
 * @param {Object} props.media - Movie or Series model instance
 * @param {boolean} [props.isModal=false] - Whether to render as an overlay modal
 * @param {boolean} [props.isOpen=false] - Open status for modal mode
 * @param {Function} [props.onClose] - Callback when modal is closed
 */
export default function MediaProvidersSection({ media, isModal = false, isOpen = false, onClose }) {
  const { t } = useTranslation();

  const titleId = useId();
  const dialogRef = useModal(Boolean(media) && isModal && isOpen, onClose);
  /** @type {Record<string, import('./MediaProviders.jsx').WatchProvider[]>} */
  const providers = media?.getWatchProviders?.('IT') || media?.watchProviders?.IT || {};
  const itemsFor = (key) => Array.isArray(providers[key]) ? providers[key] : [];
  const freeItems = [...itemsFor('free'), ...itemsFor('ads')];
  const categories = [
    { key: 'subscription', label: t('detail.subscription'), badgeClass: 'bg-primary', items: itemsFor('flatrate') },
    { key: 'freeStream', label: t('detail.freeStream'), badgeClass: 'bg-success',
      items: freeItems.filter((item, index) => freeItems.findIndex((other) => other.provider_id === item.provider_id) === index) },
    { key: 'rent', label: t('detail.rent'), badgeClass: 'bg-info text-dark', items: itemsFor('rent') },
    { key: 'buy', label: t('detail.buy'), badgeClass: 'bg-secondary', items: itemsFor('buy') }
  ].filter((category) => category.items.length > 0);

  if (!media || (isModal && !isOpen) || (!isModal && !categories.length)) return null;
  const providerList = categories.map(({ key, ...category }) => <MediaProviders key={key} {...category} />);

  // Modal mode for mobile overlay
  if (isModal) {
    return (
      <dialog ref={dialogRef} className="media-providers-modal-backdrop" aria-labelledby={titleId}>
        <div
          className="media-providers-modal-card glass-card rounded-4 p-3 p-md-4 shadow-lg position-relative"
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span id={titleId} className="text-white fw-semibold small text-uppercase letter-spacing-1">
              {t('detail.platforms')}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="media-icon-button"
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              <i className="bi bi-x-lg text-white" />
            </button>
          </div>

          <div className="media-providers-modal-body">
            {categories.length > 0 ? (
              <div className="media-providers-section">{providerList}</div>
            ) : (
              <div className="py-2 text-center text-secondary small">
                <i className="bi bi-tv me-2 text-warning fs-5 align-middle" />
                <span>{t('detail.noProvidersAvailable')}</span>
              </div>
            )}
          </div>
        </div>
      </dialog>
    );
  }

  // Inline render for desktop / tablet con glass-card come sfondo
  return (
    <div className="glass-card rounded-4 p-3 shadow-sm media-providers-section">
      {providerList}
    </div>
  );
}
