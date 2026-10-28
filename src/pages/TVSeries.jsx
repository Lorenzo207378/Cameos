import { useState } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import CameoCard from '../components/media/CameoCard.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { CATALOG_SERIES, CURATED_CAMEOS, INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../utils/translations.js';

export default function TVSeries() {
  const { t } = useTranslation();
  const [activeCategoryKey, setActiveCategoryKey] = useState('all');

  const categories = [
    { key: 'all', label: t('categories.all') },
    { key: 'crime', label: t('categories.crime') },
    { key: 'drama', label: t('categories.drama') },
    { key: 'sciFiFantasy', label: t('categories.sciFiFantasy') },
    { key: 'comedy', label: t('categories.comedy') },
    { key: 'mystery', label: t('categories.mystery') },
    { key: 'thriller', label: t('categories.thriller') }
  ];

  // Top trending series for TrendingFilmCardSlider
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
      <TrendingMediaCardSlider items={trendingSeries} type="tv" />

      {/* FILTRI RAPIDI DI CATEGORIA */}
      <div className="d-flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategoryKey(cat.key)}
            className={`btn rounded-pill px-3 py-1 text-nowrap fw-semibold small ${
              activeCategoryKey === cat.key
                ? 'btn-success'
                : 'btn-dark text-white-50 border-secondary border-opacity-25'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* PORZIONE RIMANENTE: LISTA DI CAROUSEL DI SERIE TV IN BASE AL GENERE */}
      {(activeCategoryKey === 'all' || activeCategoryKey === 'crime') && (
        <MediaCarousel
          title={t('carousels.crimeTitle')}
          subtitle={t('carousels.crimeSub')}
          items={crimeSeries.length > 0 ? crimeSeries : trendingSeries}
          type="tv"
        />
      )}

      {(activeCategoryKey === 'all' || activeCategoryKey === 'drama') && (
        <MediaCarousel
          title={t('carousels.tvDramaTitle')}
          subtitle={t('carousels.tvDramaSub')}
          items={dramaSeries.length > 0 ? dramaSeries : trendingSeries}
          type="tv"
        />
      )}

      {(activeCategoryKey === 'all' || activeCategoryKey === 'comedy') && (
        <MediaCarousel
          title={t('carousels.comedyTitle')}
          subtitle={t('carousels.comedySub')}
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
            <p className="text-warning text-uppercase small fw-bold mb-1">{t('carousels.guestStarsTag')}</p>
            <h3 className="h3 text-white fw-bold mb-0">{t('carousels.cameoTvTitle')}</h3>
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
        title={t('reviews.sectionTitle')}
      />
    </div>
  );
}
