/** UI presentation helpers for movie and TV series category carousels and headers. */

/** Builds movie carousel sections from the current ViewModel data and translations. */
export function getMovieCarouselSections(movieVM, t) {
  const getCategoryItems = (key) => movieVM?.categoryMovies?.[key] ?? movieVM?.[`${key}Movies`] ?? [];
  return [
    {
      key: 'upcoming',
      title: t('carousels.upcomingTitle'),
      subtitle: t('carousels.upcomingSub'),
      items: getCategoryItems('upcoming')
    },
    {
      key: 'animation',
      title: t('carousels.animationTitle'),
      subtitle: t('carousels.animationSub'),
      items: getCategoryItems('animation')
    },
    {
      key: 'adventure',
      title: t('carousels.adventureTitle'),
      subtitle: t('carousels.adventureSub'),
      items: getCategoryItems('adventure')
    },
    {
      key: 'action',
      title: t('carousels.actionTitle'),
      subtitle: t('carousels.actionSub'),
      items: getCategoryItems('action')
    },
    {
      key: 'comedy',
      title: t('carousels.movieComedyTitle'),
      subtitle: t('carousels.movieComedySub'),
      items: getCategoryItems('comedy')
    },
    {
      key: 'crime',
      title: t('carousels.crimeTitle'),
      subtitle: t('carousels.crimeSub'),
      items: getCategoryItems('crime')
    },
    {
      key: 'drama',
      title: t('carousels.dramaTitle'),
      subtitle: t('carousels.dramaSub'),
      items: getCategoryItems('drama')
    },
    {
      key: 'sciFi',
      title: t('carousels.sciFiTitle'),
      subtitle: t('carousels.sciFiSub'),
      items: getCategoryItems('sciFi')
    },
    {
      key: 'fantasy',
      title: t('carousels.fantasyTitle'),
      subtitle: t('carousels.fantasySub'),
      items: getCategoryItems('fantasy')
    },
    {
      key: 'horror',
      title: t('carousels.horrorTitle'),
      subtitle: t('carousels.horrorSub'),
      items: getCategoryItems('horror')
    },
    {
      key: 'romance',
      title: t('carousels.romanceTitle'),
      subtitle: t('carousels.romanceSub'),
      items: getCategoryItems('romance')
    },
    {
      key: 'sagas',
      title: t('carousels.sagasTitle'),
      subtitle: t('carousels.sagasSub'),
      items: getCategoryItems('sagas')
    },
    {
      key: 'thriller',
      title: t('carousels.thrillerTitle'),
      subtitle: t('carousels.thrillerSub'),
      items: getCategoryItems('thriller')
    },
    {
      key: 'war',
      title: t('carousels.warTitle'),
      subtitle: t('carousels.warSub'),
      items: getCategoryItems('war')
    }
  ];
}

/** Builds series carousel sections from the current ViewModel data and translations. */
export function getSeriesCarouselSections(seriesVM, t) {
  const getCategoryItems = (key) => seriesVM?.categorySeries?.[key] ?? seriesVM?.[`${key}Series`] ?? [];
  return [
    {
      key: 'upcoming',
      title: t('carousels.upcomingTitle'),
      subtitle: t('carousels.upcomingSub'),
      items: getCategoryItems('upcoming')
    },
    {
      key: 'crime',
      title: t('carousels.crimeTitle'),
      subtitle: t('carousels.crimeSub'),
      items: getCategoryItems('crime')
    },
    {
      key: 'drama',
      title: t('carousels.tvDramaTitle'),
      subtitle: t('carousels.tvDramaSub'),
      items: getCategoryItems('drama')
    },
    {
      key: 'comedy',
      title: t('carousels.comedyTitle'),
      subtitle: t('carousels.comedySub'),
      items: getCategoryItems('comedy')
    },
    {
      key: 'sciFiFantasy',
      title: t('carousels.sciFiTitle'),
      subtitle: t('carousels.sciFiSub'),
      items: getCategoryItems('sciFiFantasy')
    },
    {
      key: 'animation',
      title: t('carousels.animationTitle'),
      subtitle: t('carousels.animationSub'),
      items: getCategoryItems('animation')
    },
    {
      key: 'mystery',
      title: t('carousels.thrillerTitle'),
      subtitle: t('carousels.thrillerSub'),
      items: getCategoryItems('mystery')
    },
    {
      key: 'actionAdventure',
      title: t('carousels.actionTitle'),
      subtitle: t('carousels.actionSub'),
      items: getCategoryItems('actionAdventure')
    },
    {
      key: 'family',
      title: t('carousels.familyTitle'),
      subtitle: t('carousels.familySub'),
      items: getCategoryItems('family')
    },
    {
      key: 'kids',
      title: t('carousels.kidsTitle'),
      subtitle: t('carousels.kidsSub'),
      items: getCategoryItems('kids')
    },
    {
      key: 'warPolitics',
      title: t('carousels.warTitle'),
      subtitle: t('carousels.warSub'),
      items: getCategoryItems('warPolitics')
    },
    {
      key: 'western',
      title: t('carousels.westernTitle'),
      subtitle: t('carousels.westernSub'),
      items: getCategoryItems('western')
    },
    {
      key: 'soap',
      title: t('carousels.soapTitle'),
      subtitle: t('carousels.soapSub'),
      items: getCategoryItems('soap')
    }
  ];
}

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
