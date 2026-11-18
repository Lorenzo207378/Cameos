import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { formatRequestDate } from '../../utils/formatters.js';
import FriendCard from './FriendCard.jsx';

/**
 * IncomingFriendRequestList
 * Elenco delle richieste di amicizia ricevute in stile Invito Première monoriga.
 * @param {Object} props
 * @param {Array<any>} [props.incomingRequests=[]]
 * @param {(request: Object) => (void|Promise<any>)} [props.onAcceptRequest]
 * @param {(requestId: string) => (void|Promise<any>)} [props.onRejectRequest]
 * @returns {import('react').JSX.Element}
 */
export default function IncomingFriendRequestList({
  incomingRequests = [],
  onAcceptRequest = undefined,
  onRejectRequest = undefined
}) {
  const { t, formatTranslation } = useTranslation();

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="text-white fw-bold mb-0 friends-section-title">{t('social.receivedRequestsTab')}</h3>
        <span className="text-white-50 friends-section-count">({incomingRequests.length})</span>
      </div>

      {incomingRequests.length === 0 ? (
        <div className="friends-editorial-empty">
          <div className="friends-empty-emblem d-inline-flex align-items-center justify-content-center mb-3 friends-empty-emblem-amber" aria-hidden="true">
            <i className="bi bi-ticket-perforated" />
          </div>
          <p className="mb-3 text-white fw-semibold friends-state-text">{t('social.noIncomingRequests')}</p>
        </div>
      ) : (
        <div className="row g-3">
          {incomingRequests.map(/** @returns {import('react').JSX.Element} */ (req) => {
            const senderName = req.fromUsername || req.fromUid || t('social.friendFallback');
            const dateLabel = formatRequestDate(req);

            return (
              <div className="col-12 col-md-6 col-xl-4" key={req.id}>
                <FriendCard
                  uid={req.fromUid}
                  name={senderName}
                  photoURL={req.fromPhotoURL}
                  subtitle={dateLabel ? formatTranslation(t('social.sentOn'), { date: dateLabel }) : undefined}
                  variant="incoming"
                  onAction={() => onAcceptRequest?.(req)}
                  onSecondaryAction={() => onRejectRequest?.(req.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

IncomingFriendRequestList.propTypes = {
  incomingRequests: PropTypes.array,
  onAcceptRequest: PropTypes.func,
  onRejectRequest: PropTypes.func
};
