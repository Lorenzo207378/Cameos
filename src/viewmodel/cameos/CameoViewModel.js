import { BaseViewModel } from '../BaseViewModel.js';
import { cameoRepository as defaultCameoRepository } from '../../repository/cameos/CameoRepository.js';

/**
 * CameoViewModel
 * MVVM ViewModel mediating between CameoRepository and Cameo UI components.
 * Holds observable state for cameo-heavy series/movies, episode/season/series/movie cameos, and actor career cameos.
 */
export class CameoViewModel extends BaseViewModel {
  /**
   * @param {import('../../repository/cameos/CameoRepository.js').CameoRepository} [repository]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(repository = defaultCameoRepository, options = {}) {
    super(
      {
        cameoHeavySeries: [],
        cameoHeavyMovies: [],
        movieCameos: { movie: null, cameos: [], allCast: [] },
        episodeCameos: { episode: null, cameos: [], allGuestStars: [] },
        seasonCameos: { season: null, episodesWithCameos: [], seasonCameos: [] },
        seriesVipCameos: [],
        actorMovieCameos: [],
        actorCareerCameos: []
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Load TV series known for frequent cameos
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadCameoHeavySeries = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'loadCameoHeavySeries',
      () => this.repository.getCameoHeavySeries({ ...params, language }),
      (response) => ({
        cameoHeavySeries: response.results || []
      })
    );
  };

  /**
   * Load movies known for frequent cameos
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadCameoHeavyMovies = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'loadCameoHeavyMovies',
      () => this.repository.getCameoHeavyMovies({ ...params, language }),
      (response) => ({
        cameoHeavyMovies: response.results || []
      })
    );
  };

  /**
   * Load cameos detected in a movie
   * @param {number|string} movieId
   * @param {number} [minPopularity=8]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadMovieCameos = async (movieId, minPopularity = 8, language = this.language) => {
    return this.runAsync(
      'loadMovieCameos',
      () => this.repository.getMovieCameos({ movieId, minPopularity, language }),
      (result) => ({
        movieCameos: result
      })
    );
  };

  /**
   * Load cameos detected in a TV episode
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number|string} episodeNumber
   * @param {number} [minPopularity=12]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadEpisodeCameos = async (seriesId, seasonNumber, episodeNumber, minPopularity = 12, language = this.language) => {
    return this.runAsync(
      'loadEpisodeCameos',
      () => this.repository.getEpisodeCameos({ seriesId, seasonNumber, episodeNumber, minPopularity, language }),
      (result) => ({
        episodeCameos: result
      })
    );
  };

  /**
   * Load cameos across all episodes of a season
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number} [minPopularity=12]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadSeasonCameos = async (seriesId, seasonNumber, minPopularity = 12, language = this.language) => {
    return this.runAsync(
      'loadSeasonCameos',
      () => this.repository.getSeasonCameos({ seriesId, seasonNumber, minPopularity, language }),
      (result) => ({
        seasonCameos: result
      })
    );
  };

  /**
   * Load VIP cameos across an entire TV series
   * @param {number|string} seriesId
   * @param {number} [maxEpisodes=2]
   * @param {number} [minPopularity=10]
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadSeriesVipCameos = async (seriesId, maxEpisodes = 2, minPopularity = 10, language = this.language) => {
    return this.runAsync(
      'loadSeriesVipCameos',
      () => this.repository.getSeriesVipCameos({ seriesId, maxEpisodes, minPopularity, language }),
      (list) => ({
        seriesVipCameos: list || []
      })
    );
  };

  /**
   * Load career movie cameos for a specific actor
   * @param {number|string} personId
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadActorMovieCameos = async (personId, language = this.language) => {
    return this.runAsync(
      'loadActorMovieCameos',
      () => this.repository.getActorMovieCameos({ personId, language }),
      (list) => ({
        actorMovieCameos: list || []
      })
    );
  };

  /**
   * Load career TV cameos for a specific actor
   * @param {number|string} personId
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadActorCareerCameos = async (personId, language = this.language) => {
    return this.runAsync(
      'loadActorCareerCameos',
      () => this.repository.getActorCareerCameos({ personId, language }),
      (list) => ({
        actorCareerCameos: list || []
      })
    );
  };
}

export default CameoViewModel;
