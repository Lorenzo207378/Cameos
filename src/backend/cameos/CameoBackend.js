import { apiService as defaultApiService } from '../../service/ApiService.js';

const CAMEO_KEYWORD_ID = '179430';

/**
 * CameoBackend
 * Scope: Detection, filtering, scoring and ranking of cameos across series, seasons, episodes, and actor careers.
 * Implements the domain cameo detection algorithms specified in TMDB documentation.
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
   * @returns {Array<any>}
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

        return {
          ...actor,
          isCameoHighlight: isExplicitCameo || isSelf || isFamous,
          cameoBadge: badge,
          isVoiceActor: isVoice,
          character: charName
        };
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  /**
   * Discover movies known for frequent cameos (TMDB keyword 179430)
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @returns {Promise<any>}
   */
  async getCameoHeavyMovies({ page = 1, sortBy = 'popularity.desc' } = {}) {
    return this.apiService.discoverMovie({
      page,
      with_keywords: CAMEO_KEYWORD_ID,
      sort_by: sortBy
    });
  }

  /**
   * Get movie cameos by analyzing cast credits and billing order
   * @param {object} params
   * @param {number|string} params.movieId
   * @param {number} [params.minPopularity=8]
   * @returns {Promise<{ movie: any, cameos: Array<any>, allCast: Array<any> }>}
   */
  async getMovieCameos({ movieId, minPopularity = 8 } = {}) {
    if (!movieId) throw new Error('movieId is required');

    const movieData = await this.apiService.getMovieDetails(movieId, {
      append_to_response: 'credits'
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

      return {
        ...actor,
        isCameoHighlight: isExplicitCameo || isSelf || isFamousGuest,
        cameoBadge: badge,
        isVoiceActor: isVoice,
        character: charName
      };
    });

    const highlightedCameos = classified.filter((star) => star.isCameoHighlight).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return {
      movie: {
        id: movieData.id,
        title: movieData.title,
        original_title: movieData.original_title,
        overview: movieData.overview,
        release_date: movieData.release_date,
        poster_path: movieData.poster_path,
        backdrop_path: movieData.backdrop_path,
        vote_average: movieData.vote_average
      },
      cameos: highlightedCameos,
      allCast: classified
    };
  }

  /**
   * Get all career movie cameos for a given actor
   * @param {object} params
   * @param {number|string} params.personId
   * @returns {Promise<Array<any>>}
   */
  async getActorMovieCameos({ personId } = {}) {
    if (!personId) throw new Error('personId is required');

    const personData = await this.apiService.getPersonDetails(personId, {
      append_to_response: 'movie_credits'
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

        return {
          id: credit.id,
          title: credit.title,
          character: charName,
          order: credit.order,
          release_date: credit.release_date,
          poster_path: credit.poster_path,
          backdrop_path: credit.backdrop_path,
          vote_average: credit.vote_average,
          popularity: credit.popularity,
          cameoBadge: badge
        };
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
   * @returns {Promise<{ episode: any, cameos: Array<any>, allGuestStars: Array<any> }>}
   */
  async getEpisodeCameos({ seriesId, seasonNumber, episodeNumber, minPopularity = 12 } = {}) {
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    const episodeData = await this.apiService.getEpisodeDetails(seriesId, seasonNumber, episodeNumber, {
      append_to_response: 'credits'
    });

    const guestStars = episodeData.guest_stars || episodeData.credits?.guest_stars || [];
    const classified = this.extractCameosFromGuestStars(guestStars, minPopularity);
    const highlightedCameos = classified.filter((star) => star.isCameoHighlight);

    return {
      episode: {
        id: episodeData.id,
        name: episodeData.name,
        episode_number: episodeData.episode_number,
        season_number: episodeData.season_number,
        overview: episodeData.overview,
        air_date: episodeData.air_date,
        still_path: episodeData.still_path,
        vote_average: episodeData.vote_average
      },
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
   * @returns {Promise<{ season: any, episodesWithCameos: Array<any>, seasonCameos: Array<any> }>}
   */
  async getSeasonCameos({ seriesId, seasonNumber, minPopularity = 12 } = {}) {
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    const seasonData = await this.apiService.getSeasonDetails(seriesId, seasonNumber, {
      append_to_response: 'aggregate_credits'
    });

    const episodes = seasonData.episodes || [];
    const uniqueActorsMap = new Map();

    const episodesWithCameos = episodes.map((ep) => {
      const episodeCameos = this.extractCameosFromGuestStars(ep.guest_stars || [], minPopularity);
      const highlighted = episodeCameos.filter((actor) => actor.isCameoHighlight);

      highlighted.forEach((actor) => {
        if (!uniqueActorsMap.has(actor.id)) {
          uniqueActorsMap.set(actor.id, {
            ...actor,
            appearedInEpisodes: [ep.episode_number]
          });
        } else {
          uniqueActorsMap.get(actor.id).appearedInEpisodes.push(ep.episode_number);
        }
      });

      return {
        id: ep.id,
        episode_number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        still_path: ep.still_path,
        cameos: highlighted
      };
    });

    return {
      season: {
        id: seasonData.id,
        name: seasonData.name,
        season_number: seasonData.season_number,
        overview: seasonData.overview,
        poster_path: seasonData.poster_path,
        episode_count: episodes.length
      },
      episodesWithCameos,
      seasonCameos: Array.from(uniqueActorsMap.values()).sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    };
  }

  /**
   * Detect VIP cameos at the series level using aggregate credits ratio:
   * Actor with high popularity who only appeared in 1 or 2 episodes, or plays themselves.
   * @param {object} params
   * @param {number|string} params.seriesId
   * @param {number} [params.maxEpisodes=2]
   * @param {number} [params.minPopularity=10]
   * @returns {Promise<Array<any>>}
   */
  async getSeriesVipCameos({ seriesId, maxEpisodes = 2, minPopularity = 10 } = {}) {
    if (!seriesId) throw new Error('seriesId is required');

    const seriesData = await this.apiService.getTvSeriesDetails(seriesId, {
      append_to_response: 'aggregate_credits'
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

        return {
          id: actor.id,
          name: actor.name,
          profile_path: actor.profile_path,
          popularity: actor.popularity,
          total_episode_count: actor.total_episode_count,
          character: charName,
          roles: actor.roles || [],
          cameoBadge: badge,
          isCameoHighlight: true
        };
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  /**
   * Get all career TV cameos for a given actor (appearances in 1 or 2 episodes or playing self)
   * @param {object} params
   * @param {number|string} params.personId
   * @returns {Promise<Array<any>>}
   */
  async getActorCareerCameos({ personId } = {}) {
    if (!personId) throw new Error('personId is required');

    const personData = await this.apiService.getPersonDetails(personId, {
      append_to_response: 'tv_credits'
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

        return {
          id: credit.id,
          name: credit.name,
          character: charName,
          episode_count: credit.episode_count,
          first_air_date: credit.first_air_date,
          poster_path: credit.poster_path,
          backdrop_path: credit.backdrop_path,
          vote_average: credit.vote_average,
          popularity: credit.popularity,
          cameoBadge: badge
        };
      })
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
}

export const cameoBackend = new CameoBackend();
export default CameoBackend;
