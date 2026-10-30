export default function OutgoingFriendRequestList({ outgoingRequests = [], onAddFriend = null, friendsList = [], onCancelOutgoing = null }) {
  const handleCancelOutgoing = (reqId) => {
    const confirmed = window.confirm('Sei sicuro di voler annullare questa richiesta di amicizia?');
    if (!confirmed) return;
    if (onCancelOutgoing) onCancelOutgoing(reqId);
  };


  return (
    
        <section>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="h4 text-white fw-bold mb-0">Richieste Inviate</h3>
                    <span className="text-white-50 small">{outgoingRequests.length} in attesa</span>
                  </div>
        
                  {outgoingRequests.length === 0 ? (
                    <div className="card-2pxb-dark-background rounded-4 p-5 text-center text-white-50">
                      <i className="bi bi-send text-secondary fs-1 mb-3 d-inline-block"></i>
                      <p className="mb-0">Nessuna richiesta inviata in attesa di risposta.</p>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {outgoingRequests.map((req) => (
                        <div className="col-12 col-md-6" key={req.id}>
                          <div className="card-2pxb-dark-background rounded-4 p-4 text-white d-flex align-items-center justify-content-between shadow-sm">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle bg-secondary text-white fw-bold d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                              >
                                {req.toUsername?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="h6 fw-bold text-white mb-0">@{req.toUsername}</h4>
                                <small className="text-warning">In attesa di approvazione • {req.sentAt}</small>
                              </div>
                            </div>
        
                            <button
                              type="button"
                              onClick={() => handleCancelOutgoing(req.id)}
                              className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1"
                              style={{ fontSize: '12px' }}
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
      );
    }
