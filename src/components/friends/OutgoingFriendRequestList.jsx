import { useTranslation } from '../../contexts/LanguageContext.jsx';

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

  const formatDateLabel = (req) => {
    if (req?.sentAt) return req.sentAt;
    if (!req?.createdAt) return '';
    const parsed = new Date(req.createdAt);
    return Number.isNaN(parsed.getTime()) ? String(req.createdAt) : parsed.toLocaleDateString();
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="text-white fw-bold mb-0 friends-section-title">{t('social.sentRequestsTab')}</h3>
        <span className="text-white-50 friends-section-count">({outgoingRequests.length})</span>
      </div>

      {outgoingRequests.length === 0 ? (
        <div className="glass-panel friends-empty-card">
          <i className="bi bi-send text-secondary d-inline-block friends-empty-icon" aria-hidden="true" />
          <p className="mb-0 friends-state-text">{t('social.noPendingRequests')}</p>
        </div>
      ) : (
        <div className="row g-3">
          {outgoingRequests.map((req) => {
            const targetName = req.toUsername || req.toUid || t('social.friendFallback');
            const dateLabel = formatDateLabel(req);
            return (
              <div className="col-12 col-md-6" key={req.id}>
                <div className="glass-card friends-card-panel text-white d-flex align-items-center justify-content-between gap-3 shadow-sm">
                  <div className="d-flex align-items-center gap-3 min-w-0 flex-grow-1">
                    <div className="rounded-circle bg-secondary text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 friend-avatar-md">
                      {targetName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-grow-1">
                      <h4 className="fw-bold text-white mb-0 text-single-line friend-card-name">@{targetName}</h4>
                      {dateLabel && (
                        <small className="text-warning d-block friend-card-meta">
                          {formatTranslation(t('social.sentOn'), { date: dateLabel })}
                        </small>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCancelClick(req.id)}
                    className="btn btn-sm btn-outline-secondary rounded-pill friend-action-btn text-nowrap"
                  >
                    {t('social.cancelRequestBtn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
