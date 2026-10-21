import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Cameo, Movie, Series, Season, Episode } from '../../models/index.js';

const CAMEO_KEYWORD_ID = '179430';

/**
 * CameoBackend
 * Scope: Detection, filtering, scoring and ranking of cameos across series, seasons, episodes, and actor careers.
 * Implements domain cameo detection algorithms and returns typed domain models (Cameo, Movie, Series, Season, Episode).
 */
export class CameoBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    this.apiService = apiService;
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
   * Helper algorithm to inspect guest stars array and classify cameos
   * @param {Array<any>} guestStars
   * @param {number} [minPopularity=12]
   * @returns {Array<Cameo>}
   */
  extractCameosFromGuestStars(guestStars = [], minPopularity = 12) {
    if (!Array.isArray(guestStars)) return [];

    return guestStars
      .map((actor) => {
        const charName = actor.character || '';
        const actorName = actor.name || '';
        const isExplicitCameo = CameoBackend.REGEX.cameo.test(charName);
        const isSelfWord = CameoBackend.REGEX.self.test(charName);
        const isPlayingSelfByName = Boolean(
          actorName &&
          charName &&
          (charName.trim().toLowerCase() === actorName.trim().toLowerCase() ||
            charName.toLowerCase().includes(actorName.toLowerCase()))
        );
        const isSelf = isSelfWord || isPlayingSelfByName;
        const isVoice = CameoBackend.REGEX.voice.test(charName);
        const actorPopularity = Number(actor.popularity) || 0;
        const isFamous = actorPopularity >= minPopularity;

        let badge = null;
        if (isSelf) {
          badge = 'VIP (Se stesso)';
        } else if (isExplicitCameo) {
          badge = 'Cameo';
        } else if (isFamous) {
          badge = 'Special Guest Star';
        }

        return new Cameo({
          ...actor,
          isCameoHighlight: isExplicitCameo || isSelf || isFamous,
          cameoBadge: badge,
          isVoiceActor: isVoice,
          character: charName
        });
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  /**
   * Discover TV series known for frequent cameos (TMDB keyword 179430)
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getCameoHeavySeries({ page = 1, sortBy = 'popularity.desc', language } = {}) {
    const data = await this.apiService.discoverTv({
      page,
      with_keywords: CAMEO_KEYWORD_ID,
      sort_by: sortBy,
      language
    });

    return {
      ...data,
      results: (data.results || []).map((item) => new Series(item))
    };
  }

  /**
   * Discover movies known for frequent cameos (TMDB keyword 179430)
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getCameoHeavyMovies({ page = 1, sortBy = 'popularity.desc', language } = {}) {
    const data = await this.apiService.discoverMovie({
      page,
      with_keywords: CAMEO_KEYWORD_ID,
      sort_by: sortBy,
      language
    });

    return {
      ...data,
      results: (data.results || []).map((item) => new Movie(item))
    };
  }

  /**
   * Get movie cameos by analyzing cast credits and billing order
   * @param {object} params
   * @param {number|string} params.movieId
   * @param {number} [params.minPopularity=8]
   * @param {string} [params.language]
   * @returns {Promise<{ movie: Movie, cameos: Array<Cameo>, allCast: Array<Cameo> }>}
   */
  async getMovieCameos({ movieId, minPopularity = 8, language } = {}) {
    if (!movieId) throw new Error('movieId is required');

    const movieData = await this.apiService.getMovieDetails(movieId, {
      append_to_response: 'credits',
      language
    });

    const cast = movieData.credits?.cast || [];

    const classified = cast.map((actor) => {
      const charName = actor.character || '';
      const actorName = actor.name || '';
      const isExplicitCameo = CameoBackend.REGEX.cameo.test(charName);
      const isSelfWord = CameoBackend.REGEX.self.test(charName);
      const isPlayingSelfByName = Boolean(
        actorName &&
        charName &&
        (charName.trim().toLowerCase() === actorName.trim().toLowerCase() ||
          charName.toLowerCase().includes(actorName.toLowerCase()))
      );
      const isSelf = isSelfWord || isPlayingSelfByName;
      const isVoice = CameoBackend.REGEX.voice.test(charName);
      const actorPopularity = Number(actor.popularity) || 0;
      const isMinorRole = (actor.order || 0) >= 8;
      const isFamousGuest = isMinorRole && actorPopularity >= minPopularity;

      let badge = null;
      if (isSelf) badge = 'VIP (Se stesso)';
      else if (isExplicitCameo) badge = 'Cameo';
      else if (isFamousGuest) badge = 'Special Guest Star';

      return new Cameo({
        ...actor,
        mediaId: movieData.id,
        mediaType: 'movie',
        mediaTitle: movieData.title,
        isCameoHighlight: isExplicitCameo || isSelf || isFamousGuest,
        cameoBadge: badge,
        isVoiceActor: isVoice,
        character: charName
      });
    });

    const highlightedCameos = classified.filter((star) => star.isCameoHighlight).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const movie = new Movie({
      ...movieData,
      cameos: highlightedCameos
    });

    return {
      movie,
      cameos: movie.cameos,
      allCast: classified
    };
  }

  /**
   * Get all career movie cameos for a given actor
   * @param {object} params
   * @param {number|string} params.personId
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorMovieCameos({ personId, language } = {}) {
    if (!personId) throw new Error('personId is required');

    const personData = await this.apiService.getPersonDetails(personId, {
      append_to_response: 'movie_credits',
      language
    });

    const castCredits = personData.movie_credits?.cast || [];
    const personName = personData.name || '';

    return castCredits
      .filter((credit) => {
        const charName = credit.character || '';
        const isExplicit = CameoBackend.REGEX.cameo.test(charName);
        const isSelf =
          CameoBackend.REGEX.self.test(charName) ||
          (Boolean(personName) && Boolean(charName) && (charName.toLowerCase() === personName.toLowerCase() || charName.toLowerCase().includes(personName.toLowerCase())));
        const isMinorRole = (credit.order || 0) >= 8;

        return isExplicit || isSelf || isMinorRole;
      })
      .map((credit) => {
        const charName = credit.character || '';
        const isExplicit = CameoBackend.REGEX.cameo.test(charName);
        const isSelf =
          CameoBackend.REGEX.self.test(charName) ||
          (Boolean(personName) && Boolean(charName) && (charName.toLowerCase() === personName.toLowerCase() || charName.toLowerCase().includes(personName.toLowerCase())));

        let badge = 'Cameo';
        if (isSelf) badge = 'VIP (Se stesso)';
        else if (!isExplicit) badge = 'Guest Star';

        return new Cameo({
          id: credit.id,
          mediaId: credit.id,
          mediaType: 'movie',
          title: credit.title,
          mediaTitle: credit.title,
          name: personName,
          character: charName,
          order: credit.order,
          releaseDate: credit.release_date,
          posterUrl: credit.posterUrl,
          backdropUrl: credit.backdropUrl,
          voteAverage: credit.vote_average,
          popularity: credit.popularity,
          cameoBadge: badge,
          isCameoHighlight: true
        });
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  /**
   * Get episode cameos with full badge classifications
   * @param {object} params
   * @param {number|string} params.seriesId
   * @param {number|string} params.seasonNumber
   * @param {number|string} params.episodeNumber
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ episode: Episode, cameos: Array<Cameo>, allGuestStars: Array<Cameo> }>}
   */
  async getEpisodeCameos({ seriesId, seasonNumber, episodeNumber, minPopularity = 12, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    const episodeData = await this.apiService.getEpisodeDetails(seriesId, seasonNumber, episodeNumber, {
      append_to_response: 'credits',
      language
    });

    const guestStars = episodeData.guest_stars || episodeData.credits?.guest_stars || [];
    const classified = this.extractCameosFromGuestStars(guestStars, minPopularity);
    const highlightedCameos = classified.filter((star) => star.isCameoHighlight);

    const episode = new Episode({
      ...episodeData,
      seriesId,
      seasonNumber,
      cameos: highlightedCameos
    });

    return {
      episode,
      cameos: highlightedCameos,
      allGuestStars: classified
    };
  }

  /**
   * Get all cameos across episodes of a season
   * @param {object} params
   * @param {number|string} params.seriesId
   * @param {number|string} params.seasonNumber
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ season: Season, episodesWithCameos: Array<Episode>, seasonCameos: Array<Cameo> }>}
   */
  async getSeasonCameos({ seriesId, seasonNumber, minPopularity = 12, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    const seasonData = await this.apiService.getSeasonDetails(seriesId, seasonNumber, {
      append_to_response: 'aggregate_credits',
      language
    });

    const episodes = seasonData.episodes || [];
    const uniqueActorsMap = new Map();

    const episodesWithCameos = episodes.map((ep) => {
      const episodeCameos = this.extractCameosFromGuestStars(ep.guest_stars || [], minPopularity);
      const highlighted = episodeCameos.filter((actor) => actor.isCameoHighlight);

      highlighted.forEach((actor) => {
        if (!uniqueActorsMap.has(actor.id)) {
          uniqueActorsMap.set(actor.id, new Cameo({
            ...actor,
            appearedInEpisodes: [ep.episode_number]
          }));
        } else {
          uniqueActorsMap.get(actor.id).appearedInEpisodes.push(ep.episode_number);
        }
      });

      return new Episode({
        ...ep,
        seriesId,
        seasonNumber,
        cameos: highlighted
      });
    });

    const seasonCameos = Array.from(uniqueActorsMap.values()).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

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
   * @param {object} params
   * @param {number|string} params.seriesId
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

    return cast
      .filter((actor) => {
        const episodeCount = actor.total_episode_count || 0;
        const pop = actor.popularity || 0;
        const charName = actor.roles?.[0]?.character || '';
        const actorName = actor.name || '';
        const isSelf =
          CameoBackend.REGEX.self.test(charName) ||
          (Boolean(actorName) && Boolean(charName) && (charName.toLowerCase() === actorName.toLowerCase() || charName.toLowerCase().includes(actorName.toLowerCase())));
        const isExplicitCameo = CameoBackend.REGEX.cameo.test(charName);

        // Highlight if star with few appearances or explicitly labeled cameo or playing self
        return (episodeCount > 0 && episodeCount <= maxEpisodes && (pop >= minPopularity || isSelf)) || isExplicitCameo;
      })
      .map((actor) => {
        const charName = actor.roles?.[0]?.character || '';
        const actorName = actor.name || '';
        const isSelf =
          CameoBackend.REGEX.self.test(charName) ||
          (Boolean(actorName) && Boolean(charName) && (charName.toLowerCase() === actorName.toLowerCase() || charName.toLowerCase().includes(actorName.toLowerCase())));
        const isExplicit = CameoBackend.REGEX.cameo.test(charName);

        let badge = 'VIP Guest Star';
        if (isSelf) badge = 'VIP (Se stesso)';
        else if (isExplicit) badge = 'Cameo';

        return new Cameo({
          id: actor.id,
          name: actor.name,
          profileUrl: actor.profileUrl,
          popularity: actor.popularity,
          totalEpisodeCount: actor.total_episode_count,
          episodeCount: actor.total_episode_count,
          character: charName,
          roles: actor.roles || [],
          cameoBadge: badge,
          isCameoHighlight: true,
          mediaId: seriesId,
          mediaType: 'tv',
          mediaTitle: seriesData.name
        });
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  /**
   * Get all career TV cameos for a given actor (appearances in 1 or 2 episodes or playing self)
   * @param {object} params
   * @param {number|string} params.personId
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorCareerCameos({ personId, language } = {}) {
    if (!personId) throw new Error('personId is required');

    const personData = await this.apiService.getPersonDetails(personId, {
      append_to_response: 'tv_credits',
      language
    });

    const castCredits = personData.tv_credits?.cast || [];
    const personName = personData.name || '';

    return castCredits
      .filter((credit) => {
        const count = credit.episode_count || 0;
        const charName = credit.character || '';
        const isExplicit = CameoBackend.REGEX.cameo.test(charName);
        const isSelf =
          CameoBackend.REGEX.self.test(charName) ||
          (Boolean(personName) && Boolean(charName) && (charName.toLowerCase() === personName.toLowerCase() || charName.toLowerCase().includes(personName.toLowerCase())));
        return (count > 0 && count <= 2) || isExplicit || isSelf;
      })
      .map((credit) => {
        const charName = credit.character || '';
        const isExplicit = CameoBackend.REGEX.cameo.test(charName);
        const isSelf =
          CameoBackend.REGEX.self.test(charName) ||
          (Boolean(personName) && Boolean(charName) && (charName.toLowerCase() === personName.toLowerCase() || charName.toLowerCase().includes(personName.toLowerCase())));

        let badge = 'Cameo';
        if (isSelf) badge = 'VIP (Se stesso)';
        else if (!isExplicit) badge = 'Guest Star';

        return new Cameo({
          id: credit.id,
          mediaId: credit.id,
          mediaType: 'tv',
          title: credit.name,
          mediaTitle: credit.name,
          name: personName,
          character: charName,
          episodeCount: credit.episode_count,
          firstAirDate: credit.first_air_date,
          posterUrl: credit.posterUrl,
          backdropUrl: credit.backdropUrl,
          voteAverage: credit.vote_average,
          popularity: credit.popularity,
          cameoBadge: badge,
          isCameoHighlight: true
        });
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
}

export const cameoBackend = new CameoBackend();
export default CameoBackend;
