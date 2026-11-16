import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * SearchUsers
 * Barra di ricerca utenti per prefisso username con invio e annullamento richieste di amicizia.
 * @param {Object} props
 * @param {Array<import('../../models/User.js').User>} [props.searchResults=[]]
 * @param {boolean} [props.isSearching=false]
 * @param {string|null} [props.searchError=null]
 * @param {string} [props.lastSearchQuery]
 * @param {(query: string, excludeUid?: string|null) => Promise<any>} [props.onSearchUsers]
 * @param {() => void} [props.onClearSearch]
 * @param {Array<any>} [props.outgoingRequests=[]]
 * @param {(targetUid: string, targetUser?: import('../../models/User.js').User) => Promise<any>} [props.onAddFriend]
 * @param {(requestId: string) => (void|Promise<any>)} [props.onCancelOutgoing]
 * @param {Array<import('../../models/User.js').User>} [props.friendsList=[]]
 * @returns {import('react').JSX.Element}
 */
export default function SearchUsers({
  searchResults = [],
  isSearching = false,
  searchError = null,
  lastSearchQuery = undefined,
  onSearchUsers = undefined,
  onClearSearch = undefined,
  outgoingRequests = [],
  onAddFriend = undefined,
  onCancelOutgoing = undefined,
  friendsList = []
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [searchUsernamePrefix, setSearchUsernamePrefix] = useState('');
  const [failedAvatars, setFailedAvatars] = useState(new Set());
  const [sendingUids, setSendingUids] = useState(new Set());

  useEffect(() => {
    const query = searchUsernamePrefix.trim();
    if (!query || typeof onSearchUsers !== 'function') {
      return undefined;
    }

    const timer = setTimeout(() => {
      void onSearchUsers(query, user?.uid || null);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchUsernamePrefix, user?.uid, onSearchUsers]);

  const handleQueryChange = (value) => {
    setSearchUsernamePrefix(value);
    if (!value.trim()) {
      onClearSearch?.();
    }
  };

  const handleClear = () => {
    setSearchUsernamePrefix('');
    onClearSearch?.();
  };

  /**
   * @param {import('react').SyntheticEvent} e
   * @param {import('../../models/User.js').User|string} [targetUser]
   */
  const handleSendFriendRequest = async (e, targetUser = undefined) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    const targetUserId = typeof targetUser === 'string' ? targetUser : targetUser?.uid;
    if (!targetUserId || sendingUids.has(targetUserId)) {
      return;
    }

    setSendingUids((prev) => new Set(prev).add(targetUserId));
    try {
      if (onAddFriend) {
        await onAddFriend(targetUserId, typeof targetUser === 'string' ? undefined : targetUser);
      }
    } catch {
      // Parent handles feedback banner
    } finally {
      setSendingUids((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const trimmedQuery = searchUsernamePrefix.trim();
  const isWaitingForSearch = Boolean(trimmedQuery && lastSearchQuery !== undefined && trimmedQuery !== lastSearchQuery);

  return (
    <section className="glass-card card-border-primary friends-search-card shadow-lg text-white">
      <div className="row g-3 g-md-4">
        <div className="col-lg-8 col-xl-6">
          <h2 className="fw-bold text-white friends-section-title">{t('social.addFriendCardTitle')}</h2>

          <form onSubmit={(e) => e.preventDefault()} className="d-flex flex-column flex-sm-row gap-2">
            <div className="input-group rounded-pill overflow-hidden friends-search-input-group">
              <span className="input-group-text bg-transparent border-0 ps-3 pe-2">
                <i className="bi bi-search text-white-50" aria-hidden="true" />
              </span>
              <input
                type="text"
                placeholder={t('social.addFriendInputPlaceholder')}
                aria-label={t('social.addFriendInputPlaceholder')}
                className="form-control bg-transparent border-0 px-2 py-2 friends-search-input"
                value={searchUsernamePrefix}
                onChange={(e) => handleQueryChange(e.target.value)}
              />
              {trimmedQuery && (
                <button
                  type="button"
                  className="btn bg-transparent border-0 pe-3 text-white-50"
                  aria-label={t('common.close')}
                  onClick={handleClear}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>

          {trimmedQuery !== '' && (
            <div className="mt-3">
              {isSearching || isWaitingForSearch ? (
                <div className="text-white-50 friends-state-text" role="status">
                  <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
                  {t('common.loading')}
                </div>
              ) : searchError ? (
                <div className="text-danger friends-state-text" role="alert">
                  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
                  {searchError}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {searchResults.map((u) => {
                    const isFriend = friendsList.some((f) => f.uid === u.uid);
                    const pendingRequest = !isFriend
                      ? outgoingRequests.find(
                          (req) =>
                            req?.toUid === u.uid
                            || req?.id === `${user?.uid}_${u.uid}`
                            || req?.id === `${u.uid}_${user?.uid}`
                        ) || null
                      : null;
                    const hasPendingRequest = Boolean(pendingRequest || sendingUids.has(u.uid));

                    return (
                      <div
                        key={u.uid}
                        className="friends-search-result-row d-flex align-items-center justify-content-between gap-3"
                      >
                        <div className="d-flex align-items-center gap-3 text-start text-white flex-grow-1 min-w-0">
                          <div className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden friend-avatar-sm">
                            {u.photoURL && !failedAvatars.has(u.photoURL) ? (
                              <img
                                src={u.photoURL}
                                alt={u.username || u.uid}
                                referrerPolicy="no-referrer"
                                decoding="async"
                                className="rounded-circle friend-avatar-img"
                                onError={() => setFailedAvatars((prev) => new Set(prev).add(u.photoURL))}
                              />
                            ) : (
                              (u.username || u.email || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="fw-semibold text-single-line friend-card-name">{u.username || u.uid}</div>
                          </div>
                        </div>

                        {hasPendingRequest ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (pendingRequest && onCancelOutgoing) {
                                void onCancelOutgoing(pendingRequest.id);
                              }
                            }}
                            disabled={!pendingRequest}
                            className="btn btn-sm btn-outline-secondary rounded-pill friend-action-btn text-nowrap"
                          >
                            {t('common.cancel')}
                          </button>
                        ) : isFriend ? (
                          <span className="badge rounded-pill bg-dark text-success border border-success border-opacity-25 friend-status-badge">
                            {t('profile.friendsTab')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              void handleSendFriendRequest(e, u);
                            }}
                            className="btn btn-sm btn-success rounded-pill fw-semibold text-nowrap friend-action-btn"
                          >
                            <i className="bi bi-person-plus-fill me-1" aria-hidden="true" />
                            {t('social.sendRequestBtn')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-white-50 friends-state-text">{t('common.noResults')}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
