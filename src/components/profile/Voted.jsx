import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { normalizeMediaReference } from '../../models/utils/index.js';
import ProfileMediaGrid from './ProfileMediaGrid.jsx';
import ProfileEpisodeCard from './ProfileEpisodeCard.jsx';

/**
 * Voted
 * Sezione dei contenuti visti o recensiti dall'utente nella pagina profilo.
 * @param {Object} props
 * @param {Array<any>} [props.watchedItems=[]]
 * @param {Array<{ media: any, review: Object|null }>} [props.reviewItems=[]]
 * @param {string} [props.titleLink]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error='']
 * @returns {import('react').JSX.Element}
 */
export default function Voted({ watchedItems = [], reviewItems = [], titleLink = undefined, loading = false, error = '' }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('media');

  const reviewMedia = reviewItems.map((entry) => entry?.media).filter(Boolean);
  const seenKeys = new Set();
  /** @type {Array<Record<string, any>>} */
  const mediaItems = [];
  /** @type {Array<{ targetKey: string, episode: Record<string, any>, rating: number|undefined }>} */
  const episodeEntries = [];

  for (const item of [...watchedItems, ...reviewMedia]) {
    if (!item) continue;
    let ref;
    try {
      ref = normalizeMediaReference(item);
    } catch {
      continue;
    }

    if (seenKeys.has(ref.targetKey)) continue;
    seenKeys.add(ref.targetKey);

    if (ref.mediaType === 'episode') {
      const matchedReview = reviewItems.find(
        (entry) => entry?.review?.targetKey === ref.targetKey
      )?.review;
      episodeEntries.push({
        targetKey: ref.targetKey,
        episode: item,
        rating: matchedReview?.rating ?? undefined
      });
      continue;
    }

    mediaItems.push(item);
  }

  if (loading && mediaItems.length === 0 && episodeEntries.length === 0) {
    return (
      <div className="glass-panel profile-state-box" role="status">
        <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
        <span className="profile-state-text">{t('profile.loadingVoted')}</span>
      </div>
    );
  }

  if (error && mediaItems.length === 0 && episodeEntries.length === 0) {
    return (
      <div className="glass-panel profile-state-box is-error" role="alert">
        <span className="profile-state-text">{error}</span>
      </div>
    );
  }

  if (mediaItems.length === 0 && episodeEntries.length === 0) {
    return (
      <div className="glass-panel profile-state-box">
        <i className="bi bi-check2-circle text-secondary d-block profile-state-icon" aria-hidden="true" />
        <p className="mb-0 profile-state-text">{t('profile.noVoted')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="profile-subtabs">
        <button
          type="button"
          className={`btn rounded-pill fw-semibold profile-subtab-btn ${
            activeTab === 'media'
              ? 'btn-success'
              : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
          onClick={() => setActiveTab('media')}
        >
          {t('nav.media')} ({mediaItems.length})
        </button>
        <button
          type="button"
          className={`btn rounded-pill fw-semibold profile-subtab-btn ${
            activeTab === 'episodes'
              ? 'btn-success'
              : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
          onClick={() => setActiveTab('episodes')}
        >
          {t('profile.votedEpisodes')} ({episodeEntries.length})
        </button>
      </div>

      {activeTab === 'media' && (
        <ProfileMediaGrid
          title={t('nav.media')}
          titleLink={titleLink}
          items={mediaItems}
          loading={loading}
          error={error}
          loadingLabel={t('profile.loadingVoted')}
          emptyLabel={t('profile.noVotedSeries')}
        />
      )}

      {activeTab === 'episodes' && (
        episodeEntries.length === 0 ? (
          <div className="glass-panel profile-state-box">
            <p className="mb-0 profile-state-text">{t('profile.noVotedEpisodes')}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {episodeEntries.map(/** @returns {import('react').JSX.Element} */ ({ targetKey, episode, rating }) => (
              <ProfileEpisodeCard
                key={targetKey}
                episode={episode}
                rating={rating}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

Voted.propTypes = {
  watchedItems: PropTypes.array,
  reviewItems: PropTypes.array,
  titleLink: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ])
};
