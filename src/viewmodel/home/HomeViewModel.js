import { BaseViewModel } from '../BaseViewModel.js';
import { movieRepository as defaultMovieRepository } from '../../repository/movies/MovieRepository.js';
import { seriesRepository as defaultSeriesRepository } from '../../repository/series/SeriesRepository.js';
import { cameoRepository as defaultCameoRepository } from '../../repository/cameos/CameoRepository.js';

/**
 * HomeViewModel
 * MVVM ViewModel aggregating Home page sections (Trending Movies, Trending TV Series,
 * Cameo-Heavy Movies, Cameo-Heavy Series, and Featured Highlight) via Repositories.
 */
export class HomeViewModel extends BaseViewModel {
  /**
   * @param {Object} [repositories={}]
   * @param {import('../../repository/movies/MovieRepository.js').MovieRepository} [repositories.movieRepository]
   * @param {import('../../repository/series/SeriesRepository.js').SeriesRepository} [repositories.seriesRepository]
   * @param {import('../../repository/cameos/CameoRepository.js').CameoRepository} [repositories.cameoRepository]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(
    {
      movieRepository = defaultMovieRepository,
      seriesRepository = defaultSeriesRepository,
      cameoRepository = defaultCameoRepository
    } = {},
    options = {}
  ) {
    super(
      {
        featuredMovie: null,
        trendingMovies: [],
        trendingSeries: [],
        cameoHeavyMovies: [],
        cameoHeavySeries: []
      },
      options
    );
    this.movieRepository = movieRepository;
    this.seriesRepository = seriesRepository;
    this.cameoRepository = cameoRepository;
  }

  /**
   * Load all Home page feed sections in parallel with offline fallback support
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {string} [params.language]
   * @returns {Promise<Object|null>}
   */
  loadHomeFeed = async ({ timeWindow = 'month', language = this.language } = {}) => {
    return this.runAsync(
      'loadHomeFeed',
      async () => {
        const [trendingMoviesRes, trendingSeriesRes, cameoMoviesRes, cameoSeriesRes] = await Promise.all([
          this.movieRepository.getTrendingMovies({ timeWindow, page: 1, language }),
          this.seriesRepository.getTrendingSeries({ timeWindow, page: 1, language }),
          this.cameoRepository.getCameoHeavyMovies({ page: 1, language }),
          this.cameoRepository.getCameoHeavySeries({ page: 1, language })
        ]);

        const trendingMovies = trendingMoviesRes.results || [];
        const trendingSeries = trendingSeriesRes.results || [];
        const cameoHeavyMovies = cameoMoviesRes.results || [];
        const cameoHeavySeries = cameoSeriesRes.results || [];

        return {
          featuredMovie: cameoHeavyMovies[0] || trendingMovies[0] || null,
          trendingMovies,
          trendingSeries,
          cameoHeavyMovies,
          cameoHeavySeries
        };
      },
      (feed) => feed
    );
  };
}

export default HomeViewModel;
