import { dedupeCrew } from './formatters.js';
import { isExcludedMedia } from '../models/utils/index.js';

/** Identify creative roles in regular person credits and aggregated TV crew credits. */
export function getCreativeRoleKeys(credit) {
  const jobs = [credit.job, ...(credit.jobs || []).map((item) => item.job)];
  const roles = [];
  if (jobs.includes('Director')) roles.push('detail.directing');
  if (credit.department === 'Writing' || jobs.some((job) => ['Screenplay', 'Writer', 'Teleplay', 'Story', 'Novel', 'Characters'].includes(job))) {
    roles.push('detail.writing');
  }
  if (jobs.includes('Creator')) roles.push('detail.creation');
  return roles;
}

/** Preserve person IDs and names when extracting directors/writers from aggregated TV credits. */
export function getCreativeCrew(crew, roleKey) {
  return dedupeCrew(crew.filter((credit) => getCreativeRoleKeys(credit).includes(roleKey)));
}

function mediaKey(item, id = item.id) {
  return `${item.mediaType || item.media_type || 'movie'}:${Number(id)}`;
}

/** Keep acting cameos separate while preserving creative credits for the same media. */
export function selectPersonCredits({ cast = [], crew = [] }, cameos, mode) {
  if (mode !== 'crew') {
    const cameoKeys = new Set(cameos.map((cameo) => mediaKey(cameo, cameo.mediaId)));
    return cast.filter((credit) => !isExcludedMedia(credit) && !cameoKeys.has(mediaKey(credit)));
  }

  const credits = new Map();
  for (const credit of crew) {
    if (isExcludedMedia(credit)) continue;
    const roleKeys = getCreativeRoleKeys(credit);
    if (!roleKeys.length) continue;
    const key = mediaKey(credit);
    const existing = credits.get(key);
    credits.set(key, existing
      ? { ...existing, creditRoleKeys: [...new Set([...existing.creditRoleKeys, ...roleKeys])] }
      : { ...credit, creditRoleKeys: roleKeys });
  }
  return [...credits.values()];
}
