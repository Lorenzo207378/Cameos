import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CastCarousel from '../components/CastCarousel.jsx';
import CameoCard from '../components/CameoCard.jsx';
import MediaPreferencesBar from '../components/MediaPreferencesBar.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { getMovieById, getCameosForMedia, getReviewsForTarget, CATALOG_MOVIES } from '../data/catalogData.js';

export default function FilmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Retrieve movie by ID, or fallback to first movie in catalog
  const movie = useMemo(() => {
    return getMovieById(id) || CATALOG_MOVIES[0];
  }, [id]);

  const cameos = useMemo(() => {
    return getCameosForMedia('movie', movie?.id);
  }, [movie]);

  const reviews = useMemo(() => {
    return getReviewsForTarget(`movie:${movie?.id}`);
  }, [movie]);

  if (!movie) return null;

  const backdropSrc =
    (typeof movie.getBackdropUrl === 'function' ? movie.getBackdropUrl('it') : null) ||
    movie.backdropUrl?.it ||
    movie.backdropUrl?.en ||
    (typeof movie.backdropUrl === 'string' ? movie.backdropUrl : null);

  const posterSrc =
    (typeof movie.getPosterUrl === 'function' ? movie.getPosterUrl('it') : null) ||
    movie.posterUrl?.it ||
    movie.posterUrl?.en ||
    'https://via.placeholder.com/300x450?text=Locandina';

  const releaseYear = (movie.releaseDate || movie.release_date || '').slice(0, 4);
  const runtimeHours = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;
  const rating = (Number(movie.voteAverage ?? movie.vote_average) || 0).toFixed(1);
  const voteCount = movie.voteCount || movie.vote_count || 0;

  // Directors and crew
  const directors = (movie.crew || []).filter((c) => c.job === 'Director' || c.department === 'Directing');
  const writers = (movie.crew || []).filter((c) => c.job === 'Screenplay' || c.department === 'Writing');

  const budgetStr = movie.budget > 0 ? `$${(movie.budget / 1000000).toFixed(0)} Milioni` : 'Non dichiarato';
  const revenueStr = movie.revenue > 0 ? `$${(movie.revenue / 1000000).toFixed(0)} Milioni` : 'Non dichiarato';

  const overviewText = movie.overview || 'Trama non disponibile al momento.';
  const shortOverview = overviewText.length > 280 ? `${overviewText.slice(0, 280)}...` : overviewText;

  return (
    <div className="film-detail-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* PORZIONE SUPERIORE (CIRCA 1/3 PAGINA): IMMAGINE ORIZZONTALE E PULSANTE CIRCOLARE INDIETRO */}
      <section
        className="position-relative rounded-4 mb-4 overflow-hidden shadow-lg"
        style={{
          minHeight: '360px',
          backgroundColor: '#1E1E24',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundImage: backdropSrc
              ? `linear-gradient(180deg, rgba(14, 15, 20, 0.4) 0%, rgba(14, 15, 20, 0.95) 100%), url(${backdropSrc})`
              : 'linear-gradient(135deg, rgba(10, 93, 10, 0.9) 0%, rgba(20, 40, 25, 0.95) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top'
          }}
        />

        {/* PULSANTE CIRCOLARE PER TORNARE INDIETRO (IN ALTO A SINISTRA) */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="position-absolute top-0 start-0 m-3 btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center z-3 border border-secondary border-opacity-50"
          style={{ width: '44px', height: '44px' }}
          aria-label="Torna indietro"
        >
          <i className="bi bi-arrow-left text-white fs-5"></i>
        </button>

        {/* TITOLO E TAGLINE IN BASSO AL BACKDROP */}
        <div className="position-absolute bottom-0 start-0 w-100 p-4 p-md-5 z-2">
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span className="badge rounded-pill bg-success px-3 py-1 fw-bold">FILM</span>
            {releaseYear && (
              <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
                {releaseYear}
              </span>
            )}
            {runtimeHours && (
              <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
                {runtimeHours}
              </span>
            )}
            <span className="badge rounded-pill bg-warning text-dark px-3 py-1 fw-bold d-flex align-items-center gap-1">
              <i className="bi bi-star-fill"></i> {rating} ({voteCount} voti)
            </span>
          </div>

          <h1 className="display-4 fw-bold text-white mb-1">{movie.title}</h1>
          {movie.tagline && <p className="fs-5 text-success-emphasis fw-semibold mb-0">{movie.tagline}</p>}
        </div>
      </section>

      {/* BARRA PULSANTI PREFERENZE & RECENSIONE */}
      <MediaPreferencesBar
        target={movie}
        onOpenReviewModal={() => setIsReviewModalOpen(true)}
      />

      {/* PORZIONE CENTRALE: TRAMA ESPANDIBILE, GENERI, STATISTICHE E LINGUA */}
      <section className="row g-4 mb-5">
        {/* COLONNA SINISTRA: TRAMA & GENERI */}
        <div className="col-12 col-lg-8">
          <div className="card-2pxb-dark-background rounded-4 p-4 shadow-sm h-100">
            {/* GENERI */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              {(movie.genres || []).map((genre) => (
                <span
                  key={genre.id || genre.name}
                  className="badge rounded-pill bg-dark text-white border border-secondary border-opacity-50 px-3 py-2 small"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            {/* TRAMA CLICCABILE PER VISIONARLA COMPLETAMENTE */}
            <h3 className="h5 fw-bold text-white mb-2">Trama</h3>
            <p className="text-white-50 lead fs-6 mb-2" style={{ lineHeight: '1.7' }}>
              {isOverviewExpanded ? overviewText : shortOverview}
            </p>
            {overviewText.length > 280 && (
              <button
                type="button"
                onClick={() => setIsOverviewExpanded((prev) => !prev)}
                className="btn btn-link text-success p-0 fw-semibold text-decoration-none small d-flex align-items-center gap-1"
              >
                <span>{isOverviewExpanded ? 'Mostra meno' : 'Leggi tutta la trama'}</span>
                <i className={`bi bi-chevron-${isOverviewExpanded ? 'up' : 'down'}`}></i>
              </button>
            )}

            {/* CAMEI RILEVATI NEL FILM */}
            {cameos.length > 0 && (
              <div className="mt-4 pt-3 border-top border-secondary border-opacity-25">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-stars text-success fs-5"></i>
                  <h4 className="h6 fw-bold text-white mb-0 text-uppercase tracking-wider">
                    Camei & Apparizioni Speciali nel Film
                  </h4>
                </div>
                <div className="row g-3">
                  {cameos.map((c) => (
                    <div className="col-12 col-md-6" key={c.id}>
                      <CameoCard cameo={c} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: STATISTICHE FILM, ANNO E LINGUA PRINCIPALE */}
        <div className="col-12 col-lg-4">
          <div className="card-2pxb-dark-background rounded-4 p-4 shadow-sm text-white">
            <div className="d-flex gap-3 align-items-center mb-3">
              <div className="rounded-3 overflow-hidden bg-dark shadow-sm flex-shrink-0" style={{ width: '60px', height: '90px' }}>
                <img src={posterSrc} alt={movie.title} className="w-100 h-100 object-fit-cover" />
              </div>
              <div>
                <h3 className="h6 fw-bold text-white mb-1 d-flex align-items-center gap-2">
                  <i className="bi bi-bar-chart-fill text-success"></i> Statistiche & Dettagli
                </h3>
                <small className="text-white-50">Scheda Tecnica Ufficiale</small>
              </div>
            </div>

            <ul className="list-unstyled mb-0 d-flex flex-column gap-3 small">
              <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                <span className="text-white-50">Titolo Originale</span>
                <span className="fw-semibold text-end text-truncate" style={{ maxWidth: '180px' }}>
                  {movie.originalTitle || movie.original_title || movie.title}
                </span>
              </li>
              <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                <span className="text-white-50">Anno di Uscita</span>
                <span className="fw-semibold">{releaseYear || 'N/D'}</span>
              </li>
              <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                <span className="text-white-50">Durata Totale</span>
                <span className="fw-semibold">{runtimeHours || 'N/D'}</span>
              </li>
              <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                <span className="text-white-50">Lingua Principale</span>
                <span className="fw-semibold text-uppercase text-warning">
                  {movie.originalLanguage || movie.original_language || 'IT'}
                </span>
              </li>
              <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                <span className="text-white-50">Budget di Produzione</span>
                <span className="fw-semibold">{budgetStr}</span>
              </li>
              <li className="d-flex justify-content-between border-bottom border-secondary border-opacity-25 pb-2">
                <span className="text-white-50">Incasso Globale</span>
                <span className="fw-semibold text-success">{revenueStr}</span>
              </li>
              <li className="d-flex justify-content-between">
                <span className="text-white-50">Stato</span>
                <span className="badge bg-success rounded-pill">{movie.status || 'Rilasciato'}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* PORZIONE INFERIORE: CAROUSEL ATTORI & REGIA */}
      <CastCarousel cast={movie.cast || []} title="Attori del Film" />

      {/* REGIA & SCENEGGIATURA */}
      {(directors.length > 0 || writers.length > 0) && (
        <section className="mb-5">
          <h3 className="h4 text-white fw-bold mb-3">Regia & Autori</h3>
          <div className="row g-3">
            {directors.map((d) => (
              <div className="col-12 col-sm-6 col-md-4" key={d.credit_id || d.id}>
                <div className="card-2pxb-dark-background rounded-4 p-3 d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle overflow-hidden bg-dark flex-shrink-0"
                    style={{ width: '56px', height: '56px' }}
                  >
                    <img
                      src={d.profile_path ? `https://image.tmdb.org/t/p/w185${d.profile_path}` : 'https://via.placeholder.com/185x278?text=Regia'}
                      alt={d.name}
                      className="w-100 h-100 object-fit-cover"
                    />
                  </div>
                  <div>
                    <span className="badge bg-dark text-success border border-success border-opacity-25 small mb-1">
                      Regia
                    </span>
                    <h5 className="h6 fw-bold text-white mb-0">{d.name}</h5>
                  </div>
                </div>
              </div>
            ))}

            {writers.slice(0, 2).map((w) => (
              <div className="col-12 col-sm-6 col-md-4" key={w.credit_id || w.id}>
                <div className="card-2pxb-dark-background rounded-4 p-3 d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle overflow-hidden bg-dark flex-shrink-0"
                    style={{ width: '56px', height: '56px' }}
                  >
                    <img
                      src={w.profile_path ? `https://image.tmdb.org/t/p/w185${w.profile_path}` : 'https://via.placeholder.com/185x278?text=Scrittura'}
                      alt={w.name}
                      className="w-100 h-100 object-fit-cover"
                    />
                  </div>
                  <div>
                    <span className="badge bg-dark text-info border border-info border-opacity-25 small mb-1">
                      Sceneggiatura
                    </span>
                    <h5 className="h6 fw-bold text-white mb-0">{w.name}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEZIONE: RECENSIONI UTENTI SCROLLABILI & FORM */}
      <ReviewSection
        initialReviews={reviews}
        targetKey={`movie:${movie.id}`}
        isModalOpen={isReviewModalOpen}
        onCloseModal={() => setIsReviewModalOpen(false)}
        title={`Recensioni per ${movie.title}`}
      />
    </div>
  );
}
