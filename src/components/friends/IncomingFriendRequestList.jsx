export default function IncomingFriendRequestList({ incomingRequests = [], onAddFriend = null, friendsList = [], onAcceptRequest = null, onRejectRequest = null, onCancelIncoming = null }) {
  
  const handleAcceptRequest = (req) => {
    if (onAcceptRequest) {
      onAcceptRequest(req);
      return;
    }
    if (onAddFriend) {
      if (req?.toUid) {
        onAddFriend(req.toUid);
      }
    }
  };

  const handleRejectRequest = (reqId) => {
    if (onRejectRequest) {
      onRejectRequest(reqId);
      return;
    }
    if (onCancelIncoming) {
      onCancelIncoming(reqId);
    }
  };

  return (
    
    <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">Richieste in Arrivo</h3>
            <span className="text-white-50 small">{incomingRequests.length} in attesa di risposta</span>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="card-2pxb-dark-background rounded-4 p-5 text-center text-white-50">
              <i className="bi bi-inbox text-secondary fs-1 mb-3 d-inline-block"></i>
              <p className="mb-0">Nessuna nuova richiesta di amicizia in attesa.</p>
            </div>
          ) : (
            <div className="row g-3">
              {incomingRequests.map((req) => (
                <div className="col-12 col-md-6" key={req.id}>
                  <div className="card-2pxb-dark-background rounded-4 p-4 text-white d-flex flex-column justify-content-between shadow-sm">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        className="rounded-circle bg-warning text-dark fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '48px', height: '48px', fontSize: '18px' }}
                      >
                        {req.fromUsername?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="h6 fw-bold text-white mb-1">{req.fromUsername}</h4>
                        <small className="text-white-50">Inviata: {req.sentAt || req.createdAt || ''}</small>
                      </div>
                    </div>

                    <div className="d-flex gap-2 pt-3 border-top border-secondary border-opacity-25 justify-content-end">
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req.id)}
                        className="btn btn-sm btn-outline-danger rounded-pill px-4 py-2 fw-semibold"
                      >
                        <i className="bi bi-x-circle me-1"></i> Rifiuta
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        className="btn btn-sm btn-success rounded-pill px-4 py-2 fw-bold shadow-sm"
                      >
                        <i className="bi bi-check-circle me-1"></i> Accetta Amicizia
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>    
      );
    }
