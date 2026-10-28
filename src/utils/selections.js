/** Builds movie carousel sections from the current ViewModel data and translations. */
export function getMovieCarouselSections(movieVM, t) {
  return [
    {
      key: 'upcoming',
      title: t('carousels.upcomingTitle'),
      subtitle: t('carousels.upcomingSub'),
      items: movieVM.upcomingMovies || []
    },
    {
      key: 'animation',
      title: t('carousels.animationTitle'),
      subtitle: t('carousels.animationSub'),
      items: movieVM.animationMovies || []
    },
    {
      key: 'adventure',
      title: t('carousels.adventureTitle'),
      subtitle: t('carousels.adventureSub'),
      items: movieVM.adventureMovies || []
    },
    {
      key: 'action',
      title: t('carousels.actionTitle'),
      subtitle: t('carousels.actionSub'),
      items: movieVM.actionMovies || []
    },
    {
      key: 'comedy',
      title: t('carousels.movieComedyTitle'),
      subtitle: t('carousels.movieComedySub'),
      items: movieVM.comedyMovies || []
    },
    {
      key: 'crime',
      title: t('carousels.crimeTitle'),
      subtitle: t('carousels.crimeSub'),
      items: movieVM.crimeMovies || []
    },
    {
      key: 'drama',
      title: t('carousels.dramaTitle'),
      subtitle: t('carousels.dramaSub'),
      items: movieVM.dramaMovies || []
    },
    {
      key: 'sciFi',
      title: t('carousels.sciFiTitle'),
      subtitle: t('carousels.sciFiSub'),
      items: movieVM.sciFiMovies || []
    },
    {
      key: 'fantasy',
      title: t('carousels.fantasyTitle'),
      subtitle: t('carousels.fantasySub'),
      items: movieVM.fantasyMovies || []
    },
    {
      key: 'horror',
      title: t('carousels.horrorTitle'),
      subtitle: t('carousels.horrorSub'),
      items: movieVM.horrorMovies || []
    },
    {
      key: 'romance',
      title: t('carousels.romanceTitle'),
      subtitle: t('carousels.romanceSub'),
      items: movieVM.romanceMovies || []
    },
    {
      key: 'sagas',
      title: t('carousels.sagasTitle'),
      subtitle: t('carousels.sagasSub'),
      items: movieVM.sagasMovies || []
    },
    {
      key: 'thriller',
      title: t('carousels.thrillerTitle'),
      subtitle: t('carousels.thrillerSub'),
      items: movieVM.thrillerMovies || []
    },
    {
        key: 'war',
        title: t('carousels.warTitle'),
        subtitle: t('carousels.warSub'),
        items: movieVM.warMovies || []
    }
  ];
}

export const MOVIE_CATEGORY_CONFIG = Object.freeze({
    upcoming: {
        key: 'upcoming',
        isUpcoming: true
    },
    action: {
        key: 'action',
        genreId: 28
    },
    comedy: {
        key: 'comedy',
        genreId: 35
    },
    romance: {
        key: 'romance',
        genreId: 10749
    },
    crime: {
        key: 'crime',
        genreId: 80
    },
    sciFi: {
        key: 'sciFi',
        genreId: 878
    },
    fantasy: {
        key: 'fantasy',
        genreId: 14
    },
    horror: {
        key: 'horror',
        genreId: 27
    },
    sagas: {
        key: 'sagas',
        genreId: '28,12',
        additionalParams: { 'vote_count.gte': 500 }
    },
    drama: {
        key: 'drama',
        genreId: 18
    },
    animation: {
        key: 'animation',
        genreId: 16
    },
    thriller: {
        key: 'thriller',
        genreId: 53
    },
    adventure: {
        key: 'adventure',
        genreId: 12
    }
    ,
    war: {
        key: 'war',
        genreId: 10752
    }
});

