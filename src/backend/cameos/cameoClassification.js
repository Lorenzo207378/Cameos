import { Cameo } from '../../models/Cameo.js';
import { resolveLocalizedText } from '../../models/utils/modelUtils.js';

export const MAIN_CAST_CUTOFF = 8;

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

  const isExplicitCameo = CAMEO_ROLE_REGEX.cameo.test(charName);
  const isSelf =
    CAMEO_ROLE_REGEX.self.test(charName) ||
    Boolean(actorLower && charLower && charLower.includes(actorLower));
  const isVoice = CAMEO_ROLE_REGEX.voice.test(charName);

  return { charName, isExplicitCameo, isSelf, isVoice };
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
  if (isSelf) return 'VIP (Se stesso)';
  if (isExplicitCameo) return 'Cameo';
  if (isFamousGuest) return defaultFamousBadge;
  return null;
}

/**
 * Inspect a guest stars array and classify cameos into typed Cameo domain models.
 * @param {Array<Object>} [guestStars=[]]
 * @param {number} [minPopularity=12]
 * @returns {Array<Cameo>}
 */
export function extractCameosFromGuestStars(guestStars = [], minPopularity = 12) {
  if (!Array.isArray(guestStars)) return [];

  const mapped = guestStars.map((actor) => {
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
 * Filter out top-billed main cast members (first `MAIN_CAST_CUTOFF` entries) from a cameo list.
 * @param {Array<Cameo>} cameos
 * @param {Array<Object>} [cast=[]]
 * @returns {Array<Cameo>}
 */
export function excludeMainCastCameos(cameos, cast = []) {
  if (!Array.isArray(cameos) || cameos.length === 0) return [];
  const mainCast = (Array.isArray(cast) ? cast : []).slice(0, MAIN_CAST_CUTOFF);
  if (mainCast.length === 0) return cameos;

  const castIds = new Set(
    mainCast.map((member) => member?.id).filter((id) => id !== undefined && id !== null)
  );
  const castNames = new Set(
    mainCast
      .map((member) => (member?.name || member?.original_name || '').trim().toLowerCase())
      .filter(Boolean)
  );

  return cameos.filter((cameo) => {
    if (cameo?.id !== undefined && cameo?.id !== null && castIds.has(cameo.id)) {
      return false;
    }
    const cameoName = (cameo?.name || '').trim().toLowerCase();
    return !castNames.has(cameoName);
  });
}

/**
 * Classify cameos from a movie payload or Movie domain model using its already-loaded cast credits.
 * @param {Object|null} movieData
 * @param {Object} [options={}]
 * @param {number} [options.minPopularity=8]
 * @param {string} [options.language='it-IT']
 * @param {boolean} [options.excludeMainCast=false]
 * @returns {{ cameos: Array<Cameo>, allCast: Array<Cameo> }}
 */
export function extractCameosFromMovieCast(
  movieData,
  { minPopularity = 8, language = 'it-IT', excludeMainCast = false } = {}
) {
  if (!movieData) return { cameos: [], allCast: [] };

  const cast = movieData.cast || movieData.credits?.cast || [];
  const mediaTitle = resolveLocalizedText(movieData.titles || movieData.title, language);

  const allCast = cast.map((actor) => {
    const { charName, isExplicitCameo, isSelf, isVoice } = analyzeCameoRole(actor.name, actor.character);
    const isMinorRole = (actor.order || 0) >= MAIN_CAST_CUTOFF;
    const isFamousGuest = isMinorRole && (Number(actor.popularity) || 0) >= minPopularity;

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
  const cameos = excludeMainCast ? excludeMainCastCameos(highlighted, cast) : highlighted;

  return { cameos, allCast };
}

/**
 * Classify VIP cameos from a TV series payload or Series domain model using its aggregate credits cast.
 * Detects popular short-run actors (<= maxEpisodes) or explicit cameo / self roles.
 * @param {Object|null} seriesData
 * @param {Object} [options={}]
 * @param {number} [options.maxEpisodes=2]
 * @param {number} [options.minPopularity=10]
 * @param {string} [options.language='it-IT']
 * @returns {Array<Cameo>}
 */
export function extractVipCameosFromSeriesCast(
  seriesData,
  { maxEpisodes = 2, minPopularity = 10, language = 'it-IT' } = {}
) {
  if (!seriesData) return [];

  const cast = seriesData.cast || seriesData.aggregate_credits?.cast || seriesData.credits?.cast || [];
  const mediaId = seriesData.id ?? null;
  const mediaTitle = resolveLocalizedText(seriesData.names || seriesData.name, language);
  /** @type {Array<Cameo>} */
  const vipCameos = [];

  for (const actor of cast) {
    const episodeCount = actor.total_episode_count || 0;
    const pop = Number(actor.popularity) || 0;
    const { charName, isExplicitCameo, isSelf } = analyzeCameoRole(
      actor.name,
      actor.roles?.[0]?.character || actor.character
    );
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
        cameoBadge: resolveCameoBadge(isSelf, isExplicitCameo, true, 'VIP Guest Star'),
        isCameoHighlight: true,
        mediaId,
        mediaType: 'tv',
        mediaTitles: seriesData.names || null,
        mediaTitle
      })
    );
  }

  return sortCameosByPopularity(vipCameos);
}
