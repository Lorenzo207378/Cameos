import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocialViewModel } from '../viewmodel/useViewModel.js';
import { userBackend } from '../backend/user/UserBackend.js';

import SearchUsers from '../components/friends/SearchUsers.jsx';
import FriendsList from '../components/friends/FriendsList.jsx';
import IncomingFriendRequestList from '../components/friends/IncomingFriendRequestList.jsx';
import OutgoingFriendsRequestList from '../components/friends/OutgoingFriendRequestList.jsx';

export default function Friends() {
  const { user } = useAuth();
  const socialVm = useSocialViewModel();

  const [activeTab, setActiveTab] = useState('friends');
  const [newFriendUid, setNewFriendUid] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [backendSearchResults, setBackendSearchResults] = useState([]);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

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

  const [friendsList, setFriendsList] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.uid) {
        setFriendsList([]);
        return;
      }
      try {
        const profiles = await socialVm.loadFriendsProfiles(user.uid);
        setFriendsList(Array.isArray(profiles) ? profiles : []);
      } catch (err) {
        console.error('Errore durante il recupero degli amici:', err);
        setFriendsList([]);
      }
    };
    fetchFriends();
  }, [user?.uid, socialVm.viewModel]);

  const filteredFriends = friendsList.filter((f) =>
    (f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);

  useEffect(() => {
    const fetchSocialData = async () => {
      if (!user?.uid) {
        setIncomingRequests([]);
        setOutgoingRequests([]);
        return;
      }

      try {
        const socialData = await socialVm.loadSocialData(user.uid);
        if (socialData) {
          setIncomingRequests(Array.isArray(socialData.incomingRequests) ? socialData.incomingRequests : []);
          setOutgoingRequests(Array.isArray(socialData.outgoingRequests) ? socialData.outgoingRequests : []);
        } else {
          setIncomingRequests(Array.isArray(socialVm.incomingRequests) ? socialVm.incomingRequests : []);
          setOutgoingRequests(Array.isArray(socialVm.outgoingRequests) ? socialVm.outgoingRequests : []);
        }
      } catch (err) {
        console.error('Errore durante il recupero delle richieste di amicizia:', err);
        setIncomingRequests(Array.isArray(socialVm.incomingRequests) ? socialVm.incomingRequests : []);
        setOutgoingRequests(Array.isArray(socialVm.outgoingRequests) ? socialVm.outgoingRequests : []);
      }
    };

    fetchSocialData();
  }, [user?.uid, socialVm.viewModel]);

  

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

       <SearchUsers 
        outgoingRequests={outgoingRequests} 
        onAddFriend={handleAddFriend} 
        onCancelOutgoing={handleCancelOutgoing} 
        friendsList={friendsList} 
      />

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
          <i className="bi bi-envelope-open-fill me-1"></i> Richieste Ricevute ({incomingRequests.length})
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
      </div>

      {activeTab === 'friends' && (
        <FriendsList 
        friendsList={filteredFriends} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        handleRemoveFriend={handleRemoveFriend} />
      )}

      {activeTab === 'incoming' && (
        <IncomingFriendRequestList 
          incomingRequests={incomingRequests} 
          onAcceptRequest={handleAcceptRequest} 
          onRejectRequest={handleRejectRequest} 
        />
      )}

      {activeTab === 'outgoing' && (
        <OutgoingFriendsRequestList 
          outgoingRequests={outgoingRequests} 
          onCancelOutgoing={handleCancelOutgoing} 
        />
      )}

    </div>
  );
}
