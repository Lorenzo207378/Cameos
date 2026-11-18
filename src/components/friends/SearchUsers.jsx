import PropTypes from 'prop-types';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ClickSpark from '../reactbits/ClickSpark/ClickSpark.jsx';
import FriendAvatar from './FriendAvatar.jsx';
import '../../css/components/navbar.css';

/**
 * SearchUsers
 * Barra di ricerca unificata che filtra gli amici locali e cerca nuovi utenti per prefisso username.
 * @param {Object} props
 * @param {Array<import('../../models/User.js').User>} [props.searchResults=[]]
 * @param {boolean} [props.isSearching=false]
 * @param {string|null} [props.searchError=null]
 * @param {string} [props.lastSearchQuery]
 * @param {string} [props.searchQuery='']
 * @param {(query: string) => void} [props.onSearchQueryChange]
 * @param {import('react').RefObject<HTMLInputElement|null>} [props.inputRef]
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
  searchQuery = '',
  onSearchQueryChange = undefined,
  inputRef = undefined,
  onSearchUsers = undefined,
  onClearSearch = undefined,
  outgoingRequests = [],
  onAddFriend = undefined,
  onCancelOutgoing = undefined,
  friendsList = []
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [sendingUids, setSendingUids] = useState(new Set());
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const containerRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const trimmedQuery = searchQuery.trim();
  const showDiscoveryTray = trimmedQuery !== '' && isTrayOpen;

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || typeof onSearchUsers !== 'function') {
      return undefined;
    }

    const timer = setTimeout(() => {
      void onSearchUsers(query, user?.uid || null);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.uid, onSearchUsers]);

  useEffect(() => {
    if (!showDiscoveryTray) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(/** @type {Node|null} */ (event.target))) {
        setIsTrayOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsTrayOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDiscoveryTray]);

  const handleQueryChange = (value) => {
    onSearchQueryChange?.(value);
    const hasQuery = Boolean(value.trim());
    setIsTrayOpen(hasQuery);
    if (!hasQuery) {
      onClearSearch?.();
    }
  };

  const handleClear = () => {
    setIsTrayOpen(false);
    onSearchQueryChange?.('');
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

  const isWaitingForSearch = Boolean(trimmedQuery && lastSearchQuery !== undefined && trimmedQuery !== lastSearchQuery);

  return (
    <div ref={containerRef} className="friends-unified-search text-white">
      <form onSubmit={(e) => e.preventDefault()} className="d-flex">
        <div className="input-group navbar-search friends-searchbar flex-nowrap">
          <span className="navSearchBar-button px-2 d-flex align-items-center justify-content-center" aria-hidden="true">
            <i className="bi bi-search" />
          </span>
          <input
            ref={inputRef}
            type="search"
            placeholder={t('social.unifiedSearchPlaceholder')}
            aria-label={t('social.unifiedSearchPlaceholder')}
            className="form-control input-navbar friends-search-input"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (trimmedQuery) setIsTrayOpen(true);
            }}
            onClick={() => {
              if (trimmedQuery) setIsTrayOpen(true);
            }}
          />
          {trimmedQuery && (
            <button
              type="button"
              className="btn bg-transparent border-0 pe-2 text-white-50 d-flex align-items-center"
              aria-label={t('common.close')}
              onClick={handleClear}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {showDiscoveryTray && (
        <div
          className="friends-discovery-tray p-2"
          role="region"
          aria-label={t('search.title')}
        >
          <div className="mb-2 px-1">
            <span className="friends-discovery-title">{t('search.title')}</span>
          </div>

          {isSearching || isWaitingForSearch ? (
            <div className="text-white-50 friends-state-text py-1" role="status">
              <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
              {t('common.loading')}
            </div>
          ) : searchError ? (
            <div className="text-danger friends-state-text py-1" role="alert">
              <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
              {searchError}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="d-flex flex-column gap-2">
              {searchResults.map(/** @returns {import('react').JSX.Element} */ (u) => {
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
                    className="friends-search-result-row d-flex align-items-center justify-content-between gap-2 gap-sm-3"
                  >
                    <div className="d-flex align-items-center gap-2 gap-sm-3 text-start text-white flex-grow-1 min-w-0">
                      <FriendAvatar
                        photoURL={u.photoURL}
                        name={u.username || u.email || u.uid}
                        seed={u.uid}
                        size="sm"
                      />
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
                      <ClickSpark
                        sparkColor="#10b981"
                        sparkSize={10}
                        sparkRadius={20}
                        sparkCount={8}
                        duration={400}
                        className="d-inline-flex w-auto h-auto flex-shrink-0"
                      >
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
                      </ClickSpark>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-white-50 friends-state-text py-1">{t('common.noResults')}</div>
          )}
        </div>
      )}
    </div>
  );
}

SearchUsers.propTypes = {
  searchResults: PropTypes.array,
  isSearching: PropTypes.bool,
  searchError: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ]),
  lastSearchQuery: PropTypes.string,
  searchQuery: PropTypes.string,
  onSearchQueryChange: PropTypes.func,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any })
  ]),
  onSearchUsers: PropTypes.func,
  onClearSearch: PropTypes.func,
  outgoingRequests: PropTypes.array,
  onAddFriend: PropTypes.func,
  onCancelOutgoing: PropTypes.func,
  friendsList: PropTypes.array
};
