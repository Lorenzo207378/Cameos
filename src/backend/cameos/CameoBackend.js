import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Cameo, Movie, Series, Season, Episode, resolveLocalizedText, isExcludedMedia } from '../../models/utils/index.js';
import { BaseBackend } from '../BaseBackend.js';

const CAMEO_KEYWORD_ID = '179430';

/**
 * CameoBackend
 * Scope: Detection, filtering, scoring and ranking of cameos across series, seasons, episodes, and actor careers.
 * Implements domain cameo detection algorithms and returns typed domain models (Cameo, Movie, Series, Season, Episode).
 */
export class CameoBackend extends BaseBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    super(apiService);
  }

  /**
   * Regular expressions for detecting cameo conventions in character names
   */
  static REGEX = {
    cameo: /\b(self|himself|herself|se stesso|se stessa|cameo|uncredited|non accreditato)\b/i,
    self: /\b(self|himself|herself|se stesso|se stessa)\b/i,
    voice: /\b(voice|voce)\b/i
  };

  /**
   * Analyze actor and character names for cameo, self-role, and voice-acting indicators
   * @param {string} [actorName='']
   * @param {string} [characterName='']
   * @returns {{ charName: string, isExplicitCameo: boolean, isSelf: boolean, isVoice: boolean }}
   */
  _analyzeRole(actorName = '', characterName = '') {
    const charName = characterName || '';
    const charLower = charName.trim().toLowerCase();
    const actorLower = (actorName || '').trim().toLowerCase();

    const isExplicitCameo = CameoBackend.REGEX.cameo.test(charName);
    const isSelf =
      CameoBackend.REGEX.self.test(charName) ||
      Boolean(actorLower && charLower && charLower.includes(actorLower));
    const isVoice = CameoBackend.REGEX.voice.test(charName);

    return { charName, isExplicitCameo, isSelf, isVoice };
  }

  /**
   * Sort cameo list by descending popularity
   * @param {Array<Cameo>} list
   * @returns {Array<Cameo>}
   */
  _sortByPopularity(list) {
    return list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  /**
   * Resolve cameo badge label from role flags
   * @param {boolean} isSelf
   * @param {boolean} isExplicitCameo
   * @param {boolean} isFamousGuest
   * @param {string|null} [defaultFamousBadge='Special Guest Star']
   * @returns {string|null}
   */
  _resolveBadge(isSelf, isExplicitCameo, isFamousGuest, defaultFamousBadge = 'Special Guest Star') {
    if (isSelf) return 'VIP (Se stesso)';
    if (isExplicitCameo) return 'Cameo';
    if (isFamousGuest) return defaultFamousBadge;
    return null;
  }

  /**
   * Helper algorithm to inspect guest stars array and classify cameos
   * @param {Array<Object>} [guestStars=[]]
   * @param {number} [minPopularity=12]
   * @returns {Array<Cameo>}
   */
  extractCameosFromGuestStars(guestStars = [], minPopularity = 12) {
    if (!Array.isArray(guestStars)) return [];

    const mapped = guestStars.map((actor) => {
      const { charName, isExplicitCameo, isSelf, isVoice } = this._analyzeRole(actor.name, actor.character);
      const isFamous = (Number(actor.popularity) || 0) >= minPopularity;

      return new Cameo({
        ...actor,
        isCameoHighlight: isExplicitCameo || isSelf || isFamous,
        cameoBadge: this._resolveBadge(isSelf, isExplicitCameo, isFamous, 'Special Guest Star'),
        isVoiceActor: isVoice,
        character: charName
      });
    });

    return this._sortByPopularity(mapped);
  }

  /**
   * Discover TV series known for frequent cameos (TMDB keyword 179430)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getCameoHeavySeries({ page = 1, sortBy = 'popularity.desc', language } = {}) {
    /** @type {import('../../service/ApiServiceHelpers.js').ApiPage} */
    const data = await this.apiService.discoverTv({
      page,
      with_keywords: CAMEO_KEYWORD_ID,
      sort_by: sortBy,
      language
    });

    return this._mapPaginatedResults(data, (item) => new Series(item));
  }

  /**
   * Discover movies known for frequent cameos (TMDB keyword 179430)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getCameoHeavyMovies({ page = 1, sortBy = 'popularity.desc', language } = {}) {
    /** @type {import('../../service/ApiServiceHelpers.js').ApiPage} */
    const data = await this.apiService.discoverMovie({
      page,
      with_keywords: CAMEO_KEYWORD_ID,
      sort_by: sortBy,
      language
    });

    return this._mapPaginatedResults(data, (item) => new Movie(item));
  }

  /**
   * Get famous movie cameos dynamically from TMDB cameo-heavy movies
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=8]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, totalPages: number, totalResults: number, results: Array<Cameo>, hasMore: boolean }>}
   */
  async getFamousCameos({ page = 1, limit = 8, language } = {}) {
    const { candidateMovies, totalPages } = await this._getFamousCandidateMovies(page, language);

    const cameos = [];
    for (const movie of candidateMovies) {
      if (cameos.length >= limit) break;
      try {
        await this._appendFamousMovieCameos(cameos, movie, limit, language);
      } catch {
        // Continue with next movie
      }
    }

    const totalResults = totalPages * limit;

    return {
      page,
      totalPages,
      totalResults,
      results: cameos,
      hasMore: page < totalPages
    };
  }

  /** Fetch the four-movie window backing a famous-cameo page. */
  async _getFamousCandidateMovies(page, language) {
    const moviesPerPage = 4;
    const heavyPage = Math.floor(((page - 1) * moviesPerPage) / 20) + 1;
    const movieOffsetInHeavy = ((page - 1) * moviesPerPage) % 20;

    const heavyRes = await this.getCameoHeavyMovies({
      page: heavyPage,
      sortBy: 'vote_count.desc',
      language
    });

    const candidateMovies = (heavyRes.results || []).slice(movieOffsetInHeavy, movieOffsetInHeavy + moviesPerPage);

    if (candidateMovies.length < moviesPerPage && heavyRes.total_pages > heavyPage) {
      try {
        const nextHeavy = await this.getCameoHeavyMovies({
          page: heavyPage + 1,
          sortBy: 'vote_count.desc',
          language
        });
        const needed = moviesPerPage - candidateMovies.length;
        candidateMovies.push(...(nextHeavy.results || []).slice(0, needed));
      } catch {
        // Fallback silently if next heavy page cannot be retrieved
      }
    }

    return { candidateMovies, totalPages: Math.max(50, (heavyRes?.total_pages || 25) * 5) };
  }

  /** Append at most two popular cameos per movie, preserving the page limit and identity rules. */
  async _appendFamousMovieCameos(cameos, movie, limit, language) {
    const movieCameos = await this.getMovieCameos({
      movieId: movie.id,
      minPopularity: 4,
      language
    });
    const sorted = (movieCameos?.cameos || []).sort(
      (a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0)
    );
    for (const c of sorted.slice(0, 2)) {
      if (cameos.length >= limit) break;
      const isDup = cameos.some(
        (dc) => Number(dc.id) === Number(c.id) && Number(dc.mediaId) === Number(movie.id)
      );
      if (!isDup) {
        cameos.push(
          new Cameo({
            ...c,
            mediaId: movie.id,
            mediaType: 'movie',
            mediaTitle: movie.getTitle?.(language || this.apiService.defaultLanguage) || movie.title,
            posterUrl: movie.posterUrl,
            backdropUrl: movie.backdropUrl,
            voteAverage: movie.voteAverage,
            badge: c.cameoBadge || 'Cameo Celebre',
            cameoBadge: c.cameoBadge || 'Cameo Celebre',
            isCameoHighlight: true
          })
        );
      }
    }
  }

  getFamousCameosTotalCount() {
    return 1000;
  }

  /**
   * Get movie cameos by analyzing cast credits and billing order
   * @param {Object} [params={}]
   * @param {number|string} [params.movieId]
   * @param {number} [params.minPopularity=8]
   * @param {string} [params.language]
   * @returns {Promise<{ movie: Movie, cameos: Array<Cameo>, allCast: Array<Cameo> }>}
   */
  async getMovieCameos({ movieId, minPopularity = 8, language } = {}) {
    if (!movieId) throw new Error('movieId is required');

    /** @type {ConstructorParameters<typeof Movie>[0]} */
    const movieData = await this.apiService.getMovieDetails(movieId, {
      append_to_response: 'credits',
      language
    });

    const cast = movieData.credits?.cast || [];

    const allCast = cast.map((actor) => {
      const { charName, isExplicitCameo, isSelf, isVoice } = this._analyzeRole(actor.name, actor.character);
      const isMinorRole = (actor.order || 0) >= 8;
      const isFamousGuest = isMinorRole && (Number(actor.popularity) || 0) >= minPopularity;

      return new Cameo({
        ...actor,
        mediaId: movieData.id,
        mediaType: 'movie',
        mediaTitle: resolveLocalizedText(movieData.titles || movieData.title, language || this.apiService.defaultLanguage),
        isCameoHighlight: isExplicitCameo || isSelf || isFamousGuest,
        cameoBadge: this._resolveBadge(isSelf, isExplicitCameo, isFamousGuest, 'Special Guest Star'),
        isVoiceActor: isVoice,
        character: charName
      });
    });

    const highlightedCameos = this._sortByPopularity(allCast.filter((star) => star.isCameoHighlight));
    const movie = new Movie({ ...movieData, cameos: highlightedCameos });

    return {
      movie,
      cameos: movie.cameos,
      allCast
    };
  }

  /**
   * Get all career movie cameos for a given actor
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorMovieCameos({ personId, language } = {}) {
    return this._getActorCareerCameos(personId, language, 'movie');
  }

  /**
   * Get episode cameos with full badge classifications
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number|string} [params.episodeNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ episode: Episode, cameos: Array<Cameo>, allGuestStars: Array<Cameo> }>}
   */
  async getEpisodeCameos({ seriesId, seasonNumber, episodeNumber, minPopularity = 12, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    /** @type {ConstructorParameters<typeof Episode>[0] & {credits?: {guest_stars?: Object[]}}} */
    const episodeData = await this.apiService.getEpisodeDetails(seriesId, seasonNumber, episodeNumber, {
      append_to_response: 'credits',
      language
    });

    const guestStars = episodeData.guest_stars || episodeData.credits?.guest_stars || [];
    const allGuestStars = this.extractCameosFromGuestStars(guestStars, minPopularity);
    const cameos = allGuestStars.filter((star) => star.isCameoHighlight);

    const episode = new Episode({
      ...episodeData,
      seriesId,
      seasonNumber,
      cameos
    });

    return {
      episode,
      cameos,
      allGuestStars
    };
  }

  /**
   * Get all cameos across episodes of a season
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ season: Season, episodesWithCameos: Array<Episode>, seasonCameos: Array<Cameo> }>}
   */
  async getSeasonCameos({ seriesId, seasonNumber, minPopularity = 12, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    /** @type {ConstructorParameters<typeof Season>[0]} */
    const seasonData = await this.apiService.getSeasonDetails(seriesId, seasonNumber, {
      append_to_response: 'aggregate_credits',
      language
    });

    const episodes = seasonData.episodes || [];
    const uniqueActorsMap = new Map();

    const episodesWithCameos = episodes.map((ep) => {
      const highlighted = this.extractCameosFromGuestStars(ep.guest_stars || [], minPopularity).filter(
        (actor) => actor.isCameoHighlight
      );

      for (const actor of highlighted) {
        if (!uniqueActorsMap.has(actor.id)) {
          uniqueActorsMap.set(
            actor.id,
            new Cameo({
              ...actor,
              appearedInEpisodes: [ep.episode_number]
            })
          );
        } else {
          uniqueActorsMap.get(actor.id).appearedInEpisodes.push(ep.episode_number);
        }
      }

      return new Episode({
        ...ep,
        seriesId,
        seasonNumber,
        cameos: highlighted
      });
    });

    const seasonCameos = this._sortByPopularity(Array.from(uniqueActorsMap.values()));

    const season = new Season({
      ...seasonData,
      seriesId,
      seasonNumber,
      episodes: episodesWithCameos,
      seasonCameos
    });

    return {
      season,
      episodesWithCameos,
      seasonCameos
    };
  }

  /**
   * Detect VIP cameos at the series level using aggregate credits ratio:
   * Actor with high popularity who only appeared in 1 or 2 episodes, or plays themselves.
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number} [params.maxEpisodes=2]
   * @param {number} [params.minPopularity=10]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getSeriesVipCameos({ seriesId, maxEpisodes = 2, minPopularity = 10, language } = {}) {
    if (!seriesId) throw new Error('seriesId is required');

    const seriesData = await this.apiService.getTvSeriesDetails(seriesId, {
      append_to_response: 'aggregate_credits',
      language
    });

    const cast = seriesData.aggregate_credits?.cast || [];
    const vipCameos = [];

    for (const actor of cast) {
      const episodeCount = actor.total_episode_count || 0;
      const pop = actor.popularity || 0;
      const { charName, isExplicitCameo, isSelf } = this._analyzeRole(actor.name, actor.roles?.[0]?.character);
      const isShortRunVip = episodeCount > 0 && episodeCount <= maxEpisodes && (pop >= minPopularity || isSelf);

      if (!isShortRunVip && !isExplicitCameo) continue;

      vipCameos.push(
        new Cameo({
          id: actor.id,
          name: actor.name,
          profileUrl: actor.profileUrl,
          popularity: actor.popularity,
          totalEpisodeCount: episodeCount,
          episodeCount,
          character: charName,
          roles: actor.roles || [],
          cameoBadge: this._resolveBadge(isSelf, isExplicitCameo, true, 'VIP Guest Star'),
          isCameoHighlight: true,
          mediaId: seriesId,
          mediaType: 'tv',
          mediaTitle: resolveLocalizedText(seriesData.names || seriesData.name, language || this.apiService.defaultLanguage)
        })
      );
    }

    return this._sortByPopularity(vipCameos);
  }

  /**
   * Get all career TV cameos for a given actor (appearances in 1 or 2 episodes or playing self)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorCareerCameos({ personId, language } = {}) {
    return this._getActorCareerCameos(personId, language, 'tv');
  }

  /** Load acting credits and apply the career cameo policy for the requested media type. */
  async _getActorCareerCameos(personId, language, mediaType) {
    if (!personId) throw new Error('personId is required');
    const creditsKey = `${mediaType}_credits`;
    const personData = await this.apiService.getPersonDetails(personId, {
      append_to_response: creditsKey,
      language
    });
    const cameos = (personData[creditsKey]?.cast || [])
      .map((credit) => this._createCareerCameo(credit, personData.name || '', mediaType))
      .filter(Boolean);
    return this._sortByPopularity(cameos);
  }

  /** Classify and project a movie or TV credit without fetching additional data. */
  _createCareerCameo(credit, personName, mediaType) {
    if (isExcludedMedia(credit)) return null;
    const { charName, isExplicitCameo, isSelf } = this._analyzeRole(personName, credit.character);
    const isMovie = mediaType === 'movie';
    const episodeCount = credit.episode_count || 0;
    const isGuest = isMovie ? (credit.order || 0) >= 8 : episodeCount > 0 && episodeCount <= 2;
    if (!isGuest && !isExplicitCameo && !isSelf) return null;

    const title = isMovie ? credit.title : credit.name;
    return new Cameo({
      id: credit.id,
      mediaId: credit.id,
      mediaType,
      title,
      mediaTitle: title,
      name: personName,
      character: charName,
      ...(isMovie
        ? { order: credit.order, releaseDate: credit.release_date }
        : { episodeCount: credit.episode_count, firstAirDate: credit.first_air_date }),
      posterUrl: credit.posterUrl,
      backdropUrl: credit.backdropUrl,
      voteAverage: credit.vote_average,
      popularity: credit.popularity,
      cameoBadge: this._resolveBadge(isSelf, isExplicitCameo, true, 'Guest Star'),
      isCameoHighlight: true,
      genreIds: credit.genre_ids || credit.genreIds || []
    });
  }

  /**
   * Alias for getActorCareerCameos
   * @param {Object} [params={}]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorTVCameos(params = {}) {
    return this.getActorCareerCameos(params);
  }
}

export const cameoBackend = new CameoBackend();
export default CameoBackend;
