import { formatTranslation } from '../utils/translationUtils.js';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocialViewModel } from '../viewmodel/useViewModel.js';
import { useTranslation } from '../utils/translations.js';

export default function Friends() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const socialVm = useSocialViewModel();

  const [activeTab, setActiveTab] = useState('friends');
  const [newFriendUid, setNewFriendUid] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');

  // Initial mock social items for instant visual feedback
  const [friendsList, setFriendsList] = useState([
    { uid: 'user_elena_12', username: 'Elena Rossi', email: 'elena@cameos.app', badge: 'Top Reviewer', mutualCameos: 14 },
    { uid: 'user_marco_44', username: 'Marco Bianchi', email: 'marco@cameos.app', badge: 'Marvel Expert', mutualCameos: 22 },
    { uid: 'user_giulia_ner', username: 'Giulia Neri', email: 'giulia@cameos.app', badge: 'Sci-Fi Fan', mutualCameos: 8 }
  ]);

  const [incomingRequests, setIncomingRequests] = useState([
    { id: 'req_clara', fromUid: 'user_clara_99', fromUsername: 'Clara Cinefila', sentAt: 'Oggi alle 15:30' },
    { id: 'req_samuele', fromUid: 'user_samuele_7', fromUsername: 'Samuele Filmaker', sentAt: 'Ieri' }
  ]);

  const [outgoingRequests, setOutgoingRequests] = useState([
    { id: 'req_out_luca', toUid: 'user_luca_88', toUsername: 'Luca BingeWatcher', sentAt: '2 giorni fa' }
  ]);

  const [notifications, setNotifications] = useState([
    { id: 'notif_1', text: 'Clara Cinefila ti ha inviato una richiesta di amicizia!', type: 'friend_request', date: 'Oggi' },
    { id: 'notif_2', text: 'A Marco Bianchi piace la tua recensione di Avengers: Endgame', type: 'like', date: 'Ieri' },
    { id: 'notif_3', text: 'Nuovo cameo convalidato in Dune - Parte Due', type: 'cameo_verified', date: '3 giorni fa' }
  ]);

  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    if (!newFriendUid.trim()) return;

    const targetUid = newFriendUid.trim();

    // Prevent duplicate request
    if (friendsList.some((f) => f.uid === targetUid || f.username.toLowerCase() === targetUid.toLowerCase())) {
      setFeedbackMsg(t('social.alreadyFriendError'));
      setFeedbackType('danger');
      return;
    }

    if (outgoingRequests.some((r) => r.toUid === targetUid)) {
      setFeedbackMsg(t('social.requestAlreadySentError'));
      setFeedbackType('warning');
      return;
    }

    const newRequest = {
      id: `req_out_${Date.now()}`,
      toUid: targetUid,
      toUsername: targetUid,
      sentAt: 'Adesso'
    };

    setOutgoingRequests((prev) => [newRequest, ...prev]);
    setFeedbackMsg(t('social.requestSentSuccess'));
    setFeedbackType('success');
    setNewFriendUid('');

    if (user?.uid) {
      try {
        await socialVm.sendFriendRequest(user.uid, targetUid, {
          senderUsername: user.displayName || t('nav.user')
        });
      } catch {
        // Fallback handled in local state
      }
    }
  };

  const handleAcceptRequest = async (req) => {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));
    setFriendsList((prev) => [
      ...prev,
      {
        uid: req.fromUid,
        username: req.fromUsername,
        email: `${req.fromUsername.toLowerCase().replace(/\s+/g, '')}@cameos.app`,
        badge: t('social.newFriendBadge'),
        mutualCameos: 1
      }
    ]);

    setFeedbackMsg(formatTranslation(t('social.acceptedRequestMsg'), { name: req.fromUsername }));
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
    setFeedbackMsg(t('social.rejectedRequestMsg'));
    setFeedbackType('secondary');

    if (user?.uid) {
      try {
        await socialVm.rejectFriendRequest(reqId, user.uid);
      } catch {
        // Handled in local state
      }
    }
  };

  const handleCancelOutgoing = (reqId) => {
    setOutgoingRequests((prev) => prev.filter((r) => r.id !== reqId));
    setFeedbackMsg(t('social.cancelledRequestMsg'));
    setFeedbackType('secondary');
  };

  const handleRemoveFriend = async (friendUid) => {
    const friend = friendsList.find((f) => f.uid === friendUid);
    const confirmDelete = window.confirm(formatTranslation(t('social.removeFriendConfirm'), { name: friend?.username || t('social.friendFallback') }));
    if (!confirmDelete) return;

    setFriendsList((prev) => prev.filter((f) => f.uid !== friendUid));
    setFeedbackMsg(t('social.friendRemovedMsg'));
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
                <h1 className="h3 fw-bold text-white mb-0">{t('social.friendsTab')} & {t('nav.brand')}</h1>
                <p className="text-white-50 small mb-0">
                  Condividi le tue scoperte di camei, scambia opinioni e segui le recensioni dei tuoi amici
                </p>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50">
              <strong className="text-success">{friendsList.length}</strong> {t('profile.friendsTab')}
            </span>
            <span className="badge rounded-pill bg-dark border border-secondary border-opacity-25 px-3 py-2 text-white-50">
              <strong className="text-warning">{incomingRequests.length}</strong> {t('social.receivedRequestsTab')}
            </span>
          </div>
        </div>
      </section>

      {/* FEEDBACK ALERT */}
      {feedbackMsg && (
        <div className={`alert alert-${feedbackType} alert-dismissible fade show rounded-4 mb-4`} role="alert">
          <i className="bi bi-info-circle me-2"></i>
          {feedbackMsg}
          <button type="button" className="btn-close" onClick={() => setFeedbackMsg('')} aria-label={t('common.close')}></button>
        </div>
      )}

      {/* TABS SEZIONI SOCIALI */}
      <div className="d-flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none border-bottom border-secondary border-opacity-25">
        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'friends' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-person-check-fill me-1"></i> {t('social.friendsTab')} ({friendsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small position-relative ${
            activeTab === 'incoming' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-envelope-open-fill me-1"></i> {t('social.receivedRequestsTab')}
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
          <i className="bi bi-send-fill me-1"></i> {t('social.sentRequestsTab')} ({outgoingRequests.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('add')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'add' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-person-plus-fill me-1"></i> {t('social.addFriendCardTitle')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'notifications' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-bell-fill me-1"></i> {t('social.notificationsTab')} ({notifications.length})
        </button>
      </div>

      {/* CONTENUTO TAB 1: I MIEI AMICI */}
      {activeTab === 'friends' && (
        <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">{t('social.friendsTab')}</h3>
            <span className="text-white-50 small">{friendsList.length} connessioni</span>
          </div>

          <div className="row g-3">
            {friendsList.map((f) => (
              <div className="col-12 col-md-6 col-lg-4" key={f.uid}>
                <div className="card-2pxb-dark-background rounded-4 p-4 text-white d-flex flex-column justify-content-between h-100 shadow-sm hover-scale">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '3rem', height: '3rem', fontSize: '1.125rem' }}
                    >
                      {f.username.charAt(0)}
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
                        <i className="bi bi-stars me-1"></i> {formatTranslation(t('social.mutualCameos'), { count: f.mutualCameos })}
                      </small>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-25">
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(f.uid)}
                      className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <i className="bi bi-person-x me-1"></i> {t('social.removeFriend')}
                    </button>
                    <span className="badge bg-dark text-success border border-success border-opacity-25 px-2 py-1 small">
                      Amico Attivo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTENUTO TAB 2: RICHIESTE RICEVUTE */}
      {activeTab === 'incoming' && (
        <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">{t('social.receivedRequestsTab')}</h3>
            <span className="text-white-50 small">{incomingRequests.length} in attesa di risposta</span>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="card-2pxb-dark-background rounded-4 p-5 text-center text-white-50">
              <i className="bi bi-inbox text-secondary fs-1 mb-3 d-inline-block"></i>
              <p className="mb-0">{t('social.noIncomingRequests')}</p>
            </div>
          ) : (
            <div className="row g-3">
              {incomingRequests.map((req) => (
                <div className="col-12 col-md-6" key={req.id}>
                  <div className="card-2pxb-dark-background rounded-4 p-4 text-white d-flex flex-column justify-content-between shadow-sm">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div
                        className="rounded-circle bg-warning text-dark fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '3rem', height: '3rem', fontSize: '1.125rem' }}
                      >
                        {req.fromUsername.charAt(0)}
                      </div>
                      <div>
                        <h4 className="h6 fw-bold text-white mb-1">{req.fromUsername}</h4>
                        <small className="text-white-50">{formatTranslation(t('social.sentOn'), { date: req.sentAt })}</small>
                      </div>
                    </div>

                    <div className="d-flex gap-2 pt-3 border-top border-secondary border-opacity-25 justify-content-end">
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req.id)}
                        className="btn btn-sm btn-outline-danger rounded-pill px-4 py-2 fw-semibold"
                      >
                        <i className="bi bi-x-circle me-1"></i> {t('social.declineBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        className="btn btn-sm btn-success rounded-pill px-4 py-2 fw-bold shadow-sm"
                      >
                        <i className="bi bi-check-circle me-1"></i> {t('social.acceptBtn')}
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
        <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">{t('social.sentRequestsTab')}</h3>
            <span className="text-white-50 small">{outgoingRequests.length} in attesa</span>
          </div>

          {outgoingRequests.length === 0 ? (
            <div className="card-2pxb-dark-background rounded-4 p-5 text-center text-white-50">
              <i className="bi bi-send text-secondary fs-1 mb-3 d-inline-block"></i>
              <p className="mb-0">{t('social.noPendingRequests')}</p>
            </div>
          ) : (
            <div className="row g-3">
              {outgoingRequests.map((req) => (
                <div className="col-12 col-md-6" key={req.id}>
                  <div className="card-2pxb-dark-background rounded-4 p-4 text-white d-flex align-items-center justify-content-between shadow-sm">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle bg-secondary text-white fw-bold d-flex align-items-center justify-content-center"
                        style={{ width: '2.5rem', height: '2.5rem' }}
                      >
                        {req.toUsername.charAt(0).toUpperCase()}
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
                      style={{ fontSize: '0.75rem' }}
                    >
                      {t('social.cancelRequestBtn')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CONTENUTO TAB 4: TROVA AMICI */}
      {activeTab === 'add' && (
        <section className="card-2pxb-dark-background rounded-4 p-4 p-md-5 shadow-lg text-white">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <h3 className="h4 fw-bold text-white mb-2">{t('social.addFriendCardTitle')}</h3>
              <p className="text-white-50 mb-4" style={{ lineHeight: '1.6' }}>
                {t('social.noFriendsSub')}
              </p>

              <form onSubmit={handleSendFriendRequest} className="d-flex flex-column flex-sm-row gap-2">
                <input
                  type="text"
                  placeholder={t('social.addFriendInputPlaceholder')}
                  className="form-control rounded-pill px-4 py-2"
                  value={newFriendUid}
                  onChange={(e) => setNewFriendUid(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-success rounded-pill px-4 py-2 fw-bold text-nowrap shadow-sm">
                  <i className="bi bi-person-plus-fill me-1"></i> {t('social.sendRequestBtn')}
                </button>
              </form>
            </div>

            <div className="col-lg-6">
              <div className="rounded-4 p-4 bg-dark bg-opacity-50 border border-secondary border-opacity-25">
                <h4 className="h6 fw-bold text-success text-uppercase mb-3">
                  <i className="bi bi-shield-check me-2"></i> {t('social.socialRulesTitle')}
                </h4>
                <ul className="list-unstyled mb-0 d-flex flex-column gap-2 small text-white-50">
                  <li>{t('social.guideRule1')}</li>
                  <li>{t('social.guideRule2')}</li>
                  <li>{t('social.guideRule3')}</li>
                  <li>{t('social.guideRule4')}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTENUTO TAB 5: NOTIFICHE */}
      {activeTab === 'notifications' && (
        <section>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="h4 text-white fw-bold mb-0">{t('social.notificationsTab')}</h3>
            <button
              type="button"
              onClick={() => setNotifications([])}
              className="btn btn-sm btn-link text-white-50 text-decoration-none"
            >
              Segna tutte come lette
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="card-2pxb-dark-background rounded-4 p-5 text-center text-white-50">
              <i className="bi bi-bell-slash text-secondary fs-1 mb-3 d-inline-block"></i>
              <p className="mb-0">{t('social.noNotifications')}</p>
            </div>
          ) : (
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
          )}
        </section>
      )}
    </div>
  );
}
