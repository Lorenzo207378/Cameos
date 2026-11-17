import PropTypes from 'prop-types';
import { normalizeMediaReference } from '../../models/utils/index.js';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import MediaCarousel from '../media/MediaCarousel.jsx';

/**
 * ProfileMediaGrid
 * Carosello dei contenuti profilo (Film, Serie, Stagioni ed Episodi) con apertura griglia categoria.
 * @param {Object} props
 * @param {string} [props.title='']
 * @param {string} [props.titleLink]
 * @param {Array<any>} [props.items=[]]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error='']
 * @param {string} [props.loadingLabel='']
 * @param {string} [props.emptyLabel='']
 * @returns {import('react').JSX.Element}
 */
export default function ProfileMediaGrid({
  title = '',
  titleLink = undefined,
  items = [],
  loading = false,
  error = '',
  loadingLabel = '',
  emptyLabel = ''
}) {
  const { isMobile } = useDevice();

  const carouselItems = [];
  for (const item of items) {
    if (!item) continue;
    try {
      const ref = normalizeMediaReference(item);
      carouselItems.push({
        ...item,
        id: ref.targetKey,
        mediaId: ref.mediaId,
        seriesId: item.seriesId ?? (ref.mediaType !== 'movie' ? ref.mediaId : undefined),
        seasonNumber: item.seasonNumber ?? ref.seasonNumber,
        episodeNumber: item.episodeNumber ?? ref.episodeNumber,
        mediaType: ref.mediaType === 'movie' ? 'movie' : 'tv'
      });
    } catch {
      // Skip malformed item without media identifier
    }
  }

  if (loading && carouselItems.length === 0) {
    return (
      <div className="glass-panel profile-state-box" role="status">
        <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
        <span className="profile-state-text">{loadingLabel}</span>
      </div>
    );
  }

  if (error && carouselItems.length === 0) {
    return (
      <div className="glass-panel profile-state-box is-error" role="alert">
        <span className="profile-state-text">{error}</span>
      </div>
    );
  }

  if (carouselItems.length === 0) {
    return (
      <div className="glass-panel profile-state-box">
        <i className="bi bi-collection text-secondary d-block profile-state-icon" aria-hidden="true" />
        <p className="mb-0 profile-state-text">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <MediaCarousel
      title={title}
      titleLink={titleLink}
      items={carouselItems}
      type="mixed"
      rows={isMobile ? 1 : 2}
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
  loadingLabel: PropTypes.string,
  emptyLabel: PropTypes.string
};
