import { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * IncomingFriendRequestList
 * Elenco delle richieste di amicizia ricevute con azioni di accettazione e rifiuto.
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
  const [failedAvatars, setFailedAvatars] = useState(new Set());

  const formatDateLabel = (req) => {
    if (req?.sentAt) return req.sentAt;
    if (!req?.createdAt) return '';
    const parsed = new Date(req.createdAt);
    return Number.isNaN(parsed.getTime()) ? String(req.createdAt) : parsed.toLocaleDateString();
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="text-white fw-bold mb-0 friends-section-title">{t('social.receivedRequestsTab')}</h3>
        <span className="text-white-50 friends-section-count">({incomingRequests.length})</span>
      </div>

      {incomingRequests.length === 0 ? (
        <div className="glass-panel friends-empty-card">
          <i className="bi bi-inbox text-secondary d-inline-block friends-empty-icon" aria-hidden="true" />
          <p className="mb-0 friends-state-text">{t('social.noIncomingRequests')}</p>
        </div>
      ) : (
        <div className="row g-3">
          {incomingRequests.map((req) => {
            const senderName = req.fromUsername || req.fromUid || t('social.friendFallback');
            const dateLabel = formatDateLabel(req);
            const isAvatarBroken = Boolean(req.fromPhotoURL && failedAvatars.has(req.fromPhotoURL));
            return (
              <div className="col-12 col-md-6" key={req.id}>
                <div className="glass-card friends-card-panel text-white d-flex flex-column justify-content-between shadow-sm">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="rounded-circle bg-warning text-dark fw-bold d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden friend-avatar-lg">
                      {req.fromPhotoURL && !isAvatarBroken ? (
                        <img
                          src={req.fromPhotoURL}
                          alt={senderName}
                          referrerPolicy="no-referrer"
                          loading="eager"
                          decoding="async"
                          className="rounded-circle friend-avatar-img"
                          onError={() => setFailedAvatars((prev) => new Set(prev).add(req.fromPhotoURL))}
                        />
                      ) : (
                        senderName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-grow-1">
                      <h4 className="fw-bold text-white mb-1 text-single-line friend-card-name">{senderName}</h4>
                      {dateLabel && (
                        <small className="text-white-50 d-block friend-card-meta">
                          {formatTranslation(t('social.sentOn'), { date: dateLabel })}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 pt-3 border-top border-secondary border-opacity-25 justify-content-end">
                    <button
                      type="button"
                      onClick={() => {
                        void onRejectRequest?.(req.id);
                      }}
                      className="btn btn-sm btn-outline-danger rounded-pill fw-semibold friend-action-btn"
                    >
                      <i className="bi bi-x-circle me-1" aria-hidden="true" />
                      {t('social.declineBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void onAcceptRequest?.(req);
                      }}
                      className="btn btn-sm btn-success rounded-pill fw-bold shadow-sm friend-action-btn"
                    >
                      <i className="bi bi-check-circle me-1" aria-hidden="true" />
                      {t('social.acceptBtn')}
                    </button>
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
