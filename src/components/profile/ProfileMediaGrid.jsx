import { normalizeMediaReference } from '../../models/utils/index.js';
import MediaCard from '../media/MediaCard.jsx';
import ProfileEpisodeCard from './ProfileEpisodeCard.jsx';

/**
 * ProfileMediaGrid
 * Griglia responsiva condivisa per Movie, Series, Season ed Episode nella pagina profilo.
 * @param {Object} props
 * @param {Array<any>} [props.items=[]]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error='']
 * @param {string} [props.loadingLabel='']
 * @param {string} [props.emptyLabel='']
 * @returns {import('react').JSX.Element}
 */
export default function ProfileMediaGrid({
  items = [],
  loading = false,
  error = '',
  loadingLabel = '',
  emptyLabel = ''
}) {
  const entries = [];
  for (const item of items) {
    if (!item) continue;
    try {
      entries.push({ item, ref: normalizeMediaReference(item) });
    } catch {
      // Skip malformed item without media identifier
    }
  }

  const episodes = entries.filter(({ ref }) => ref.mediaType === 'episode');
  const mediaItems = entries.filter(({ ref }) => ref.mediaType !== 'episode');

  if (loading && mediaItems.length === 0 && episodes.length === 0) {
    return (
      <div className="glass-panel profile-state-box" role="status">
        <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
        <span className="profile-state-text">{loadingLabel}</span>
      </div>
    );
  }

  if (error && mediaItems.length === 0 && episodes.length === 0) {
    return (
      <div className="glass-panel profile-state-box is-error" role="alert">
        <span className="profile-state-text">{error}</span>
      </div>
    );
  }

  if (mediaItems.length === 0 && episodes.length === 0) {
    return (
      <div className="glass-panel profile-state-box">
        <i className="bi bi-collection text-secondary d-block profile-state-icon" aria-hidden="true" />
        <p className="mb-0 profile-state-text">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      {mediaItems.length > 0 && (
        <div className="profile-media-grid">
          {mediaItems.map(({ item, ref }, idx) => {
            if (ref.mediaType === 'season') {
              return (
                <MediaCard
                  key={`${ref.targetKey}-${idx}`}
                  item={{ ...item, id: ref.mediaId }}
                  type="tv"
                  showType
                />
              );
            }
            const cardType = ref.mediaType === 'tv' ? 'tv' : 'movie';
            return (
              <MediaCard
                key={`${ref.targetKey}-${idx}`}
                item={item}
                type={cardType}
                showType
              />
            );
          })}
        </div>
      )}

      {episodes.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {episodes.map(({ item, ref }, idx) => (
            <ProfileEpisodeCard
              key={`${ref.targetKey}-${idx}`}
              episode={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}
