import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocialViewModel } from '../viewmodel/useViewModel.js';
import { userBackend } from '../backend/user/UserBackend.js';
import { socialBackend } from '../backend/social/SocialBackend.js';
import SearchUsers from '../components/friends/searchUsers.jsx';
import OutgoingFriendsRequestList from '../components/friends/OutgoingFriendRequestList.jsx';

export default function Friends() {
  const { user } = useAuth();
  const socialVm = useSocialViewModel();

  const [activeTab, setActiveTab] = useState('friends');
  const [newFriendUid, setNewFriendUid] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');

  const [backendSearchResults, setBackendSearchResults] = useState([]);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  const userSearchResults = (() => {
    const q = newFriendUid.trim().toLowerCase();
    if (q === '') return [];
    return allUsers.filter((u) => {
      if (user?.uid && u.uid === user.uid) return false;
      const usernameMatch = u.username?.toLowerCase().includes(q);
      const uidMatch = u.uid?.toLowerCase().includes(q);
      return usernameMatch || uidMatch;
    });
  })();

  useEffect(() => {
    const performSearch = async () => {
      const query = newFriendUid.trim();
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
  }, [newFriendUid, user?.uid]);

  // Initial mock social items for instant visual feedback
  const [friendsList, setFriendsList] = useState([
    { uid: 'user_elena_12', username: 'Elena Rossi', email: 'elena@cameos.app', badge: 'Top Reviewer', mutualCameos: 14 },
    { uid: 'user_marco_44', username: 'Marco Bianchi', email: 'marco@cameos.app', badge: 'Marvel Expert', mutualCameos: 22 },
    { uid: 'user_giulia_ner', username: 'Giulia Neri', email: 'giulia@cameos.app', badge: 'Sci-Fi Fan', mutualCameos: 8 }
  ]);

  const filteredFriends = friendsList.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [incomingRequests, setIncomingRequests] = useState([
    { id: 'req_clara', fromUid: 'user_clara_99', fromUsername: 'Clara Cinefila', sentAt: 'Oggi alle 15:30' },
    { id: 'req_samuele', fromUid: 'user_samuele_7', fromUsername: 'Samuele Filmaker', sentAt: 'Ieri' }
  ]);

  const [outgoingRequests, setOutgoingRequests] = useState([]);

  const [notifications, setNotifications] = useState([
    { id: 'notif_1', text: 'Clara Cinefila ti ha inviato una richiesta di amicizia!', type: 'friend_request', date: 'Oggi' },
    { id: 'notif_2', text: 'A Marco Bianchi piace la tua recensione di Avengers: Endgame', type: 'like', date: 'Ieri' },
    { id: 'notif_3', text: 'Nuovo cameo convalidato in Dune - Parte Due', type: 'cameo_verified', date: '3 giorni fa' }
  ]);

  useEffect(() => {
    const fetchOutgoingFriendRequests = async () => {
      if (!user?.uid) {
        setOutgoingRequests([]);
        return;
      }

      try {
        const requests = await socialBackend.getOutgoingFriendRequests(user.uid);
        console.log('Fetched outgoing friend requests:', requests);
        setOutgoingRequests(Array.isArray(requests) ? requests : []);
      } catch (err) {
        console.error('Errore durante il recupero delle richieste inviate:', err);
        setOutgoingRequests([]);
      }
    };

    fetchOutgoingFriendRequests();
  }, [user?.uid]);

  

  const handleAcceptRequest = async (req) => {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
    setFriendsList((prev) => [
      ...prev,
      {
        uid: req.fromUid,
        username: req.fromUsername,
        email: `${req.fromUsername.toLowerCase().replace(/\s+/g, '')}@cameos.app`,
        badge: 'Nuovo Amico',
        mutualCameos: 1
      }
    ]);

    setFeedbackMsg(`Hai accettato la richiesta di ${req.fromUsername}!`);
    setFeedbackType('success');

    if (user?.uid) {
      try {
        await socialVm.acceptFriendRequest(req.id, user.uid);
      } catch {
        // Handled in local state
      }
    }
  };

  const handleRejectRequest = async (reqId) => {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== reqId));
    setFeedbackMsg('Richiesta rifiutata.');
    setFeedbackType('secondary');

    if (user?.uid) {
      try {
        await socialVm.rejectFriendRequest(reqId, user.uid);
      } catch {
        // Handled in local state
      }
    }
  };

  const handleAddFriend = async (targetUid) => {
    if (!user?.uid) {
      setFeedbackMsg("Impossibile inviare la richiesta: utente non autenticato.");
      setFeedbackType('danger');
      throw new Error('User not authenticated');
    }
    try {
      const result = await socialVm.sendFriendRequest(user.uid, targetUid);
      if (result) {
        setOutgoingRequests((prev) => {
          const exists = prev.some((r) => r.id === result.id || r.toUid === targetUid);
          if (exists) return prev;
          return [
            ...prev,
            result.id
              ? result
              : { id: `${user.uid}_${targetUid}`, toUid: targetUid, sentAt: 'Ora' }
          ];
        });
      }
    } catch (err) {
      console.error('Errore durante l\'invio della richiesta di amicizia:', err);
      setFeedbackMsg(err?.message || "Errore durante l'invio della richiesta di amicizia.");
      setFeedbackType('danger');
      throw err;
    }
  };

  const handleCancelOutgoing = async (reqId) => {
    setOutgoingRequests((prev) => prev.filter((r) => r.id !== reqId));
    setFeedbackMsg('Richiesta di amicizia annullata.');
    setFeedbackType('secondary');

    if (user?.uid) {
      try {
        await socialVm.rejectFriendRequest(reqId, user.uid);
      } catch {
        // Handled in local state
      }
    }
  };

  const handleRemoveFriend = async (friendUid) => {
    const confirmRemove = window.confirm('Sei sicuro di voler rimuovere questo amico?');
    if (!confirmRemove) return;

    setFriendsList((prev) => prev.filter((f) => f.uid !== friendUid));
    setFeedbackMsg('Amico rimosso dalla rete sociale.');
    setFeedbackType('secondary');

    if (user?.uid) {
      try {
        await socialVm.removeFriend(user.uid, friendUid);
      } catch {
        // Handled in local state
      }
    }
  };

  return (
    <div className="friends-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* SOCIAL HEADER */}
      <section className="card-2pxb-dark-background rounded-4 p-4 p-md-5 mb-5 shadow-lg text-white">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="p-3 rounded-circle bg-success bg-opacity-25 text-success fs-3">
                <i className="bi bi-people-fill"></i>
              </div>
              <div>
                <h1 className="h3 fw-bold text-white mb-0">Rete Sociale & Amicizie</h1>
                <p className="text-white-50 small mb-0">
                  Condividi le tue scoperte di camei, scambia opinioni e segui le recensioni dei tuoi amici
                </p>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50">
              <strong className="text-success">{friendsList.length}</strong> Amici
            </span>
            <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50">
              <strong className="text-warning">{incomingRequests.length}</strong> In Arrivo
            </span>
          </div>
        </div>
      </section>

      {/* FEEDBACK ALERT */}
      {feedbackMsg && (
        <div className={`alert alert-${feedbackType} alert-dismissible fade show rounded-4 mb-4`} role="alert">
          <i className="bi bi-info-circle me-2"></i>
          {feedbackMsg}
          <button type="button" className="btn-close" onClick={() => setFeedbackMsg('')} aria-label="Chiudi"></button>
        </div>
      )}

             {/* SEARCH USERS (top) */}
       <SearchUsers outgoingRequests={outgoingRequests} onAddFriend={handleAddFriend} onCancelOutgoing={handleCancelOutgoing} friendsList={friendsList} />

       {/* TABS SEZIONI SOCIALI */}
      <div className="d-flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none border-bottom border-secondary border-opacity-25">
        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'friends' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-person-check-fill me-1"></i> I Miei Amici ({friendsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small position-relative ${
            activeTab === 'incoming' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-envelope-open-fill me-1"></i> Richieste Ricevute
          {incomingRequests.length > 0 && (
            <span className="badge rounded-pill bg-danger ms-2">{incomingRequests.length}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'outgoing' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-send-fill me-1"></i> Inviate ({outgoingRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'notifications' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-bell-fill me-1"></i> Notifiche ({notifications.length})
        </button>
      </div>

      {/* CONTENUTO TAB 1: I MIEI AMICI */}
      {activeTab === 'friends' && (
        <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">Lista Amici</h3>
            <span className="text-white-50 small">{filteredFriends.length} connessioni</span>
          </div>

          {searchQuery.trim() !== '' && filteredFriends.length === 0 ? (
            <div className="card-2pxb-dark-background rounded-4 p-5 text-center text-white-50">
              <i className="bi bi-search text-secondary fs-1 mb-3 d-inline-block"></i>
              <p className="mb-0">Nessun utente corrisponde ai criteri di ricerca</p>
            </div>
          ) : (
            <div className="row g-3">
              {filteredFriends.map((f) => (
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
      )}

      {/* CONTENUTO TAB 2: RICHIESTE RICEVUTE */}
      {activeTab === 'incoming' && (
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
                        <small className="text-white-50">Inviata: {req.sentAt}</small>
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
      )}

      {/* CONTENUTO TAB 3: RICHIESTE INVIATE */}
      {activeTab === 'outgoing' && (
        <OutgoingFriendsRequestList outgoingRequests={outgoingRequests} onCancelOutgoing={handleCancelOutgoing} />
      )}


      {/* CONTENUTO TAB 5: NOTIFICHE */}
      {activeTab === 'notifications' && (
        <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">Centro Notifiche</h3>
            <button
              type="button"
              onClick={() => setNotifications([])}
              className="btn btn-sm btn-link text-white-50 text-decoration-none"
            >
              Segna tutte come lette
            </button>
          </div>

          <div className="d-flex flex-column gap-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="card-2pxb-dark-background rounded-4 p-3 p-md-4 text-white d-flex align-items-center justify-content-between shadow-sm"
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 rounded-circle bg-success bg-opacity-25 text-success fs-4">
                    <i className="bi bi-bell-fill"></i>
                  </div>
                  <div>
                    <p className="mb-0 fw-semibold text-white">{n.text}</p>
                    <small className="text-white-50">{n.date}</small>
                  </div>
                </div>

                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 rounded-pill px-3 py-1 small">
                  Nuova
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
