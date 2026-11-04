export default function FriendsList({ friendsList = [], searchQuery = '', setSearchQuery = null, handleRemoveFriend = null }) {

  return (
    
        <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">Lista Amici</h3>
            <span className="text-white-50 small">{friendsList.length} connessioni</span>
          </div>

          {friendsList.length === 0 ? (
            <div className="card-2pxb-dark-background rounded-4 p-5 text-center text-white-50">
              <i className="bi bi-search text-secondary fs-1 mb-3 d-inline-block"></i>
              <p className="mb-0">Nessun utente corrisponde ai criteri di ricerca</p>
            </div>
            
          ) : (
            <div className="row g-3">
              {friendsList.map((f) => (
                <div className="col-12 col-md-6 col-lg-4" key={f.uid}>
                  <div className="card-2pxb-dark-background rounded-4 p-4 text-white d-flex flex-column justify-content-between h-100 shadow-sm hover-scale">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '48px', height: '48px', fontSize: '18px' }}
                      >
                        {f.username?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h4 className="h6 fw-bold text-white mb-0 text-truncate">{f.username}</h4>
                          <span className="badge rounded-pill bg-dark text-warning border border-warning border-opacity-25 small">
                            {f.badge}
                          </span>
                        </div>
                        <small className="text-white-50 text-truncate d-block">{f.email}</small>
                        <small className="text-success d-block mt-1">
                          <i className="bi bi-stars me-1"></i> {f.mutualCameos} Camei piaciuti in comune
                        </small>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-25">
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(f.uid)}
                        className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                        style={{ fontSize: '12px' }}
                      >
                        <i className="bi bi-person-x me-1"></i> Rimuovi
                      </button>
                      <span className="badge bg-dark text-success border border-success border-opacity-25 px-2 py-1 small">
                        Amico Attivo
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }
