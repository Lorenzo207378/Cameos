import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useUserViewModel } from '../viewmodel/useViewModel.js';
import { normalizeMediaReference } from '../models/modelUtils.js';

/**
 * MediaPreferencesBar
 * Barra pulsanti interattivi per le preferenze utente:
 * - Like con conteggio
 * - Watchlist (Aggiungi/Rimuovi)
 * - Preferiti (Aggiungi/Rimuovi)
 * - Visto (Aggiungi/Rimuovi)
 * - Pulsante "Scrivi Recensione"
 *
 * @param {Object} props
 * @param {Object|string|number} props.target - Media target (Movie, Series, Season, Episode o targetKey)
 * @param {Function} [props.onOpenReviewModal]
 */
export default function MediaPreferencesBar({ target, onOpenReviewModal }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userVm = useUserViewModel({ initialUser: user });

  const targetInfo = useMemo(() => {
    try {
      return normalizeMediaReference(target);
    } catch {
      return null;
    }
  }, [target]);

  // Local state fallbacks if guest or offline
  const [localLiked, setLocalLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(42);
  const [localWatchlist, setLocalWatchlist] = useState(false);
  const [localFavorites, setLocalFavorites] = useState(false);
  const [localWatched, setLocalWatched] = useState(false);

  // Derived preference states
  const activeUser = userVm?.currentUser || userVm?.state?.currentUser || null;
  const watchlist = userVm?.watchlist || userVm?.state?.watchlist || [];
  const favorites = userVm?.favorites || userVm?.state?.favorites || [];
  const watched = userVm?.watched || userVm?.state?.watched || [];

  const inWatchlist = activeUser && targetInfo
    ? watchlist.some((w) => w.targetKey === targetInfo.targetKey)
    : localWatchlist;

  const inFavorites = activeUser && targetInfo
    ? favorites.some((f) => f.targetKey === targetInfo.targetKey)
    : localFavorites;

  const isWatched = activeUser && targetInfo
    ? watched.some((w) => w.targetKey === targetInfo.targetKey)
    : localWatched;

  const requireAuthOrGuest = (action) => {
    if (!user) {
      const proceed = window.confirm('Effettua il login per sincronizzare le tue preferenze su cloud. Vuoi accedere ora?');
      if (proceed) {
        navigate('/Cameos/login');
        return false;
      }
    }
    action();
    return true;
  };

  const handleToggleLike = () => {
    requireAuthOrGuest(() => {
      setLocalLiked((prev) => !prev);
      setLikeCount((prev) => (localLiked ? prev - 1 : prev + 1));
    });
  };

  const handleToggleWatchlist = async () => {
    requireAuthOrGuest(async () => {
      setLocalWatchlist((prev) => !prev);
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleWatchlist(targetInfo);
        } catch {
          // Handled in local state
        }
      }
    });
  };

  const handleToggleFavorite = async () => {
    requireAuthOrGuest(async () => {
      setLocalFavorites((prev) => !prev);
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleFavorite(targetInfo);
        } catch {
          // Handled in local state
        }
      }
    });
  };

  const handleToggleWatched = async () => {
    requireAuthOrGuest(async () => {
      setLocalWatched((prev) => !prev);
      if (user && userVm.uid && targetInfo) {
        try {
          await userVm.toggleWatched(targetInfo);
        } catch {
          // Handled in local state
        }
      }
    });
  };

  const handleOpenReview = () => {
    if (!user) {
      const proceed = window.confirm('Effettua il login per pubblicare la tua recensione. Vuoi accedere?');
      if (proceed) {
        navigate('/Cameos/login');
        return;
      }
    }
    if (onOpenReviewModal) {
      onOpenReviewModal();
    }
  };

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 my-3">
      {/* MI PIACE */}
      <button
        type="button"
        onClick={handleToggleLike}
        className={`btn rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm ${
          localLiked ? 'btn-danger' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
      >
        <i className={`bi ${localLiked ? 'bi-heart-fill' : 'bi-heart'} text-danger`}></i>
        <span>{likeCount}</span>
      </button>

      {/* WATCHLIST */}
      <button
        type="button"
        onClick={handleToggleWatchlist}
        className={`btn rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm ${
          inWatchlist ? 'btn-success' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
      >
        <i className={`bi ${inWatchlist ? 'bi-bookmark-check-fill' : 'bi-bookmark-plus'}`}></i>
        <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
      </button>

      {/* PREFERITI */}
      <button
        type="button"
        onClick={handleToggleFavorite}
        className={`btn rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm ${
          inFavorites ? 'btn-warning text-dark' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
      >
        <i className={`bi ${inFavorites ? 'bi-star-fill text-dark' : 'bi-star text-warning'}`}></i>
        <span>{inFavorites ? 'Nei Preferiti' : 'Preferito'}</span>
      </button>

      {/* VISTO */}
      <button
        type="button"
        onClick={handleToggleWatched}
        className={`btn rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm ${
          isWatched ? 'btn-info text-dark' : 'btn-dark border-secondary border-opacity-50 text-white'
        }`}
      >
        <i className={`bi ${isWatched ? 'bi-check-circle-fill' : 'bi-check-circle'}`}></i>
        <span>{isWatched ? 'Visto' : 'Segna come Visto'}</span>
      </button>

      {/* SCRIVI RECENSIONE */}
      <button
        type="button"
        onClick={handleOpenReview}
        className="btn btn-outline-success rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 ms-sm-auto shadow-sm"
      >
        <i className="bi bi-pencil-square"></i>
        <span>Scrivi Recensione</span>
      </button>
    </div>
  );
}
