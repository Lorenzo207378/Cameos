import { useState } from 'react';
import TrendingFilmCardSlider from '../components/TrendingFilmCardSlider.jsx';
import MediaCarousel from '../components/MediaCarousel.jsx';
import CameoCard from '../components/CameoCard.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { CATALOG_MOVIES, CURATED_CAMEOS, INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';

export default function Films() {
  const [activeCategory, setActiveCategory] = useState('Tutti');
  
  const categories = [
    'Tutti',
    'Fantascienza',
    'Azione',
    'Thriller',
    'Dramma',
    'Avventura',
    'Animazione',
    'Classici'
  ];

  // Top 8 trending movies for TrendingFilmCardSlider
  const trendingMovies = CATALOG_MOVIES.slice(0, 8);

  // Filtered lists for genre carousels
  const sciFiMovies = CATALOG_MOVIES.filter((m) =>
    m.genres?.some((g) => g.id === 878 || g.name?.toLowerCase().includes('fantascienza'))
  );

  const actionMovies = CATALOG_MOVIES.filter((m) =>
    m.genres?.some((g) => g.id === 28 || g.name?.toLowerCase().includes('azione'))
  );

  const dramaMovies = CATALOG_MOVIES.filter((m) =>
    m.genres?.some((g) => g.id === 18 || g.name?.toLowerCase().includes('dramma'))
  );

  const movieCameos = CURATED_CAMEOS.filter((c) => c.mediaType === 'movie');
  const movieReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'movie');

  return (
    <div className="films-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* PORZIONE SUPERIORE (CIRCA 1/3 PAGINA): FILM IN TENDENZA CON SLIDER 10s */}
      <TrendingFilmCardSlider items={trendingMovies} type="movie" />

      {/* FILTRI RAPIDI DI CATEGORIA */}
      <div className="d-flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`btn rounded-pill px-3 py-1 text-nowrap fw-semibold small ${
              activeCategory === cat
                ? 'btn-success'
                : 'btn-dark text-white-50 border-secondary border-opacity-25'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* PORZIONE RIMANENTE: LISTA DI CAROUSEL IN BASE AL GENERE (POSTER VERTICALE + TITOLO SOTTO) */}
      {(activeCategory === 'Tutti' || activeCategory === 'Fantascienza') && (
        <MediaCarousel
          title="Fantascienza & Mondi Futuri"
          subtitle="Esplorazione Spaziale & Sci-Fi"
          items={sciFiMovies.length > 0 ? sciFiMovies : trendingMovies}
          type="movie"
        />
      )}

      {(activeCategory === 'Tutti' || activeCategory === 'Azione') && (
        <MediaCarousel
          title="Azione & Grandi Saghe"
          subtitle="Blockbuster e Adrenalina"
          items={actionMovies.length > 0 ? actionMovies : trendingMovies}
          type="movie"
        />
      )}

      {(activeCategory === 'Tutti' || activeCategory === 'Dramma') && (
        <MediaCarousel
          title="Grandi Capolavori Drammatici"
          subtitle="Cinema d'Autore e Storie Intense"
          items={dramaMovies.length > 0 ? dramaMovies : trendingMovies}
          type="movie"
        />
      )}

      {/* SEZIONE SPECIALE: CAMEO LEGGENDARI NEI FILM */}
      <section className="mb-5 p-4 p-md-5 rounded-4 card-2pxb-dark-background shadow-lg">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="p-3 rounded-circle bg-success bg-opacity-25 text-success fs-3">
            <i className="bi bi-camera-reels-fill"></i>
          </div>
          <div>
            <p className="text-success text-uppercase small fw-bold mb-1">Easter Egg & Curiosità</p>
            <h3 className="h3 text-white fw-bold mb-0">Camei della Storia del Cinema</h3>
          </div>
        </div>

        <div className="row g-4">
          {movieCameos.map((cameo) => (
            <div className="col-12 col-md-6 col-lg-4" key={cameo.id + '-' + cameo.mediaId}>
              <CameoCard cameo={cameo} />
            </div>
          ))}
        </div>
      </section>

      {/* SEZIONE: RECENSIONI DELLA COMMUNITY */}
      <ReviewSection
        initialReviews={movieReviews}
        targetKey="movie:299534"
        title="Ultime Recensioni sui Film"
      />
    </div>
  );
}
