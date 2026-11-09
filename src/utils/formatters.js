import { translateLabel } from './translations.js';
import { isExcludedMedia } from '../models/utils/mediaLabels.js';
import { WatchProvider } from '../models/WatchProvider.js';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

/** @param {string|Date|number} value */
function parseCalendarDate(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (CALENDAR_DATE_PATTERN.test(text)) return new Date(`${text.slice(0, 10)}T00:00:00Z`);
    return new Date(value instanceof Date ? value.getTime() : value);
}

/**
 * Compact counts with at most one decimal, omitting trailing zeroes.
 * Truncate towards zero: hundreds for thousands, hundred-thousands for millions.
 * Italian uses "mila" / "mln"; other languages use "K" / "M".
 * @param {number} value
 * @param {string} [language='it-IT']
 * @returns {string}
 */
export function formatNumber(value, language = 'it-IT') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';

    const isItalian = String(language || 'it-IT').trim().toLowerCase().split('-')[0] === 'it';
    const locale = isItalian ? 'it-IT' : 'en-US';
    const magnitude = Math.abs(value);
    if (magnitude < 1000) return value.toLocaleString(locale);

    const isMillion = magnitude >= 1000000;
    const step = isMillion ? 100000 : 100;
    const compact = Math.trunc(value / step) / 10;
    const number = compact.toLocaleString(locale, { maximumFractionDigits: 1, useGrouping: false });
    const suffix = isItalian ? (isMillion ? ' mln' : ' mila') : (isMillion ? 'M' : 'K');
    return number + suffix;
}


/**
 * Format a complete date according to the selected language.
 * Handles YYYY-MM-DD cleanly without timezone offset shift.
 * @param {string|Date|number} date
 * @param {string} [language='it-IT']
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(date, language = 'it-IT', options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    if (date == null || date === '') return '—';

    try {
        const dateStr = String(date).trim();
        if (typeof date === 'string' && /^\d{4}$/.test(dateStr)) return dateStr;

        const isISODate = typeof date === 'string' && CALENDAR_DATE_PATTERN.test(dateStr);
        const parsedDate = parseCalendarDate(date);

        if (isNaN(parsedDate.getTime())) {
            return dateStr || '—';
        }

        const locale = language || 'it-IT';
        const formatOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            ...(isISODate ? { timeZone: 'UTC' } : {}),
            ...options
        };

        return new Intl.DateTimeFormat(locale, formatOptions).format(parsedDate);
    } catch {
        return String(date) || '—';
    }
}

/**
 * Calcola l'età in anni a partire dalla data di nascita rispetto alla data odierna (o data di decesso).
 * @param {string|Date|number} birthDate
 * @param {string|Date|number} [deathDate=null]
 * @returns {number|null}
 */
export function calculateAge(birthDate, deathDate = null) {
    if (birthDate == null || birthDate === '') return null;
    try {
        const birth = parseCalendarDate(birthDate);
        if (isNaN(birth.getTime())) return null;

        const targetDate = deathDate == null || deathDate === '' ? new Date() : parseCalendarDate(deathDate);
        if (isNaN(targetDate.getTime())) return null;

        let age = targetDate.getUTCFullYear() - birth.getUTCFullYear();
        const monthDiff = targetDate.getUTCMonth() - birth.getUTCMonth();
        if (monthDiff < 0 || (monthDiff === 0 && targetDate.getUTCDate() < birth.getUTCDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    } catch {
        return null;
    }
}

export function formatMillions(amount) {
    return amount > 0
        ? `$${(amount / 1_000_000).toFixed(0)} ${translateLabel('detail.millions')}`
        : translateLabel('detail.notDisclosed');
}

/**
 * Deduplicate crew members by ID or name while preserving list order.
 * @param {Array<Object>} [list=[]]
 * @returns {Array<Object>}
 */
export function dedupeCrew(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    return list.filter((member) => {
        const key = member?.id ? String(member.id) : (member?.name || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** Identify creative roles in regular person credits and aggregated TV crew credits. */
export function getCrewRoleKeys(credit) {
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
export function selectCrewByRole(crew, roleKey) {
  return dedupeCrew(crew.filter((credit) => getCrewRoleKeys(credit).includes(roleKey)));
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
    const roleKeys = getCrewRoleKeys(credit);
    if (!roleKeys.length) continue;
    const key = mediaKey(credit);
    const existing = credits.get(key);
    credits.set(key, existing
      ? { ...existing, creditRoleKeys: [...new Set([...existing.creditRoleKeys, ...roleKeys])] }
      : { ...credit, creditRoleKeys: roleKeys });
  }
  return [...credits.values()];
}

/**
 * Filter, deduplicate and format watch providers into presentation category groups.
 * @param {Array<Object>|Object} [watchProviders]
 * @returns {Array<{ key: string, labelKey: string, label: string, badgeClass: string, items: Array<WatchProvider> }>}
 */
export function formatWatchProviders(watchProviders) {
  if (Array.isArray(watchProviders) && watchProviders[0]?.badgeClass) {
    return watchProviders;
  }

  const raw = Array.isArray(watchProviders)
    ? { flatrate: watchProviders }
    : (watchProviders?.IT || watchProviders || {});

  const toProvider = (item, category) =>
    item instanceof WatchProvider
      ? item
      : new WatchProvider({ ...item, category: item?.category || category });

  const dedupeById = (list) => list.filter(
    (item, index) => list.findIndex((other) => other.providerId === item.providerId) === index
  );

  const itemsFor = (category) => dedupeById(
    (Array.isArray(raw[category]) ? raw[category] : [])
      .map((item) => toProvider(item, category))
      .filter((p) => !p.isExcluded)
  );

  const uniqueFree = dedupeById([...itemsFor('free'), ...itemsFor('ads')]);

  return [
    { key: 'subscription', labelKey: 'detail.subscription', label: translateLabel('detail.subscription'), badgeClass: 'bg-primary', items: itemsFor('flatrate') },
    { key: 'freeStream', labelKey: 'detail.freeStream', label: translateLabel('detail.freeStream'), badgeClass: 'bg-success', items: uniqueFree },
    { key: 'rent', labelKey: 'detail.rent', label: translateLabel('detail.rent'), badgeClass: 'bg-info text-dark', items: itemsFor('rent') },
    { key: 'buy', labelKey: 'detail.buy', label: translateLabel('detail.buy'), badgeClass: 'bg-secondary', items: itemsFor('buy') }
  ].filter((category) => category.items.length > 0);
}


