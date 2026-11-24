import PropTypes from 'prop-types';
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

DetailBackdrop.propTypes = {
  src: PropTypes.string
};

/**
 * Shared empty/not-found/error shell for Movie, TVSeries, and Episode detail pages.
 * @param {Object} props
 * @param {string} [props.icon='bi-film']
 * @param {string} props.title
 * @param {string|null} [props.subtitle]
 * @param {() => void} props.onBack
 * @param {() => void} [props.onRetry]
 * @returns {import('react').JSX.Element}
 */
export function DetailNotFound({ icon = 'bi-film', title, subtitle = undefined, onBack, onRetry = undefined }) {
  const { t } = useTranslation();
  const isErrorState = Boolean(onRetry);
  const resolvedSubtitle = subtitle !== undefined ? subtitle : (isErrorState ? null : t('common.noResults'));

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
          <i className="bi bi-arrow-left text-white" aria-hidden="true" />
        </button>
      </div>

      <div
        className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4 pb-5"
        role={isErrorState ? 'alert' : undefined}
      >
        <i className={`bi ${icon} text-secondary fs-1 mb-3 opacity-50`} aria-hidden="true" />
        <h2 className="fw-bold mb-2 text-white">{title}</h2>
        {resolvedSubtitle && <p className="text-secondary mb-4">{resolvedSubtitle}</p>}
        <div className={`d-flex flex-wrap align-items-center justify-content-center gap-2${resolvedSubtitle ? '' : ' mt-3'}`}>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-success rounded-pill px-4 py-2 fw-semibold"
            >
              {t('common.retry')}
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="btn btn-outline-success rounded-pill px-4 py-2 fw-semibold"
          >
            {t('detail.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}

DetailNotFound.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  onRetry: PropTypes.func
};
