import { useEffect, useMemo } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSeriesViewModel, useCameoViewModel } from '../viewmodel/index.js';
import {getSeriesCarouselSections} from "../utils/selections.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import FamousCameosSection from "../components/cameo/FamousCameosSection.jsx";
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

export default function TVSeries() {
  const { t } = useTranslation();

  const seriesVM = useSeriesViewModel();
  const cameoVM = useCameoViewModel();

  const { loadSeriesFeed, loadSeriesFromCategory, loadUpcomingSeries } = seriesVM;
  const { loadFamousCameos, loadMoreFamousCameos } = cameoVM;

  useEffect(() => {
    if (!seriesVM.feedLoaded) {
        void loadSeriesFeed({ initialPages: 2 });
    }
  }, [loadSeriesFeed, seriesVM.feedLoaded]);

  useEffect(() => {
    if (!cameoVM.famousCameos || cameoVM.famousCameos.length === 0) {
        void loadFamousCameos(16);
    }
  }, [loadFamousCameos, cameoVM.famousCameos]);

  const trendingSeries = useMemo(() => {
    return seriesVM.trendingSeries || [];
  }, [seriesVM.trendingSeries]);

  const carouselSections = getSeriesCarouselSections(seriesVM, t);
  const displayedFamousCameos = cameoVM.famousCameos;

  const isSeriesFeedReady =
      (seriesVM.feedLoaded && !seriesVM.loading) ||
      (!seriesVM.loading && (Boolean(seriesVM.error) || seriesVM.isOffline));

  const isFamousCameosReady =
    ((cameoVM.famousCameos?.length > 0 || Boolean(cameoVM.famousCameosPagination)) && !cameoVM.loading) ||
    (!cameoVM.loading && (Boolean(cameoVM.error) || cameoVM.isOffline));

  const tvReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'tv' || r.mediaType === 'episode');

  const isPageReady = isSeriesFeedReady && isFamousCameosReady;

  if (!isPageReady) {
    return <LoadingScreen />;
  }

  return (
    <div className="main-page w-100">
      {/* PORZIONE SUPERIORE: SERIE TV IN TENDENZA CON SLIDER (MOSTRA NUMERO DI STAGIONI) */}
      <TrendingMediaCardSlider items={trendingSeries} type="tv" className="mb-3" />

      {carouselSections.map((section) => (
          <MediaCarousel
            key={section.key}
            categoryKey={section.key}
            title={section.title}
            subtitle={section.subtitle}
            items={section.items}
            type="tv"
            upcoming={section.key === 'upcoming'}
            onLoadMore={() => {
              if(section.key === 'upcoming') {
                void loadUpcomingSeries({append: true});
              } else {
                void loadSeriesFromCategory(section.key, {append: true});
              }
            }}
            hasMore={seriesVM.categoryPagination?.[section.key]?.hasMore}
            isLoadingMore={seriesVM.categoryPagination?.[section.key]?.loadingMore}
          />
      ))}

      {/* SEZIONE SPECIALE: CAMEO LEGGENDARI NEI FILM */}
      <FamousCameosSection
          cameos={displayedFamousCameos}
          loading={cameoVM.loading && (!displayedFamousCameos || displayedFamousCameos.length === 0)}
          onLoadMore={loadMoreFamousCameos}
          hasMore={cameoVM.famousCameosPagination?.hasMore}
          isLoadingMore={cameoVM.famousCameosPagination?.loadingMore}
      />

      {/* SEZIONE: RECENSIONI DELLA COMMUNITY */}
      <ReviewSection
          initialReviews={tvReviews}
          targetKey="movie:299534"
          title={t('reviews.sectionTitle')}
      />
    </div>
  );
}
