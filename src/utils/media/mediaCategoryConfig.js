/** Category query configuration shared by Backends and ViewModels (ordered to match visual priority). */
export const MOVIE_CATEGORY_CONFIG = Object.freeze({
  upcoming: {
    key: 'upcoming',
    isUpcoming: true
  },
  animation: {
    key: 'animation',
    genreId: 16
  },
  adventure: {
    key: 'adventure',
    genreId: 12
  },
  action: {
    key: 'action',
    genreId: 28
  },
  comedy: {
    key: 'comedy',
    genreId: 35
  },
  crime: {
    key: 'crime',
    genreId: 80
  },
  drama: {
    key: 'drama',
    genreId: 18
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
  romance: {
    key: 'romance',
    genreId: 10749
  },
  sagas: {
    key: 'sagas',
    genreId: '28,12',
    additionalParams: { 'vote_count.gte': 500 }
  },
  thriller: {
    key: 'thriller',
    genreId: 53
  },
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
  crime: {
    key: 'crime',
    genreId: 80
  },
  drama: {
    key: 'drama',
    genreId: 18
  },
  comedy: {
    key: 'comedy',
    genreId: 35
  },
  sciFiFantasy: {
    key: 'sciFiFantasy',
    genreId: 10765
  },
  animation: {
    key: 'animation',
    genreId: 16
  },
  mystery: {
    key: 'mystery',
    genreId: 9648
  },
  actionAdventure: {
    key: 'actionAdventure',
    genreId: 10759
  },
  family: {
    key: 'family',
    genreId: 10751
  },
  kids: {
    key: 'kids',
    genreId: 10762
  },
  warPolitics: {
    key: 'warPolitics',
    genreId: 10768
  },
  western: {
    key: 'western',
    genreId: 37
  },
  soap: {
    key: 'soap',
    genreId: 10766
  }
});
