import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { userBackend } from '../../backend/user/UserBackend.js';

export default function SearchUsers({ outgoingRequests = [], onAddFriend = null, onCancelOutgoing = null, friendsList = [] }) {
  const { user } = useAuth();

  const [searchUsernamePrefix, setSearchUsernamePrefix] = useState('');
  const [backendSearchResults, setBackendSearchResults] = useState([]);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState(new Set());
  const [sentRequestUids, setSentRequestUids] = useState(new Set());
  const [sendingUids, setSendingUids] = useState(new Set());

  useEffect(() => {
    const performSearch = async () => {
      const query = searchUsernamePrefix.trim();
      if (!query) {
        setBackendSearchResults([]);
        return;
      }

      setIsSearchingBackend(true);
      try {
        const results = await userBackend.getUsersByUsername(query);
        const filtered = results.filter(
          (u) => u.uid && (!user?.uid || u.uid !== user.uid)
        );
        setBackendSearchResults(filtered);
      } catch (err) {
        console.error('Errore durante la ricerca utenti:', err);
        setBackendSearchResults([]);
      } finally {
        setIsSearchingBackend(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchUsernamePrefix, user?.uid]);

  const handleSendFriendRequest = async (e, targetUserId = null) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!targetUserId) {
      return;
    }

    if (sendingUids.has(targetUserId) || sentRequestUids.has(targetUserId)) {
      return;
    }

    setSendingUids((prev) => new Set(prev).add(targetUserId));

    try {
      if (onAddFriend) {
        await onAddFriend(targetUserId);
      }
      setSentRequestUids((prev) => new Set(prev).add(targetUserId));
    } catch (err) {
      console.error("Errore durante l'invio della richiesta di amicizia:", err);
      // Do not mark as sent on error
    } finally {
      setSendingUids((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };
  
  return (
    
        <section className="card-2pxb-dark-background rounded-4 mb-4 p-4 p-md-5 shadow-lg text-white">
          <div className="row g-4">
            <div className="col-lg-6">
              <h3 className="h4 fw-bold text-white mb-3">Invia una Richiesta di Amicizia</h3>

              <form onSubmit={handleSendFriendRequest} className="d-flex flex-column flex-sm-row gap-2">
                <div className="input-group rounded-pill overflow-hidden" style={{ backgroundColor: '#262732', boxShadow: '0 3px 6px rgba(0, 0, 0, 0.35)' }}>
                  <span className="input-group-text bg-transparent border-0 ps-3 pe-2">
                    <i className="bi bi-search text-white-50"></i>
                  </span>
                  <input
                    type="text"
                    placeholder="Cerca per username..."
                    className="form-control bg-transparent border-0 text-white px-2 py-2"
                    value={searchUsernamePrefix}
                    onChange={(e) => setSearchUsernamePrefix(e.target.value)}
                    required
                    style={{ boxShadow: 'none' }}
                  />
                  {searchUsernamePrefix.trim() && (
                    <button
                      type="button"
                      className="btn bg-transparent border-0 pe-3"
                      onClick={() => {
                        setSearchUsernamePrefix('');
                        setBackendSearchResults([]);
                      }}
                    >
                      <i className="bi bi-x-lg text-white-50"></i>
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-3">
                {searchUsernamePrefix.trim() !== '' ? (
                  isSearchingBackend ? (
                    <div className="text-white-50 small">
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Ricerca in corso...
                    </div>
                  ) : backendSearchResults.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {backendSearchResults.map((u) => {
                        const pendingRequest =
                          (Array.isArray(outgoingRequests) &&
                            outgoingRequests.find(
                              (req) =>
                                req?.toUid === u.uid ||
                                req?.id === `${user?.uid}_${u.uid}` ||
                                req?.id === `${u.uid}_${user?.uid}`
                            )) ||
                          null;

                        const hasPendingRequest =
                          !!pendingRequest ||
                          sentRequestUids.has(u.uid) ||
                          sendingUids.has(u.uid);

                        return (
                          <div
                            key={u.uid}
                            className="d-flex align-items-center justify-content-between gap-3 p-2 px-3 rounded-4 bg-dark bg-opacity-50 border border-secondary border-opacity-25"
                          >
                            <div
                              className="d-flex align-items-center gap-3 text-start text-white bg-transparent border-0 flex-grow-1 p-0"
                            >
                              <div
                                className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0 overflow-hidden"
                                style={{ width: '36px', height: '36px', fontSize: '14px' }}
                              >
                                {u.photoURL && !failedAvatars.has(u.uid) ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.username}
                                    className="rounded-circle"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={() => setFailedAvatars((prev) => new Set(prev).add(u.uid))}
                                  />
                                ) : (
                                  u.username?.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="fw-semibold text-truncate">{u.username}</div>
                              </div>
                            </div>
                            {hasPendingRequest ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!pendingRequest) return;
                                  setSentRequestUids((prev) => {
                                    const next = new Set(prev);
                                    next.delete(u.uid);
                                    return next;
                                  });
                                  if (onCancelOutgoing) onCancelOutgoing(pendingRequest.id);
                                }}
                                disabled={!pendingRequest}
                                className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1"
                                style={{ fontSize: '12px' }}
                              >
                                Annulla
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  handleSendFriendRequest(e, u.uid);
                                }}
                                className="btn btn-sm btn-success rounded-pill px-3 py-1 fw-semibold text-nowrap"
                                style={{ fontSize: '12px' }}
                              >
                                <i className="bi bi-person-plus-fill me-1"></i> Aggiungi amico
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-white-50 small">nessun utente trovato</div>
                  )
                ) : null}
              </div>
            </div>

          </div>
        </section>
      );
    }
