import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import ClickSpark from '../reactbits/ClickSpark/ClickSpark.jsx';
import GlareHover from '../reactbits/GlareHover.jsx';
import FriendAvatar from './FriendAvatar.jsx';

/** @type {Record<string, { cardClass: string, ring: 'auto'|'amber'|'muted', glare: string, subtitleClass: string }>} */
const VARIANT_CONFIG = {
  friend: {
    cardClass: '',
    ring: 'auto',
    glare: '#10b981',
    subtitleClass: 'text-white-50'
  },
  incoming: {
    cardClass: 'friend-ticket-incoming',
    ring: 'amber',
    glare: '#f59e0b',
    subtitleClass: 'text-white-50'
  },
  outgoing: {
    cardClass: 'friend-ticket-outgoing',
    ring: 'muted',
    glare: '#10b981',
    subtitleClass: 'text-warning'
  }
};

/**
 * FriendCard
 * Scheda Crew Pass riutilizzabile per amici, richieste ricevute e richieste inviate.
 * @param {Object} props
 * @param {string|null} [props.uid]
 * @param {string} props.name
 * @param {string|null} [props.photoURL]
 * @param {string|null} [props.subtitle]
 * @param {'friend'|'incoming'|'outgoing'} [props.variant='friend']
 * @param {() => (void|Promise<any>)} [props.onAction]
 * @param {() => (void|Promise<any>)} [props.onSecondaryAction]
 * @returns {import('react').JSX.Element}
 */
export default function FriendCard({
  uid = undefined,
  name,
  photoURL = undefined,
  subtitle = undefined,
  variant = 'friend',
  onAction = undefined,
  onSecondaryAction = undefined
}) {
  const { t, formatTranslation } = useTranslation();
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.friend;
  const profileTo = uid ? `/Cameos/profile/${uid}` : null;

  const renderActions = () => {
    if (variant === 'incoming') {
      return (
        <div className="d-flex align-items-center gap-2 friend-premiere-actions">
          <button
            type="button"
            onClick={() => {
              void onSecondaryAction?.();
            }}
            aria-label={t('social.declineBtn')}
            title={t('social.declineBtn')}
            className="btn btn-sm btn-outline-danger rounded-pill fw-semibold d-inline-flex align-items-center justify-content-center flex-shrink-0 text-nowrap friend-action-btn"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
            <span className="ms-1">{t('social.declineBtn')}</span>
          </button>
          <ClickSpark
            sparkColor="#10b981"
            sparkSize={11}
            sparkRadius={22}
            sparkCount={10}
            duration={420}
            className="d-inline-flex w-auto h-auto flex-shrink-0"
          >
            <button
              type="button"
              onClick={() => {
                void onAction?.();
              }}
              className="btn btn-sm btn-success rounded-pill fw-bold shadow-sm d-inline-flex align-items-center justify-content-center flex-shrink-0 text-nowrap friend-action-btn"
            >
              <i className="bi bi-check-lg me-1" aria-hidden="true" />
              {t('social.acceptBtn')}
            </button>
          </ClickSpark>
        </div>
      );
    }

    if (variant === 'outgoing') {
      return (
        <button
          type="button"
          onClick={() => {
            void onAction?.();
          }}
          className="btn btn-sm btn-outline-secondary rounded-pill d-inline-flex align-items-center justify-content-center flex-shrink-0 friend-action-btn text-nowrap"
        >
          {t('social.cancelRequestBtn')}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          void onAction?.();
        }}
        aria-label={t('social.removeFriend')}
        title={t('social.removeFriend')}
        className="btn btn-outline-danger rounded-circle d-inline-flex align-items-center justify-content-center p-0 friend-remove-icon-btn"
      >
        <i className="bi bi-person-x-fill" aria-hidden="true" />
      </button>
    );
  };

  return (
    <GlareHover
      width="100%"
      glareColor={config.glare}
      glareOpacity={0.22}
      glareSize={28}
      borderRadius="1rem"
      className="friend-ticket-glare w-100"
    >
      <div
        className={`friend-ticket-card ${config.cardClass} ${variant !== 'friend' ? 'friend-ticket-has-wide-actions' : ''} ${profileTo ? 'friends-card-clickable' : ''} position-relative text-white d-flex align-items-stretch w-100 h-100`.trim()}
      >
        <div className="friend-ticket-stub d-flex align-items-center justify-content-center flex-shrink-0">
          <FriendAvatar
            photoURL={photoURL}
            name={name}
            seed={uid || name}
            size="md"
            ringVariant={config.ring}
          />
        </div>

        <div className="friend-ticket-body d-flex gap-2 gap-sm-3 flex-grow-1 min-w-0">
          <div className="friend-ticket-text min-w-0 flex-grow-1">
            <div className="d-flex align-items-center gap-2 min-w-0">
              <h4 className="fw-bold text-white mb-0 text-single-line friend-card-name">
                {profileTo ? (
                  <Link
                    to={profileTo}
                    state={{ visitorUser: { uid, username: name, photoURL: photoURL || null } }}
                    aria-label={formatTranslation(t('social.viewFriendProfile'), { name })}
                    className="stretched-link text-decoration-none text-white"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </h4>

              {variant === 'incoming' && (
                <span className="friend-premiere-badge flex-shrink-0">
                  {t('social.premiereInviteBadge')}
                </span>
              )}
            </div>

            {subtitle && (
              <small className={`${config.subtitleClass} text-single-line d-block friend-card-meta`}>
                {subtitle}
              </small>
            )}
          </div>

          <div className="friend-ticket-actions position-relative z-1 flex-shrink-0 d-flex align-items-center">
            {renderActions()}
          </div>
        </div>
      </div>
    </GlareHover>
  );
}

FriendCard.propTypes = {
  uid: PropTypes.string,
  name: PropTypes.string.isRequired,
  photoURL: PropTypes.string,
  subtitle: PropTypes.string,
  variant: PropTypes.oneOf(['friend', 'incoming', 'outgoing']),
  onAction: PropTypes.func,
  onSecondaryAction: PropTypes.func
};
