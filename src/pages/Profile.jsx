import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUserViewModel } from '../viewmodel/useViewModel.js';
import MediaCard from '../components/MediaCard.jsx';
import { CATALOG_MOVIES, CATALOG_SERIES, INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';

export default function Profile() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const userVm = useUserViewModel({ initialUser: user });

  const [activeTab, setActiveTab] = useState('watchlist');
  const [currentLang, setCurrentLang] = useState('it-IT');

  // Fallback demo items if user list is empty
  const demoWatchlist = CATALOG_MOVIES.slice(0, 3);
  const demoFavorites = [CATALOG_MOVIES[0], CATALOG_SERIES[0]];
  const demoWatched = [CATALOG_MOVIES[1], CATALOG_SERIES[1]];
  const demoReviews = INITIAL_COMMUNITY_REVIEWS.slice(0, 2);

  const username = userProfile?.username || user?.displayName || 'Cinefilo Cameos';
  const email = user?.email || 'utente@cameos.app';
  const userInitial = username.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/Cameos/login');
    } catch {
      navigate('/Cameos/login');
    }
  };

  const handleSwitchLanguage = (lang) => {
    setCurrentLang(lang);
    if (userVm.uid) {
      userVm.switchLanguage(lang).catch(() => {});
    }
  };

  return (
    <div className="profile-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* HEADER PROFILO UTENTE */}
      <section className="card-2pxb-dark-background rounded-4 p-4 p-md-5 mb-5 shadow-lg text-white">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4">
          <div className="d-flex align-items-center gap-4">
            {/* AVATAR CIRCOLARE */}
            <div
              className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center shadow-lg border border-success border-opacity-50"
              style={{ width: '80px', height: '80px', fontSize: '32px' }}
            >
              {userInitial}
            </div>

            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h1 className="h3 fw-bold text-white mb-0">{username}</h1>
                <span className="badge rounded-pill bg-success px-2 py-1 small">Membro VIP</span>
              </div>
              <p className="text-white-50 small mb-2">{email}</p>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className="badge bg-dark text-success border border-success border-opacity-25 px-2 py-1 small d-flex align-items-center gap-1">
                  <i className="bi bi-cloud-check-fill"></i> Sincronizzato con Cloud
                </span>
                <button
                  type="button"
                  onClick={() => handleSwitchLanguage(currentLang === 'it-IT' ? 'en-US' : 'it-IT')}
                  className="btn btn-sm btn-dark text-white-50 border-secondary border-opacity-25 rounded-pill px-3 py-0"
                  style={{ fontSize: '11px' }}
                >
                  <i className="bi bi-translate me-1"></i> Lingua: {currentLang}
                </button>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-outline-danger rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
            >
              <i className="bi bi-box-arrow-right"></i> Disconnetti
            </button>
          </div>
        </div>

        {/* COUNTER STATISTICHE RAPIDE */}
        <div className="row g-3 mt-4 pt-4 border-top border-secondary border-opacity-25">
          <div className="col-6 col-sm-3 col-lg-2">
            <div className="p-3 rounded-3 bg-dark bg-opacity-50 text-center border border-secondary border-opacity-25">
              <div className="h4 fw-bold text-success mb-0">{demoWatchlist.length}</div>
              <small className="text-white-50">In Watchlist</small>
            </div>
          </div>
          <div className="col-6 col-sm-3 col-lg-2">
            <div className="p-3 rounded-3 bg-dark bg-opacity-50 text-center border border-secondary border-opacity-25">
              <div className="h4 fw-bold text-warning mb-0">{demoFavorites.length}</div>
              <small className="text-white-50">Preferiti</small>
            </div>
          </div>
          <div className="col-6 col-sm-3 col-lg-2">
            <div className="p-3 rounded-3 bg-dark bg-opacity-50 text-center border border-secondary border-opacity-25">
              <div className="h4 fw-bold text-info mb-0">{demoWatched.length}</div>
              <small className="text-white-50">Visti</small>
            </div>
          </div>
          <div className="col-6 col-sm-3 col-lg-2">
            <div className="p-3 rounded-3 bg-dark bg-opacity-50 text-center border border-secondary border-opacity-25">
              <div className="h4 fw-bold text-white mb-0">{demoReviews.length}</div>
              <small className="text-white-50">Recensioni</small>
            </div>
          </div>
        </div>
      </section>

      {/* TABS SEZIONI PROFILO */}
      <div className="d-flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none border-bottom border-secondary border-opacity-25">
        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'watchlist' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-bookmark-fill me-1"></i> Watchlist ({demoWatchlist.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'favorites' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-star-fill me-1"></i> Preferiti ({demoFavorites.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('watched')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'watched' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-check-circle-fill me-1"></i> Già Visti ({demoWatched.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`btn rounded-pill px-4 py-2 fw-semibold small ${
            activeTab === 'reviews' ? 'btn-success' : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className="bi bi-chat-left-text-fill me-1"></i> Le Mie Recensioni ({demoReviews.length})
        </button>
      </div>

      {/* CONTENUTO TAB WATCHLIST */}
      {activeTab === 'watchlist' && (
        <section>
          <h3 className="h4 text-white fw-bold mb-3">Film e Serie da Vedere</h3>
          <div className="row g-3">
            {demoWatchlist.map((item) => (
              <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={item.id}>
                <MediaCard item={item} type={item.title ? 'movie' : 'tv'} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTENUTO TAB PREFERITI */}
      {activeTab === 'favorites' && (
        <section>
          <h3 className="h4 text-white fw-bold mb-3">I Tuoi Titoli Preferiti</h3>
          <div className="row g-3">
            {demoFavorites.map((item) => (
              <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={item.id}>
                <MediaCard item={item} type={item.title ? 'movie' : 'tv'} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTENUTO TAB VISTI */}
      {activeTab === 'watched' && (
        <section>
          <h3 className="h4 text-white fw-bold mb-3">Cronologia Titoli Visti</h3>
          <div className="row g-3">
            {demoWatched.map((item) => (
              <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={item.id}>
                <MediaCard item={item} type={item.title ? 'movie' : 'tv'} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTENUTO TAB RECENSIONI */}
      {activeTab === 'reviews' && (
        <section>
          <h3 className="h4 text-white fw-bold mb-3">Recensioni Pubblicate da Te</h3>
          <div className="row g-3">
            {demoReviews.map((rev) => (
              <div className="col-12 col-md-6" key={rev.id}>
                <div className="card-2pxb-dark-background rounded-4 p-4 text-white h-100 d-flex flex-column justify-content-between shadow-sm">
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-success rounded-pill small">
                        {rev.mediaType === 'movie' ? 'Film' : 'Serie TV'}
                      </span>
                      <div className="text-warning small">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <i
                            key={i}
                            className={`bi ${i < rev.rating ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}`}
                          ></i>
                        ))}
                      </div>
                    </div>
                    <p className="text-white-50 small mb-3">"{rev.text}"</p>
                  </div>
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 small text-white-50">
                    <span>
                      <i className="bi bi-heart-fill text-danger me-1"></i> {rev.likes?.length || 0} Mi piace
                    </span>
                    <span className="badge bg-dark text-white-50 border border-secondary border-opacity-25">
                      Attiva
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
