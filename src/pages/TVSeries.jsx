import { useEffect, useMemo, useRef } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { usePageReady } from '../utils/usePageReady.js';
import ReviewSection from '../components/ReviewSection.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSeriesViewModel, useCameoViewModel } from '../viewmodel/index.js';
import {getSeriesCarouselSections} from "../utils/mediaCategories.js";
import FamousCameosSection from "../components/cameo/FamousCameosSection.jsx";
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

export default function TVSeries() {
  const { t, normalizedLang } = useTranslation();

  const seriesViewModel = useSeriesViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang, shared: true });

  const { loadSeriesFeed, loadSeriesFromCategory, loadUpcomingSeries } = seriesViewModel;
  const { loadFamousCameos, loadMoreFamousCameos } = cameoViewModel;
  const contentRef = useRef(null);
  const isPageReady = usePageReady(contentRef, seriesViewModel.state, cameoViewModel.state);

  useEffect(() => {
    void loadSeriesFeed({ initialPages: 2, language: normalizedLang });
    void loadFamousCameos(16, normalizedLang);
  }, [loadSeriesFeed, loadFamousCameos, normalizedLang]);

  const trendingSeries = useMemo(() => {
    return seriesViewModel.trendingSeries || [];
  }, [seriesViewModel.trendingSeries]);

  const carouselSections = getSeriesCarouselSections(seriesViewModel, t);
  const displayedFamousCameos = cameoViewModel.famousCameos;

  const tvReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'tv' || r.mediaType === 'episode');

  return (
    <div className={`catalog-page position-relative w-100${isPageReady ? '' : ' catalog-page-preparing'}`}>
      {!isPageReady && <LoadingScreen className="catalog-loading-screen" />}
      <div ref={contentRef} className={`main-page w-100${isPageReady ? '' : ' main-page-preparing'}`}
        inert={!isPageReady} aria-hidden={!isPageReady}>
        {/* PORZIONE SUPERIORE: SERIE TV IN TENDENZA CON SLIDER (MOSTRA NUMERO DI STAGIONI) */}
        <TrendingMediaCardSlider items={trendingSeries} type="tv" className="mb-3" loading={!seriesViewModel.feedLoaded} error={seriesViewModel.error} />

        {carouselSections.map((section) => (
            <MediaCarousel
              key={section.key}
              categoryKey={section.key}
              title={section.title}
              subtitle={section.subtitle}
              items={section.items}
              loading={!seriesViewModel.categoryPagination?.[section.key] || seriesViewModel.categoryPagination[section.key].loading}
              error={seriesViewModel.categoryPagination?.[section.key]?.error}
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
            loading={cameoViewModel.famousCameosPagination?.loading !== false}
            error={cameoViewModel.famousCameosPagination?.error}
            onLoadMore={loadMoreFamousCameos}
            hasMore={cameoViewModel.famousCameosPagination?.hasMore}
            isLoadingMore={cameoViewModel.famousCameosPagination?.loadingMore}
        />

        {/* SEZIONE: RECENSIONI DELLA COMMUNITY */}
        <ReviewSection
            initialReviews={tvReviews}
            targetKey="tv:1418"
            title={t('reviews.sectionTitle')}
        />
      </div>
    </div>
  );
}
