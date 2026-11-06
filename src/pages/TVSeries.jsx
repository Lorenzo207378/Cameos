import { useEffect, useMemo, useRef } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSeriesViewModel, useCameoViewModel } from '../viewmodel/index.js';
import {getSeriesCarouselSections} from "../utils/mediaCategories.js";
import LoadingScreen from "../components/LoadingScreen.jsx";
import FamousCameosSection from "../components/cameo/FamousCameosSection.jsx";
import { usePageReady } from '../utils/usePageReady.js';
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

export default function TVSeries() {
  const { t } = useTranslation();

  const seriesViewModel = useSeriesViewModel();
  const cameoViewModel = useCameoViewModel();

  const { loadSeriesFeed, loadSeriesFromCategory, loadUpcomingSeries } = seriesViewModel;
  const { loadFamousCameos, loadMoreFamousCameos } = cameoViewModel;
  const dataReady = seriesViewModel.feedLoaded && !seriesViewModel.loading && cameoViewModel.famousCameosPagination?.loading === false;
  const carouselsLoading = Object.values(seriesViewModel.categoryPagination).some((pagination) => pagination.loadingMore)
    || cameoViewModel.famousCameosPagination?.loadingMore;
  const contentRef = useRef(null);
  const isPageReady = usePageReady(contentRef, dataReady && !carouselsLoading);

  useEffect(() => {
    void loadSeriesFeed({ initialPages: 2 });
    void loadFamousCameos(16);
  }, [loadSeriesFeed, loadFamousCameos]);

  const trendingSeries = useMemo(() => {
    return seriesViewModel.trendingSeries || [];
  }, [seriesViewModel.trendingSeries]);

  const carouselSections = getSeriesCarouselSections(seriesViewModel, t);
  const displayedFamousCameos = cameoViewModel.famousCameos;

  const tvReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'tv' || r.mediaType === 'episode');

  if (!dataReady && !isPageReady) {
    return <LoadingScreen />;
  }

  return (
    <>
    {!isPageReady && <LoadingScreen />}
    <div ref={contentRef} className={`main-page w-100${isPageReady ? '' : ' main-page-preparing'}`}
      inert={!isPageReady} aria-hidden={!isPageReady}>
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
            hasMore={seriesViewModel.categoryPagination?.[section.key]?.hasMore}
            isLoadingMore={seriesViewModel.categoryPagination?.[section.key]?.loadingMore}
          />
      ))}

      {/* SEZIONE SPECIALE: CAMEO LEGGENDARI NEI FILM */}
      <FamousCameosSection
          cameos={displayedFamousCameos}
          loading={cameoViewModel.loading && (!displayedFamousCameos || displayedFamousCameos.length === 0)}
          onLoadMore={loadMoreFamousCameos}
          hasMore={cameoViewModel.famousCameosPagination?.hasMore}
          isLoadingMore={cameoViewModel.famousCameosPagination?.loadingMore}
      />

      {/* SEZIONE: RECENSIONI DELLA COMMUNITY */}
      <ReviewSection
          initialReviews={tvReviews}
          targetKey="movie:299534"
          title={t('reviews.sectionTitle')}
      />
    </div>
    </>
  );
}
