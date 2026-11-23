import { Cameo } from '../../models/Cameo.js';

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
