import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import FriendCard from './FriendCard.jsx';

/**
 * FriendsList
 * Griglia responsiva degli amici dell'utente in stile Crew Pass cinematografico.
 * @param {Object} props
 * @param {Array<import('../../models/User.js').User>} [props.friendsList=[]]
 * @param {(friendUid: string) => (void|Promise<any>)} [props.handleRemoveFriend]
 * @param {() => void} [props.onFocusSearch]
 * @returns {import('react').JSX.Element}
 */
export default function FriendsList({
  friendsList = [],
  handleRemoveFriend = undefined,
  onFocusSearch = undefined
}) {
  const { t } = useTranslation();

  if (friendsList.length === 0) {
    return (
      <section>
        <div className="friends-editorial-empty">
          <div className="friends-empty-emblem d-inline-flex align-items-center justify-content-center mb-3" aria-hidden="true">
            <i className="bi bi-camera-reels" />
          </div>
          <h3 className="text-white fw-bold friends-empty-title mb-1">{t('social.noFriends')}</h3>
          <p className="friends-state-text friends-empty-subtitle mx-auto mb-3">{t('social.noFriendsSub')}</p>
          {typeof onFocusSearch === 'function' && (
            <button
              type="button"
              onClick={() => onFocusSearch()}
              className="btn btn-outline-success rounded-pill fw-semibold friends-empty-cta"
            >
              <i className="bi bi-search me-2" aria-hidden="true" />
              {t('social.focusSearchCta')}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="d-flex align-items-center gap-2 mb-3">
        <h3 className="text-white fw-bold mb-0 friends-section-title">{t('social.friendsTab')}</h3>
        <span className="text-white-50 friends-section-count">({friendsList.length})</span>
      </div>

      <div className="row g-3">
        {friendsList.map(/** @returns {import('react').JSX.Element} */ (f) => {
          const label = f.username || f.email || f.uid || t('social.friendFallback');

          return (
            <div className="col-12 col-md-6 col-xl-4" key={f.uid}>
              <FriendCard
                uid={f.uid}
                name={label}
                photoURL={f.photoURL}
                subtitle={f.email}
                onAction={() => handleRemoveFriend?.(f.uid)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

FriendsList.propTypes = {
  friendsList: PropTypes.array,
  handleRemoveFriend: PropTypes.func,
  onFocusSearch: PropTypes.func
};
