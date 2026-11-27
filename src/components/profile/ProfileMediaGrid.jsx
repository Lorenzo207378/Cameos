import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import MediaCarousel from '../media/MediaCarousel.jsx';

/**
 * ProfileMediaGrid
 * Carosello dei contenuti profilo (Film, Serie, Stagioni ed Episodi) con apertura griglia categoria.
 * @param {Object} props
 * @param {string} [props.title='']
 * @param {string} [props.titleLink]
 * @param {Array<Object>} [props.items=[]]
 * @param {boolean} [props.loading=false]
 * @param {Error|string|Object|null} [props.error=null]
 * @param {boolean} [props.isOffline=false]
 * @param {string} [props.loadingLabel='']
 * @param {string} [props.errorLabel='']
 * @param {string} [props.emptyLabel='']
 * @param {() => void} [props.onRetry]
 * @returns {import('react').ReactElement}
 */
export default function ProfileMediaGrid({
  title = '',
  titleLink = undefined,
  items = [],
  loading = false,
  error = null,
  isOffline = false,
  loadingLabel = '',
  errorLabel = '',
  emptyLabel = '',
  onRetry = undefined
}) {
  const { t } = useTranslation();

  if (loading && items.length === 0) {
    return (
      <div className="glass-panel profile-state-box" role="status">
        <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
        <span className="profile-state-text">{loadingLabel}</span>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="glass-panel profile-state-box is-error" role="alert">
        <i
          className={`bi ${isOffline ? 'bi-wifi-off' : 'bi-exclamation-triangle'} d-block profile-state-icon mb-2`}
          aria-hidden="true"
        />
        <p className="mb-0 profile-state-text">{errorLabel || t('common.error')}</p>
        {onRetry && (
          <button type="button" className="btn btn-outline-success btn-sm rounded-pill mt-3" onClick={onRetry}>
            {t('common.retry')}
          </button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-panel profile-state-box">
        <i className="bi bi-collection text-secondary d-block profile-state-icon mb-2" aria-hidden="true" />
        <p className="mb-0 profile-state-text">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <MediaCarousel
      title={title}
      titleLink={titleLink}
      items={items}
      type="mixed"
      rows={2}
    />
  );
}

ProfileMediaGrid.propTypes = {
  title: PropTypes.string,
  titleLink: PropTypes.string,
  items: PropTypes.array,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ]),
  isOffline: PropTypes.bool,
  loadingLabel: PropTypes.string,
  errorLabel: PropTypes.string,
  emptyLabel: PropTypes.string,
  onRetry: PropTypes.func
};
