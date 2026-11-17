import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * Shared top backdrop shell for Movie, TVSeries, and Episode detail pages.
 * @param {Object} props
 * @param {string|null} [props.src]
 * @returns {import('react').JSX.Element}
 */
export function DetailBackdrop({ src = null }) {
  return (
    <div className="film-detail-backdrop-wrapper">
      <div className="film-detail-backdrop-container">
        {src ? (
          <img src={src} alt="" className="film-detail-backdrop-image" />
        ) : (
          <div className="film-detail-backdrop-placeholder" />
        )}
        <div className="film-detail-backdrop-overlay" />
      </div>
    </div>
  );
}

/**
 * Shared empty/not-found shell for Movie, TVSeries, and Episode detail pages.
 * @param {Object} props
 * @param {string} [props.icon='bi-film']
 * @param {string} props.title
 * @param {() => void} props.onBack
 * @returns {import('react').JSX.Element}
 */
export function DetailNotFound({ icon = 'bi-film', title, onBack }) {
  const { t } = useTranslation();

  return (
    <div className="w-100 min-vh-100 d-flex flex-column position-relative film-detail-empty">
      <div className="px-3 px-md-4 px-xl-5 pt-2 pt-md-3">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn"
          aria-label={t('detail.goBack')}
          title={t('detail.goBack')}
        >
          <i className="bi bi-arrow-left text-white" />
        </button>
      </div>

      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4 pb-5">
        <i className={`bi ${icon} text-secondary fs-1 mb-3 opacity-50`} />
        <h2 className="fw-bold mb-2 text-white">{title}</h2>
        <p className="text-secondary mb-4">{t('common.noResults')}</p>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline-success rounded-pill px-4 py-2 fw-semibold"
        >
          {t('detail.goBack')}
        </button>
      </div>
    </div>
  );
}
