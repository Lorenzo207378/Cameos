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

/** Builds series carousel sections from the current ViewModel data and translations. */
export function getSeriesCarouselSections(seriesVM, t) {
  return [
    {
      key: 'upcoming',
      title: t('carousels.upcomingTitle'),
      subtitle: t('carousels.upcomingSub'),
      items: seriesVM.upcomingSeries || []
    },
    {
      key: 'crime',
      title: t('carousels.crimeTitle'),
      subtitle: t('carousels.crimeSub'),
      items: seriesVM.crimeSeries || []
    },
    {
      key: 'drama',
      title: t('carousels.tvDramaTitle'),
      subtitle: t('carousels.tvDramaSub'),
      items: seriesVM.dramaSeries || []
    },
    {
      key: 'comedy',
      title: t('carousels.comedyTitle'),
      subtitle: t('carousels.comedySub'),
      items: seriesVM.comedySeries || []
    },
    {
      key: 'sciFiFantasy',
      title: t('carousels.sciFiTitle'),
      subtitle: t('carousels.sciFiSub'),
      items: seriesVM.sciFiFantasySeries || []
    },
    {
      key: 'animation',
      title: t('carousels.animationTitle'),
      subtitle: t('carousels.animationSub'),
      items: seriesVM.animationSeries || []
    },
    {
      key: 'mystery',
      title: t('carousels.thrillerTitle'),
      subtitle: t('carousels.thrillerSub'),
      items: seriesVM.mysterySeries || []
    },
    {
      key: 'actionAdventure',
      title: t('carousels.actionTitle'),
      subtitle: t('carousels.actionSub'),
      items: seriesVM.actionAdventureSeries || []
    },
    {
      key: 'family',
      title: t('categories.family') || 'Famiglia',
      subtitle: t('categories.family') || 'Famiglia',
      items: seriesVM.familySeries || []
    },
    {
      key: 'warPolitics',
      title: t('carousels.warTitle'),
      subtitle: t('carousels.warSub'),
      items: seriesVM.warPoliticsSeries || []
    },
    {
      key: 'western',
      title: 'Western',
      subtitle: 'Western',
      items: seriesVM.westernSeries || []
    },
    {
      key: 'soap',
      title: t('categories.soap') || 'Soap Opera',
      subtitle: t('categories.soap') || 'Soap Opera',
      items: seriesVM.soapSeries || []
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

export const SERIES_CATEGORY_CONFIG = Object.freeze({
    upcoming: {
        key: 'upcoming',
        isUpcoming: true
    },
    actionAdventure: {
        key: 'actionAdventure',
        genreId: 10759,
        endpoint: '/discover/tv'
    },
    sciFiFantasy: {
        key: 'sciFiFantasy',
        genreId: 10765,
        endpoint: '/discover/tv'
    },
    comedy: {
        key: 'comedy',
        genreId: 35,
        endpoint: '/discover/tv'
    },
    drama: {
        key: 'drama',
        genreId: 18,
        endpoint: '/discover/tv'
    },
    crime: {
        key: 'crime',
        genreId: 80,
        endpoint: '/discover/tv'
    },
    mystery: {
        key: 'mystery',
        genreId: 9648,
        endpoint: '/discover/tv'
    },
    animation: {
        key: 'animation',
        genreId: 16,
        endpoint: '/discover/tv'
    },
    family: {
        key: 'family',
        genreId: 10751,
        endpoint: '/discover/tv'
    },
    kids: {
        key: 'kids',
        genreId: 10762,
        endpoint: '/discover/tv'
    },
    warPolitics: {
        key: 'warPolitics',
        genreId: 10768,
        endpoint: '/discover/tv'
    },
    western: {
        key: 'western',
        genreId: 37,
        endpoint: '/discover/tv'
    },
    soap: {
        key: 'soap',
        genreId: 10766,
        endpoint: '/discover/tv'
    }
});



/**
 * Resolves localized category title, full title, and subtitle.
 * @param {string} key - Category key (e.g. 'action', 'comedy', 'upcoming')
 * @param {Function} t - Translation function
 * @param {'movie'|'series'|'tv'} [type='movie'] - Media type context
 * @returns {{ name: string, fullTitle: string, subtitle: string }}
 */
export function getCategoryDisplayInfo(key, t, type = 'movie') {
  const shortName = t(`categories.${key}`);
  const titleKey = (type === 'series' || type === 'tv') && key === 'drama'
    ? 'tvDramaTitle'
    : (type === 'movie' && key === 'comedy' ? 'movieComedyTitle' : (key === 'comedy' ? 'comedyTitle' : `${key}Title`));
  const subKey = (type === 'series' || type === 'tv') && key === 'drama'
    ? 'tvDramaSub'
    : (type === 'movie' && key === 'comedy' ? 'movieComedySub' : (key === 'comedy' ? 'comedySub' : `${key}Sub`));
  const fullTitle = t(`carousels.${titleKey}`);
  const subtitle = t(`carousels.${subKey}`);

  const hasShort = shortName && !shortName.startsWith('categories.');
  const hasFull = fullTitle && !fullTitle.startsWith('carousels.');
  const hasSub = subtitle && !subtitle.startsWith('carousels.');

  return {
    name: hasShort ? shortName : (hasFull ? fullTitle : key),
    fullTitle: hasFull ? fullTitle : (hasShort ? shortName : key),
    subtitle: hasSub ? subtitle : ''
  };
}
