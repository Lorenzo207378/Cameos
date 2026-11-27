import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useNetwork } from '../contexts/NetworkContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSocialViewModel } from '../viewmodel/index.js';
import { useElementOuterHeight, useGoBack } from '../utils/domUtils.js';
import { preloadImages } from '../utils/imageUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import SpotlightCard from '../components/reactbits/SpotlightCard.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import SearchUsers from '../components/friends/SearchUsers.jsx';
import FriendsSearchPanel from '../components/friends/FriendsSearchPanel.jsx';
import FriendsList from '../components/friends/FriendsList.jsx';
import IncomingFriendRequestList from '../components/friends/IncomingFriendRequestList.jsx';
import OutgoingFriendRequestList from '../components/friends/OutgoingFriendRequestList.jsx';
import '../css/common/text.css';
import '../css/common/elements.css';
import '../css/common/carouselControls.css';
import '../css/pages/friends.css';

export default function Friends() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { isMobile } = useDevice();
  const { isOffline } = useNetwork();
  const { t, normalizedLang, formatTranslation } = useTranslation();
  const goBack = useGoBack(APP_ROUTES.profile);
  const socialVm = useSocialViewModel({ language: normalizedLang });

  const {
    loadSocialData,
    searchUsers,
    clearSearch,
    clearError,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    friendsProfiles,
    incomingRequests,
    outgoingRequests,
    searchResults,
    isSearching,
    searchError,
    searchQuery: lastSearchQuery,
    loading: vmLoading,
    error: vmError
  } = socialVm;

  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');
  const searchInputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
  const navbarOffset = useElementOuterHeight('.navbar-top-bar', !isMobile);

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (!user?.uid) return;
    if (isOffline) {
      clearError();
      return;
    }
    void loadSocialData(user.uid);
  }, [user?.uid, isOffline, loadSocialData, clearError]);

  const filteredFriends = friendsProfiles.filter((f) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (f.username || '').toLowerCase().includes(query)
      || (f.email || '').toLowerCase().includes(query);
  });

  const handleAcceptRequest = async (req) => {
    if (!user?.uid || !req?.id) return;
    setFeedbackMsg('');
    clearError();
    try {
      const res = await acceptFriendRequest(req.id, user.uid);
      if (res) {
        const preloadUrl = res?.senderProfile?.photoURL || req.fromPhotoURL;
        if (preloadUrl) {
          preloadImages([preloadUrl], () => {}, { referrerPolicy: 'no-referrer' });
        }
        setFeedbackMsg(
          formatTranslation(t('social.acceptedRequestMsg'), {
            name: req.fromUsername || t('social.friendFallback')
          })
        );
        setFeedbackType('success');
      }
    } catch (err) {
      setFeedbackMsg(err?.message || t('common.error'));
      setFeedbackType('danger');
    }
  };

  const handleRejectRequest = async (reqId) => {
    if (!user?.uid || !reqId) return;
    setFeedbackMsg('');
    clearError();
    try {
      const ok = await rejectFriendRequest(reqId, user.uid);
      if (ok) {
        setFeedbackMsg(t('social.rejectedRequestMsg'));
        setFeedbackType('secondary');
      }
    } catch (err) {
      setFeedbackMsg(err?.message || t('common.error'));
      setFeedbackType('danger');
    }
  };

  /**
   * @param {string} targetUid
   * @param {import('../models/User.js').User} [targetUser]
   * @returns {Promise<Object>}
   */
  const handleAddFriend = async (targetUid, targetUser = undefined) => {
    if (!user?.uid) {
      setFeedbackMsg(t('common.error'));
      setFeedbackType('danger');
      throw new Error('User not authenticated');
    }

    setFeedbackMsg('');
    clearError();

    const result = await sendFriendRequest(user.uid, targetUid, {
      fromUsername: userProfile?.username || user.displayName || t('nav.user'),
      fromPhotoURL: userProfile?.photoURL || user.photoURL || null,
      toUsername: targetUser?.username || null
    });

    if (result) {
      setFeedbackMsg(t('social.requestSentSuccess'));
      setFeedbackType('success');
      return result;
    }

    const message = socialVm.viewModel.state.error || t('common.error');
    setFeedbackMsg(message);
    setFeedbackType('danger');
    throw new Error(message);
  };

  const handleCancelOutgoing = async (reqId) => {
    if (!user?.uid || !reqId) return;
    setFeedbackMsg('');
    clearError();
    try {
      const ok = await rejectFriendRequest(reqId, user.uid);
      if (ok) {
        setFeedbackMsg(t('social.cancelledRequestMsg'));
        setFeedbackType('secondary');
      }
    } catch (err) {
      setFeedbackMsg(err?.message || t('common.error'));
      setFeedbackType('danger');
    }
  };

  const handleRemoveFriend = async (friendUid) => {
    if (!user?.uid || !friendUid) return;
    const friend = friendsProfiles.find((f) => f.uid === friendUid);
    const confirmDelete = window.confirm(
      formatTranslation(t('social.removeFriendConfirm'), {
        name: friend?.username || t('social.friendFallback')
      })
    );
    if (!confirmDelete) return;

    setFeedbackMsg('');
    clearError();

    try {
      const updated = await removeFriend(user.uid, friendUid);
      if (updated) {
        setFeedbackMsg(t('social.friendRemovedMsg'));
        setFeedbackType('secondary');
      }
    } catch (err) {
      setFeedbackMsg(err?.message || t('common.error'));
      setFeedbackType('danger');
    }
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="friends-page d-flex justify-content-center align-items-center flex-grow-1">
        <SpotlightCard
          spotlightColor="rgba(16, 185, 129, 0.22)"
          spotlightSize={260}
          intensity={0.2}
          borderGlow={0.65}
          className="friends-guest-card glass-card card-border-primary text-center"
        >
          <Card className="border-0 bg-transparent text-white">
            <Card.Body className="p-0">
              <i className="bi bi-people-fill text-success d-block friends-guest-icon" aria-hidden="true" />
              <Card.Title className="fw-bold friends-guest-title mb-2">{t('nav.friends')}</Card.Title>
              <Card.Text className="text-white-50 friends-guest-text">{t('profile.notLoggedInText')}</Card.Text>
              <Link to={APP_ROUTES.login} className="btn btn-success rounded-pill fw-semibold friends-guest-btn">
                {t('nav.login')}
              </Link>
            </Card.Body>
          </Card>
        </SpotlightCard>
      </div>
    );
  }

  const tabs = [
    {
      id: 'friends',
      icon: 'bi-person-check-fill',
      label: t('social.friendsTab'),
      count: friendsProfiles.length,
      showBadge: true,
      isLive: false
    },
    {
      id: 'incoming',
      icon: 'bi-envelope-open-fill',
      label: t('social.receivedRequestsTab'),
      count: incomingRequests.length,
      showBadge: incomingRequests.length > 0,
      isLive: true
    },
    {
      id: 'outgoing',
      icon: 'bi-send-fill',
      label: t('social.sentRequestsTab'),
      count: outgoingRequests.length,
      showBadge: outgoingRequests.length > 0,
      isLive: false
    }
  ];

  const offlineAlertMsg = isOffline ? t('social.offlineNotice') : '';
  const activeAlertMsg = offlineAlertMsg || vmError || feedbackMsg;
  const activeAlertVariant = offlineAlertMsg || vmError ? 'danger' : feedbackType;
  const splitStyle = !isMobile
    ? /** @type {import('react').CSSProperties} */ ({ '--friends-navbar-offset': `${navbarOffset}px` })
    : undefined;

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
      aria-label={t('detail.goBack')}
      title={t('detail.goBack')}
    >
      <i className="bi bi-arrow-left text-white" aria-hidden="true" />
    </button>
  );

  return (
    <div
      className={`friends-page w-100${!isMobile ? ' friends-page--split' : ''}`}
      style={splitStyle}
    >
      <div className="friends-split-layout w-100">
        <div className="friends-main-column scrollbar-none">
          {isMobile ? (
            <header className="friends-header">
              <div className="friends-header-bar d-flex flex-column flex-sm-row align-items-stretch align-items-sm-start justify-content-sm-between">
                {backButton}

                <div className="friends-hero-search w-100 ms-sm-auto">
                  <SearchUsers
                    inputRef={searchInputRef}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    searchResults={searchResults}
                    isSearching={isSearching}
                    searchError={isOffline ? offlineAlertMsg : searchError}
                    lastSearchQuery={lastSearchQuery}
                    onSearchUsers={searchUsers}
                    onClearSearch={clearSearch}
                    outgoingRequests={outgoingRequests}
                    onAddFriend={handleAddFriend}
                    onCancelOutgoing={handleCancelOutgoing}
                    friendsList={friendsProfiles}
                  />
                </div>
              </div>
            </header>
          ) : (
            <div className="friends-top-bar d-flex align-items-center justify-content-between gap-3 mb-3">
              {backButton}
            </div>
          )}

          {activeAlertMsg && (
            <div
              className={`alert alert-${activeAlertVariant} ${offlineAlertMsg ? '' : 'alert-dismissible '}fade show rounded-4 friends-alert`}
              role="alert"
            >
              <i className={`bi ${offlineAlertMsg ? 'bi-wifi-off' : 'bi-info-circle'} me-2`} aria-hidden="true" />
              {activeAlertMsg}
              {!offlineAlertMsg && (
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setFeedbackMsg('');
                    clearError();
                  }}
                  aria-label={t('common.close')}
                />
              )}
            </div>
          )}

          <div className="friends-tabs-bar overflow-x-auto scrollbar-none border-bottom border-secondary border-opacity-25">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`btn rounded-pill fw-semibold friends-tab-btn ${
                  activeTab === tab.id ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
                }`}
              >
                <i className={`bi ${tab.icon} me-2`} aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.showBadge && (
                  <span className={`friends-tab-badge ${tab.isLive ? 'friends-tab-badge-live' : ''}`.trim()}>
                    {tab.isLive && <span className="friends-tab-live-dot" aria-hidden="true" />}
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {vmLoading && friendsProfiles.length === 0 && incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
            <div className="glass-panel friends-empty-card" role="status">
              <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
              <span className="friends-state-text">{t('common.loading')}</span>
            </div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <FriendsList
                  friendsList={filteredFriends}
                  handleRemoveFriend={handleRemoveFriend}
                  onFocusSearch={isMobile ? handleFocusSearch : undefined}
                />
              )}

              {activeTab === 'incoming' && (
                <IncomingFriendRequestList
                  incomingRequests={incomingRequests}
                  onAcceptRequest={handleAcceptRequest}
                  onRejectRequest={handleRejectRequest}
                />
              )}

              {activeTab === 'outgoing' && (
                <OutgoingFriendRequestList
                  outgoingRequests={outgoingRequests}
                  onCancelOutgoing={handleCancelOutgoing}
                />
              )}
            </>
          )}
        </div>

        {!isMobile && (
          <div className="friends-search-column d-flex">
            <FriendsSearchPanel />
          </div>
        )}
      </div>
    </div>
  );
}
