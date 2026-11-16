import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * FriendsList
 * Griglia responsiva degli amici dell'utente con filtro locale e rimozione.
 * @param {Object} props
 * @param {Array<import('../../models/User.js').User>} [props.friendsList=[]]
 * @param {string} [props.searchQuery='']
 * @param {(query: string) => void} [props.setSearchQuery]
 * @param {(friendUid: string) => (void|Promise<any>)} [props.handleRemoveFriend]
 * @returns {import('react').JSX.Element}
 */
export default function FriendsList({
  friendsList = [],
  searchQuery = '',
  setSearchQuery = undefined,
  handleRemoveFriend = undefined
}) {
  const { t, formatTranslation } = useTranslation();
  const [failedAvatars, setFailedAvatars] = useState(new Set());

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <h3 className="text-white fw-bold mb-0 friends-section-title">{t('social.friendsTab')}</h3>
          <span className="text-white-50 friends-section-count">({friendsList.length})</span>
        </div>

        {typeof setSearchQuery === 'function' && (
          <div className="input-group rounded-pill overflow-hidden friends-search-input-group friends-filter-input-group">
            <span className="input-group-text bg-transparent border-0 ps-3 pe-2">
              <i className="bi bi-search text-white-50" aria-hidden="true" />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('social.friendsTab')}
              aria-label={t('social.friendsTab')}
              className="form-control bg-transparent border-0 px-2 py-1 friends-search-input"
            />
          </div>
        )}
      </div>

      {friendsList.length === 0 ? (
        <div className="glass-panel friends-empty-card">
          <i className="bi bi-people text-secondary d-inline-block friends-empty-icon" aria-hidden="true" />
          <p className="mb-1 fw-semibold text-white friends-state-text">{t('social.noFriends')}</p>
          <p className="mb-0 friends-state-text">{t('social.noFriendsSub')}</p>
        </div>
      ) : (
        <div className="row g-3">
          {friendsList.map((f) => {
            const label = f.username || f.email || f.uid || t('social.friendFallback');
            const isAvatarBroken = Boolean(f.photoURL && failedAvatars.has(f.photoURL));
            return (
              <div className="col-12 col-md-6 col-lg-4" key={f.uid}>
                <div className="glass-card friends-card-panel friends-card-clickable position-relative text-white d-flex flex-column justify-content-between h-100 shadow-sm">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden friend-avatar-lg">
                      {f.photoURL && !isAvatarBroken ? (
                        <img
                          src={f.photoURL}
                          alt={label}
                          referrerPolicy="no-referrer"
                          loading="eager"
                          decoding="async"
                          className="rounded-circle friend-avatar-img"
                          onError={() => setFailedAvatars((prev) => new Set(prev).add(f.photoURL))}
                        />
                      ) : (
                        label.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                        <h4 className="fw-bold text-white mb-0 text-single-line friend-card-name">
                          <Link
                            to={`/Cameos/profile/${f.uid}`}
                            state={{ visitorUser: { ...f } }}
                            aria-label={formatTranslation(t('social.viewFriendProfile'), { name: label })}
                            className="stretched-link text-decoration-none text-white"
                          >
                            {label}
                          </Link>
                        </h4>
                        {f.badge && (
                          <span className="badge rounded-pill bg-dark text-warning border border-warning border-opacity-25 flex-shrink-0 friend-status-badge">
                            {f.badge}
                          </span>
                        )}
                      </div>
                      {f.email && <small className="text-white-50 text-single-line friend-card-meta">{f.email}</small>}
                      {typeof f.mutualCameos === 'number' && (
                        <small className="text-success d-block mt-1 friend-card-meta">
                          <i className="bi bi-stars me-1" aria-hidden="true" />
                          {formatTranslation(t('social.mutualCameos'), { count: f.mutualCameos })}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-25">
                    <button
                      type="button"
                      onClick={() => {
                        void handleRemoveFriend?.(f.uid);
                      }}
                      className="btn btn-sm btn-outline-danger rounded-pill friend-action-btn position-relative z-1"
                    >
                      <i className="bi bi-person-x me-1" aria-hidden="true" />
                      {t('social.removeFriend')}
                    </button>
                    <span className="badge bg-dark text-success border border-success border-opacity-25 friend-status-badge">
                      {t('profile.friendsTab')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
