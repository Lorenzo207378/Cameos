import { useEffect } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import CameoCard from '../components/CameoCard.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { CURATED_CAMEOS, INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../translations.js';
import { useMovieViewModel } from '../viewmodel/index.js';

export default function Films() {
  const { t } = useTranslation();

  const movieVM = useMovieViewModel();
  const { loadFilmsFeed, loadMoreCategoryMovies } = movieVM;

  // Fetch feed film (trending + upcoming + categorie) tramite ViewModel solo se non già caricato (2 pagine per categoria di default)
  useEffect(() => {
    if (!movieVM.feedLoaded && (!movieVM.upcomingMovies || movieVM.upcomingMovies.length === 0)) {
      loadFilmsFeed({ initialPages: 2 });
    }
  }, [loadFilmsFeed, movieVM.feedLoaded, movieVM.upcomingMovies]);

  // Log dei film ricevuti dal ViewModel
  useEffect(() => {
    if (movieVM.trendingMovies?.length > 0) {
      movieVM.trendingMovies.forEach((movie) => {
        console.log(movie);
      });
    }
  }, [movieVM.trendingMovies]);

  // Trending movies per lo slider principale superiore
  const trendingMovies = movieVM.trendingMovies?.length > 0
    ? movieVM.trendingMovies.slice(0, 10)
    : [];

  // Liste film per caroselli di genere (preferisce i film caricati dal ViewModel con fallback su catalogData)
  const upcomingMovies = movieVM.upcomingMovies || [];
  const animationMovies = movieVM.animationMovies || [];
  const adventureMovies = movieVM.adventureMovies || [];
  const actionMovies = movieVM.actionMovies || [];
  const comedyMovies = movieVM.comedyMovies || [];
  const crimeMovies = movieVM.crimeMovies || [];
  const dramaMovies = movieVM.dramaMovies || [];
  const sciFiMovies = movieVM.sciFiMovies || [];
  const fantasyMovies = movieVM.fantasyMovies || [];
  const horrorMovies = movieVM.horrorMovies || [];
  const romanceMovies = movieVM.romanceMovies || [];
  const sagasMovies = movieVM.sagasMovies || [];
  const thrillerMovies = movieVM.thrillerMovies || [];


  const movieCameos = CURATED_CAMEOS.filter((c) => c.mediaType === 'movie');
  const movieReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'movie');

  const carouselSections = [
    {
      key: 'upcoming',
      title: t('carousels.upcomingTitle'),
      subtitle: t('carousels.upcomingSub'),
      items: upcomingMovies
    },
    {
      key: 'animation',
      title: t('carousels.animationTitle'),
      subtitle: t('carousels.animationSub'),
      items: animationMovies
    },
    {
      key: 'adventure',
      title: t('carousels.adventureTitle'),
      subtitle: t('carousels.adventureSub'),
      items: adventureMovies
    },
    {
      key: 'action',
      title: t('carousels.actionTitle'),
      subtitle: t('carousels.actionSub'),
      items: actionMovies
    },
    {
      key: 'comedy',
      title: t('carousels.movieComedyTitle'),
      subtitle: t('carousels.movieComedySub'),
      items: comedyMovies
    },
    {
      key: 'crime',
      title: t('carousels.crimeTitle'),
      subtitle: t('carousels.crimeSub'),
      items: crimeMovies
    },
    {
      key: 'drama',
      title: t('carousels.dramaTitle'),
      subtitle: t('carousels.dramaSub'),
      items: dramaMovies
    },
    {
      key: 'sciFi',
      title: t('carousels.sciFiTitle'),
      subtitle: t('carousels.sciFiSub'),
      items: sciFiMovies
    },
    {
      key: 'fantasy',
      title: t('carousels.fantasyTitle'),
      subtitle: t('carousels.fantasySub'),
      items: fantasyMovies
    },
    {
      key: 'horror',
      title: t('carousels.horrorTitle'),
      subtitle: t('carousels.horrorSub'),
      items: horrorMovies
    },
    {
      key: 'romance',
      title: t('carousels.romanceTitle'),
      subtitle: t('carousels.romanceSub'),
      items: romanceMovies
    },
    {
      key: 'sagas',
      title: t('carousels.sagasTitle'),
      subtitle: t('carousels.sagasSub'),
      items: sagasMovies
    },
    {
      key: 'thriller',
      title: t('carousels.thrillerTitle'),
      subtitle: t('carousels.thrillerSub'),
      items: thrillerMovies
    }
  ];

  return (
    <div className="films-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* PORZIONE SUPERIORE (CIRCA 1/3 PAGINA): FILM IN TENDENZA CON SLIDER 10s */}
      <TrendingMediaCardSlider items={trendingMovies} type="movie" />

      {carouselSections.map((section) => (
        <MediaCarousel
          key={section.key}
          title={section.title}
          subtitle={section.subtitle}
          items={section.items}
          type="movie"
          onLoadMore={() => loadMoreCategoryMovies(section.key)}
          hasMore={movieVM.categoryPagination?.[section.key]?.hasMore}
          isLoadingMore={movieVM.categoryPagination?.[section.key]?.loadingMore}
        />
      ))}

      {/* SEZIONE SPECIALE: CAMEO LEGGENDARI NEI FILM */}
      <section className="mb-5 p-4 p-md-5 rounded-4 card-2pxb-dark-background shadow-lg">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div className="p-3 rounded-circle bg-success bg-opacity-25 text-success fs-3">
            <i className="bi bi-camera-reels-fill"></i>
          </div>
          <div>
            <p className="text-success text-uppercase small fw-bold mb-1">{t('carousels.easterEggsTag')}</p>
            <h3 className="h3 text-white fw-bold mb-0">{t('carousels.cameoHistoryTitle')}</h3>
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
        title={t('reviews.sectionTitle')}
      />
    </div>
  );
}
