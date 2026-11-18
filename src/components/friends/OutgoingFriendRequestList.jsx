import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { formatRequestDate } from '../../utils/formatters.js';
import FriendCard from './FriendCard.jsx';

/**
 * OutgoingFriendRequestList
 * Elenco delle richieste di amicizia inviate con possibilità di annullamento.
 * @param {Object} props
 * @param {Array<any>} [props.outgoingRequests=[]]
 * @param {(requestId: string) => (void|Promise<any>)} [props.onCancelOutgoing]
 * @returns {import('react').JSX.Element}
 */
export default function OutgoingFriendRequestList({
  outgoingRequests = [],
  onCancelOutgoing = undefined
}) {
  const { t, formatTranslation } = useTranslation();

  const handleCancelClick = (reqId) => {
    const confirmed = window.confirm(`${t('social.cancelRequestBtn')}?`);
    if (!confirmed) return;
    void onCancelOutgoing?.(reqId);
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="text-white fw-bold mb-0 friends-section-title">{t('social.sentRequestsTab')}</h3>
        <span className="text-white-50 friends-section-count">({outgoingRequests.length})</span>
      </div>

      {outgoingRequests.length === 0 ? (
        <div className="friends-editorial-empty">
          <div className="friends-empty-emblem d-inline-flex align-items-center justify-content-center mb-3 friends-empty-emblem-muted" aria-hidden="true">
            <i className="bi bi-send-check" />
          </div>
          <p className="mb-3 text-white fw-semibold friends-state-text">{t('social.noPendingRequests')}</p>
        </div>
      ) : (
        <div className="row g-3">
          {outgoingRequests.map(/** @returns {import('react').JSX.Element} */ (req) => {
            const targetName = req.toUsername || req.toUid || t('social.friendFallback');
            const dateLabel = formatRequestDate(req);

            return (
              <div className="col-12 col-md-6 col-xl-4" key={req.id}>
                <FriendCard
                  uid={req.toUid}
                  name={`@${targetName}`}
                  subtitle={dateLabel ? formatTranslation(t('social.sentOn'), { date: dateLabel }) : undefined}
                  variant="outgoing"
                  onAction={() => handleCancelClick(req.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

OutgoingFriendRequestList.propTypes = {
  outgoingRequests: PropTypes.array,
  onCancelOutgoing: PropTypes.func
};
