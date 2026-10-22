import { useState } from 'react';
import HeroSlider from '../components/HeroSlider.jsx';
import MediaCarousel from '../components/MediaCarousel.jsx';
import CameoCard from '../components/CameoCard.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { CATALOG_SERIES, CURATED_CAMEOS, INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';

export default function TVSeries() {
  const [activeCategory, setActiveCategory] = useState('Tutti');

  const categories = [
    'Tutti',
    'Crime',
    'Dramma',
    'Sci-Fi & Fantasy',
    'Commedia',
    'Mistero',
    'Thriller'
  ];

  // Top trending series for HeroSlider
  const trendingSeries = CATALOG_SERIES.slice(0, 8);

  const crimeSeries = CATALOG_SERIES.filter((s) =>
    s.genres?.some((g) => g.id === 80 || g.name?.toLowerCase().includes('crime'))
  );

  const dramaSeries = CATALOG_SERIES.filter((s) =>
    s.genres?.some((g) => g.id === 18 || g.name?.toLowerCase().includes('dramma'))
  );

  const comedySeries = CATALOG_SERIES.filter((s) =>
    s.genres?.some((g) => g.id === 35 || g.name?.toLowerCase().includes('commedia'))
  );

  const tvCameos = CURATED_CAMEOS.filter((c) => c.mediaType === 'tv' || c.mediaType === 'episode');
  const tvReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'tv' || r.mediaType === 'episode');

  return (
    <div className="series-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* PORZIONE SUPERIORE: SERIE TV IN TENDENZA CON SLIDER (MOSTRA NUMERO DI STAGIONI) */}
      <HeroSlider items={trendingSeries} type="tv" />

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

      {/* PORZIONE RIMANENTE: LISTA DI CAROUSEL DI SERIE TV IN BASE AL GENERE */}
      {(activeCategory === 'Tutti' || activeCategory === 'Crime') && (
        <MediaCarousel
          title="Crime & Investigazione"
          subtitle="Tensione & Polizieschi Cult"
          items={crimeSeries.length > 0 ? crimeSeries : trendingSeries}
          type="tv"
        />
      )}

      {(activeCategory === 'Tutti' || activeCategory === 'Dramma') && (
        <MediaCarousel
          title="Serie Drammatiche Più Acclamate"
          subtitle="Scrittura d'Autore & Personaggi Iconici"
          items={dramaSeries.length > 0 ? dramaSeries : trendingSeries}
          type="tv"
        />
      )}

      {(activeCategory === 'Tutti' || activeCategory === 'Commedia') && (
        <MediaCarousel
          title="Sitcom & Serie Comiche"
          subtitle="Risate & Camei Brillanti"
          items={comedySeries.length > 0 ? comedySeries : trendingSeries}
          type="tv"
        />
      )}

      {/* SEZIONE: SERIE FAMOSE PER I CAMEI */}
      <section className="mb-5 p-4 p-md-5 rounded-4 card-2pxb-dark-background shadow-lg">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="p-3 rounded-circle bg-warning bg-opacity-25 text-warning fs-3">
            <i className="bi bi-tv-fill"></i>
          </div>
          <div>
            <p className="text-warning text-uppercase small fw-bold mb-1">Guest Star & Crossover</p>
            <h3 className="h3 text-white fw-bold mb-0">Camei e Star nelle Serie TV</h3>
          </div>
        </div>

        <div className="row g-4">
          {tvCameos.map((cameo) => (
            <div className="col-12 col-md-6 col-lg-4" key={cameo.id + '-' + cameo.mediaTitle}>
              <CameoCard cameo={cameo} />
            </div>
          ))}
        </div>
      </section>

      {/* SEZIONE: RECENSIONI DELLA COMMUNITY SULLE SERIE */}
      <ReviewSection
        initialReviews={tvReviews}
        targetKey="tv:1396"
        title="Ultime Recensioni sulle Serie TV"
      />
    </div>
  );
}
