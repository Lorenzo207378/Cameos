import { Cameo } from '../../models/Cameo.js';
import { UNCREDITED_REGEX, resolveLocalizedText, stripUncredited } from '../../models/utils/modelUtils.js';
import { dedupeCast, excludeCameosFromCast, mergeCharacterRoles } from '../../utils/formatters.js';

export const MAIN_CAST_CUTOFF = 8;
export const MAX_SERIES_CAMEO_EPISODES = 2;
export const DEFAULT_CAMEO_MIN_POPULARITY = 2;
export const FAMOUS_CAMEO_MIN_POPULARITY = 4;

/**
 * Regular expressions for detecting cameo conventions in character names.
 */
export const CAMEO_ROLE_REGEX = Object.freeze({
  cameo: /\b(self|himself|herself|se stesso|se stessa|cameo|uncredited|non accreditato)\b/i,
  self: /\b(self|himself|herself|se stesso|se stessa)\b/i,
  voice: /\b(voice|voce)\b/i
});

/**
 * Analyze actor and character names for cameo, self-role, and voice-acting indicators.
 * @param {string} [actorName='']
 * @param {string} [characterName='']
 * @returns {{ charName: string, isExplicitCameo: boolean, isSelf: boolean, isVoice: boolean }}
 */
export function analyzeCameoRole(actorName = '', characterName = '') {
  const charName = characterName || '';
  const charLower = charName.trim().toLowerCase();
  const actorLower = (actorName || '').trim().toLowerCase();

  return {
    charName,
    isExplicitCameo: CAMEO_ROLE_REGEX.cameo.test(charName),
    isSelf: CAMEO_ROLE_REGEX.self.test(charName) || Boolean(actorLower && charLower.includes(actorLower)),
    isVoice: CAMEO_ROLE_REGEX.voice.test(charName)
  };
}

/**
 * Sort cameo list by descending popularity.
 * @param {Array<Cameo>} list
 * @returns {Array<Cameo>}
 */
export function sortCameosByPopularity(list) {
  return list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

/**
 * Resolve cameo badge label from role flags.
 * @param {boolean} isSelf
 * @param {boolean} isExplicitCameo
 * @param {boolean} isFamousGuest
 * @param {string|null} [defaultFamousBadge='Special Guest Star']
 * @returns {string|null}
 */
export function resolveCameoBadge(isSelf, isExplicitCameo, isFamousGuest, defaultFamousBadge = 'Special Guest Star') {
  if (isSelf) return 'Cameo (Se stesso)';
  if (isExplicitCameo) return 'Cameo';
  if (isFamousGuest) return defaultFamousBadge;
  return null;
}

/**
 * Filter out top-billed main cast members (first `MAIN_CAST_CUTOFF` entries) from a cameo list.
 * @param {Array<Cameo>} cameos
 * @param {Array<Object>} [cast=[]]
 * @returns {Array<Cameo>}
 */
export function excludeMainCastCameos(cameos, cast = []) {
  return /** @type {Array<Cameo>} */ (
    excludeCameosFromCast(cameos, (Array.isArray(cast) ? cast : []).slice(0, MAIN_CAST_CUTOFF))
  );
}

/**
 * Inspect a guest stars array and classify cameos into typed Cameo domain models.
 * @param {Array<Object>} [guestStars=[]]
 * @param {number} [minPopularity=DEFAULT_CAMEO_MIN_POPULARITY]
 * @returns {Array<Cameo>}
 */
export function extractCameosFromGuestStars(guestStars = [], minPopularity = DEFAULT_CAMEO_MIN_POPULARITY) {
  if (!Array.isArray(guestStars)) return [];

  const mapped = dedupeCast(guestStars).map((actor) => {
    const { charName, isExplicitCameo, isSelf, isVoice } = analyzeCameoRole(actor.name, actor.character);
    const isFamous = (Number(actor.popularity) || 0) >= minPopularity;

    return new Cameo({
      ...actor,
      isCameoHighlight: isExplicitCameo || isSelf || isFamous,
      cameoBadge: resolveCameoBadge(isSelf, isExplicitCameo, isFamous, 'Special Guest Star'),
      isVoiceActor: isVoice,
      character: charName
    });
  });

  return sortCameosByPopularity(mapped);
}

/**
 * Classify cameos from a movie payload or Movie domain model using its already-loaded cast credits.
 * @param {Object|null} movieData
 * @param {Object} [options={}]
 * @param {number} [options.minPopularity=DEFAULT_CAMEO_MIN_POPULARITY]
 * @param {string} [options.language='it-IT']
 * @param {boolean} [options.excludeMainCast=false]
 * @returns {{ cameos: Array<Cameo>, allCast: Array<Cameo> }}
 */
export function extractCameosFromMovieCast(
  movieData,
  { minPopularity = DEFAULT_CAMEO_MIN_POPULARITY, language = 'it-IT', excludeMainCast = false } = {}
) {
  if (!movieData) return { cameos: [], allCast: [] };

  const uniqueCast = dedupeCast(movieData.cast || movieData.credits?.cast || []);
  const mediaTitle = resolveLocalizedText(movieData.titles || movieData.title, language);

  const allCast = uniqueCast.map((actor) => {
    const { charName, isExplicitCameo, isSelf, isVoice } = analyzeCameoRole(actor.name, actor.character);
    const isFamousGuest = (actor.order || 0) >= MAIN_CAST_CUTOFF && (Number(actor.popularity) || 0) >= minPopularity;

    return new Cameo({
      ...actor,
      mediaId: movieData.id,
      mediaType: 'movie',
      mediaTitles: movieData.titles || null,
      mediaTitle,
      isCameoHighlight: isExplicitCameo || isSelf || isFamousGuest,
      cameoBadge: resolveCameoBadge(isSelf, isExplicitCameo, isFamousGuest, 'Special Guest Star'),
      isVoiceActor: isVoice,
      character: charName
    });
  });

  const highlighted = sortCameosByPopularity(allCast.filter((star) => star.isCameoHighlight));
  const cameos = excludeMainCast ? excludeMainCastCameos(highlighted, uniqueCast) : highlighted;

  return { cameos, allCast };
}

/**
 * Classify cameos from a TV series payload or Series domain model using its aggregate credits cast.
 * Detects popular short-run actors (<= maxEpisodes) or explicit cameo / self roles.
 * @param {Object|null} seriesData
 * @param {Object} [options={}]
 * @param {number} [options.maxEpisodes=MAX_SERIES_CAMEO_EPISODES]
 * @param {number} [options.minPopularity=DEFAULT_CAMEO_MIN_POPULARITY]
 * @param {string} [options.language='it-IT']
 * @returns {Array<Cameo>}
 */
export function extractCameosFromSeriesCast(
  seriesData,
  { maxEpisodes = MAX_SERIES_CAMEO_EPISODES, minPopularity = DEFAULT_CAMEO_MIN_POPULARITY, language = 'it-IT' } = {}
) {
  if (!seriesData) return [];

  const uniqueCast = dedupeCast(seriesData.cast || seriesData.aggregate_credits?.cast || seriesData.credits?.cast || []);
  const mediaId = seriesData.id ?? null;
  const mediaTitle = resolveLocalizedText(seriesData.names || seriesData.name, language);
  const totalSeriesEpisodes = Number(seriesData.numberOfEpisodes ?? seriesData.number_of_episodes) || 0;
  /** @type {Array<Cameo>} */
  const seriesCameos = [];

  for (const actor of uniqueCast) {
    const episodeCount = actor.total_episode_count || 0;
    const rawRoles = Array.isArray(actor.roles) && actor.roles.length > 0
      ? actor.roles.map((r) => r?.character).filter(Boolean)
      : [actor.character].filter(Boolean);
    // Recurring actors (> maxEpisodes) are evaluated only on their primary role so a 1-episode
    // uncredited archive-footage credit never demotes a series regular into a cameo.
    const rolesToAnalyze = episodeCount > maxEpisodes ? [rawRoles[0] || ''] : (rawRoles.length ? rawRoles : ['']);
    const analyses = rolesToAnalyze.map((role) => analyzeCameoRole(actor.name, role));
    const isExplicitCameo = analyses.some((a) => a.isExplicitCameo);
    const isSelf = analyses.some((a) => a.isSelf);
    const isFullSeriesRun = totalSeriesEpisodes > 0 && episodeCount >= totalSeriesEpisodes;
    const isShortRunGuest = !isFullSeriesRun && episodeCount > 0 && episodeCount <= maxEpisodes && (Number(actor.popularity) || 0) >= minPopularity;

    if (!isShortRunGuest && !isExplicitCameo && !isSelf) continue;

    seriesCameos.push(
      new Cameo({
        id: actor.id,
        name: actor.name,
        profileUrl: actor.profileUrl,
        popularity: actor.popularity,
        totalEpisodeCount: episodeCount,
        episodeCount,
        character: mergeCharacterRoles(...rawRoles.map((role) => stripUncredited(role))),
        isUncredited: rawRoles.length > 0 && rawRoles.every((role) => UNCREDITED_REGEX.test(role)),
        roles: actor.roles || [],
        cameoBadge: resolveCameoBadge(isSelf, isExplicitCameo, true, 'Special Guest Star'),
        isCameoHighlight: true,
        mediaId,
        mediaType: 'tv',
        mediaTitles: seriesData.names || null,
        mediaTitle
      })
    );
  }

  return sortCameosByPopularity(seriesCameos);
}
