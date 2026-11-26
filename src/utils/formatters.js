import { translateLabel } from './language/translations.js';
import { DEFAULT_LANGUAGE_KEY, SUPPORTED_LANGUAGE_KEYS, resolveLangKey } from './language/languages.js';
import { isExcludedMedia, STATUS_KEY_MAP } from '../models/utils/mediaLabels.js';
import { IMAGE_PLACEHOLDERS, UNCREDITED_REGEX, stripUncredited } from '../models/utils/modelUtils.js';
import { WatchProvider } from '../models/WatchProvider.js';
import { SUPPORTED_TRAILER_SITES, SUPPORTED_TRAILER_TYPES, Trailer } from '../models/Trailer.js';

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
    if (date === null || date === undefined || date === '') return '—';

    try {
        const dateStr = String(date).trim();
        if (typeof date === 'string' && /^\d{4}$/.test(dateStr)) return dateStr;

        const isISODate = typeof date === 'string' && CALENDAR_DATE_PATTERN.test(dateStr);
        const parsedDate = parseCalendarDate(date);

        if (isNaN(parsedDate.getTime())) {
            return dateStr || '—';
        }

        const locale = language || 'it-IT';
        /** @type {Intl.DateTimeFormatOptions} */
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
 * @param {string|Date|number|null} [deathDate=null]
 * @returns {number|null}
 */
export function calculateAge(birthDate, deathDate = null) {
    if (birthDate === null || birthDate === undefined || birthDate === '') return null;
    try {
        const birth = parseCalendarDate(birthDate);
        if (isNaN(birth.getTime())) return null;

        const targetDate = deathDate === null || deathDate === undefined || deathDate === '' ? new Date() : parseCalendarDate(deathDate);
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

/**
 * @param {number} amount
 * @param {string} [lang]
 * @returns {string}
 */
export function formatMillions(amount, lang = undefined) {
    return amount > 0
        ? `$${(amount / 1_000_000).toFixed(0)} ${translateLabel('detail.millions', lang)}`
        : translateLabel('detail.notDisclosed', lang);
}

/**
 * Format a runtime in minutes into a localized hours/minutes string (e.g. "2h 15m" or "45m").
 * @param {number|null|undefined} runtime
 * @param {string} [lang]
 * @returns {string|null}
 */
export function formatRuntime(runtime, lang = undefined) {
    if (!runtime || runtime <= 0) return null;
    if (runtime < 60) return `${runtime}${translateLabel('detail.minShort', lang)}`;
    return `${Math.floor(runtime / 60)}${translateLabel('detail.hoursShort', lang)} ${runtime % 60}${translateLabel('detail.minShort', lang)}`;
}

const STATUS_KEYWORDS = [
    ['releas', 'status.released'],
    ['rilascia', 'status.released'],
    ['post', 'status.postProduction'],
    ['in prod', 'status.inProduction'],
    ['plan', 'status.planned'],
    ['pianif', 'status.planned'],
    ['cancel', 'status.canceled']
];

/**
 * Translate a TMDb media status string into the active (or requested) language.
 * @param {string|null|undefined} status
 * @param {string} [lang]
 * @param {string} [fallbackKey='status.unknown']
 * @returns {string}
 */
export function formatStatusLabel(status, lang = undefined, fallbackKey = 'status.unknown') {
    const raw = String(status || '').trim();
    if (!raw) return translateLabel(fallbackKey, lang);

    const normalized = raw.toLowerCase();
    const exactKey = STATUS_KEY_MAP[normalized];
    if (exactKey) return translateLabel(`status.${exactKey}`, lang);

    const matched = STATUS_KEYWORDS.find(([needle]) => normalized.includes(needle));
    return matched ? translateLabel(matched[1], lang) : raw;
}

/** @param {Record<string, any>|null|undefined} person */
function normalizeActorName(person) {
    return (person?.name || person?.original_name || '').trim().toLowerCase();
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
        const key = member?.id ? String(member.id) : normalizeActorName(member);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** Check whether `needle` words appear consecutively inside `haystack` words. */
function hasWords(haystack, needle) {
    return needle.length > 0 && haystack.some((_, i) => needle.every((word, j) => haystack[i + j] === word));
}

/**
 * Merge "/" separated character captions, removing duplicates and collapsing shorter
 * whole-word subsets into the fuller caption (e.g. "Haymitch" + "Older Haymitch Abernathy").
 * @param {...(string|null|undefined)} values
 * @returns {string}
 */
export function mergeCharacterRoles(...values) {
    /** @type {Array<{ text: string, words: Array<string> }>} */
    const kept = [];

    for (const value of values) {
        if (!value || typeof value !== 'string') continue;
        for (const rawPart of value.split('/')) {
            const text = rawPart.trim();
            const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
            if (!words.length || kept.some((entry) => hasWords(entry.words, words))) continue;

            const subsetIdx = kept.findIndex((entry) => hasWords(words, entry.words));
            if (subsetIdx !== -1) kept[subsetIdx] = { text, words };
            else kept.push({ text, words });
        }
    }

    return kept.map((entry) => entry.text).join(' / ');
}

/**
 * Merge two cast/acting credit entries for the same actor or media into a single record.
 * @param {Record<string, any>} existing
 * @param {Record<string, any>} next
 * @returns {Record<string, any>}
 */
function mergeCastEntry(existing, next) {
    const firstChar = existing.character;
    const nextChar = next.character;
    const mixedCreditStatus = Boolean(firstChar && nextChar)
        && UNCREDITED_REGEX.test(firstChar) !== UNCREDITED_REGEX.test(nextChar);
    const character = mixedCreditStatus
        ? mergeCharacterRoles(stripUncredited(firstChar), stripUncredited(nextChar))
        : mergeCharacterRoles(firstChar, nextChar);

    const orders = [existing.order, next.order].filter((n) => typeof n === 'number' && Number.isFinite(n));
    const hasEpisodes = existing.episode_count !== undefined || next.episode_count !== undefined;
    const hasTotalEpisodes = existing.total_episode_count !== undefined || next.total_episode_count !== undefined;
    const hasRoles = Array.isArray(existing.roles) || Array.isArray(next.roles);

    return {
        ...existing,
        character,
        popularity: Math.max(Number(existing.popularity) || 0, Number(next.popularity) || 0),
        ...(orders.length ? { order: Math.min(...orders) } : {}),
        ...(hasEpisodes ? { episode_count: Math.max(Number(existing.episode_count) || 0, Number(next.episode_count) || 0) } : {}),
        ...(hasTotalEpisodes ? { total_episode_count: Math.max(Number(existing.total_episode_count) || 0, Number(next.total_episode_count) || 0) } : {}),
        ...(hasRoles ? { roles: [...(existing.roles || []), ...(next.roles || [])] } : {})
    };
}

/**
 * Deduplicate cast/acting credits by ID (fallback normalized name), preserving order
 * and merging repeated TMDB credits into one entry.
 * @param {Array<Record<string, any>>} [list=[]]
 * @returns {Array<Record<string, any>>}
 */
export function dedupeCast(list) {
    if (!Array.isArray(list)) return [];
    if (list.length <= 1) return list;

    /** @type {Map<string, Record<string, any>>} */
    const byKey = new Map();
    list.forEach((member, idx) => {
        if (!member || typeof member !== 'object') return;
        const name = normalizeActorName(member);
        const key = member.id !== undefined && member.id !== null
            ? `id:${String(member.id)}`
            : (name ? `name:${name}` : `idx:${idx}`);
        const existing = byKey.get(key);
        byKey.set(key, existing ? mergeCastEntry(existing, member) : member);
    });

    return [...byKey.values()];
}

/**
 * Remove actors present in `cameos` from `cast` so CastCarousel and CameoCarousel stay disjoint.
 * Matches by ID when both sides have one, falling back to normalized name otherwise.
 * @param {Array<Record<string, any>>|null|undefined} cast
 * @param {Array<Record<string, any>>|null|undefined} cameos
 * @returns {Array<Record<string, any>>}
 */
export function excludeCameosFromCast(cast, cameos) {
    if (!Array.isArray(cast) || !cast.length) return [];
    if (!Array.isArray(cameos) || !cameos.length) return cast;

    /** @type {Set<string>} */
    const ids = new Set();
    /** @type {Set<string>} */
    const namesWithoutId = new Set();
    /** @type {Set<string>} */
    const allNames = new Set();

    for (const cameo of cameos) {
        const name = normalizeActorName(cameo);
        if (name) allNames.add(name);
        if (cameo?.id !== undefined && cameo?.id !== null) ids.add(String(cameo.id));
        else if (name) namesWithoutId.add(name);
    }

    return cast.filter((member) => {
        const name = normalizeActorName(member);
        if (member?.id !== undefined && member?.id !== null) {
            return !ids.has(String(member.id)) && (!name || !namesWithoutId.has(name));
        }
        return !name || !allNames.has(name);
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

/**
 * Keep acting cameos separate while preserving creative credits for the same media.
 * @param {{ cast?: Array<any>, crew?: Array<any> }} credits
 * @param {Array<any>} cameos
 * @param {'cast'|'crew'} mode
 * @returns {Array<any>}
 */
export function selectPersonCredits({ cast = [], crew = [] }, cameos, mode) {
  if (mode !== 'crew') {
    const cameoKeys = new Set(cameos.map((cameo) => mediaKey(cameo, cameo.mediaId)));
    /** @type {Map<string, any>} */
    const actingCredits = new Map();
    for (const credit of cast) {
      if (isExcludedMedia(credit)) continue;
      const key = mediaKey(credit);
      if (cameoKeys.has(key)) continue;
      const existing = actingCredits.get(key);
      actingCredits.set(key, existing ? mergeCastEntry(existing, credit) : credit);
    }
    return [...actingCredits.values()];
  }

  const credits = new Map();
  for (const credit of crew) {
    if (isExcludedMedia(credit)) continue;
    const roleKeys = getCrewRoleKeys(credit);
    if (!roleKeys.length) continue;
    const key = mediaKey(credit);
    const existing = credits.get(key);
    const count = Number(credit.episodeCount ?? credit.episode_count) || 0;
    const roleCounts = { ...(existing?.creditRoleCounts || {}) };
    for (const roleKey of roleKeys) {
      if (count > 0) roleCounts[roleKey] = Math.max(roleCounts[roleKey] || 0, count);
    }
    const mergedRoleKeys = existing
      ? [...new Set([...existing.creditRoleKeys, ...roleKeys])]
      : roleKeys;
    const positiveCounts = Object.values(roleCounts).filter((n) => n > 0);
    const hasDistinctRoleCounts = mergedRoleKeys.length > 1 && new Set(positiveCounts).size > 1;
    const mergedEpisodeCount = !hasDistinctRoleCounts && positiveCounts.length > 0
      ? Math.max(...positiveCounts)
      : undefined;
    credits.set(key, {
      ...(existing || credit),
      creditRoleKeys: mergedRoleKeys,
      ...(Object.keys(roleCounts).length ? { creditRoleCounts: roleCounts } : {}),
      episodeCount: mergedEpisodeCount,
      episode_count: mergedEpisodeCount
    });
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
    return watchProviders.map((category) => ({
      ...category,
      items: (category.items || []).map((item) => (item instanceof WatchProvider ? item : new WatchProvider(item)))
    }));
  }

  const raw = Array.isArray(watchProviders)
    ? { flatrate: watchProviders }
    : (watchProviders?.IT || watchProviders || {});

  const toProvider = (item, category) =>
    item instanceof WatchProvider
      ? item
      : new WatchProvider({ ...item, category: item?.category || category });

  const dedupeById = (list) => [...new Map(list.map((item) => [item.providerId, item])).values()];

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

/**
 * Normalize, filter and sort TMDB video payloads (Trailer with Teaser fallback) across all supported languages.
 * Shared across movies and TV series.
 * @param {Array<Object>|{ results?: Array<Object> }|Object<string, Array<Object>>} [videosSource]
 * @returns {Array<Trailer>}
 */
export function formatTrailers(videosSource) {
  if (!videosSource || typeof videosSource !== 'object') return [];

  const rawEntries = Array.isArray(videosSource)
    ? videosSource
    : Array.isArray(videosSource.results)
      ? videosSource.results
      : SUPPORTED_LANGUAGE_KEYS.flatMap((langKey) =>
          (Array.isArray(videosSource[langKey]) ? videosSource[langKey] : []).map((item) => ({
            ...item,
            language: item?.language || item?.iso_639_1 || langKey
          }))
        );

  const seen = new Set();
  return rawEntries
    .filter((item) => item && SUPPORTED_TRAILER_SITES.includes(item.site) && SUPPORTED_TRAILER_TYPES.includes(item.type))
    .map((item) => (item instanceof Trailer ? item : new Trailer(item)))
    .filter((trailer) => {
      const dedupeKey = `${trailer.site}:${trailer.key}:${trailer.language || ''}`;
      if (!trailer.key || !trailer.embedUrl || seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .sort((a, b) =>
      (a.type === 'Trailer' ? 0 : 1) - (b.type === 'Trailer' ? 0 : 1)
      || Number(b.official) - Number(a.official)
      || SUPPORTED_TRAILER_SITES.indexOf(a.site) - SUPPORTED_TRAILER_SITES.indexOf(b.site)
      || String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))
    );
}

/**
 * Select the best Trailer (with Teaser fallback) for the requested language, falling back to other supported languages.
 * Since `formatTrailers` sorts Trailer before Teaser and official first, the first match for a language is optimal.
 * @param {Array<Trailer>} [trailers=[]]
 * @param {string} [lang='it']
 * @returns {Trailer|null}
 */
export function selectPreferredTrailer(trailers = [], lang = DEFAULT_LANGUAGE_KEY) {
  if (!Array.isArray(trailers) || !trailers.length) return null;
  const preferredLang = resolveLangKey(lang);
  const languageOrder = [preferredLang, ...SUPPORTED_LANGUAGE_KEYS.filter((key) => key !== preferredLang)];

  for (const langKey of languageOrder) {
    const match = trailers.find((item) => item.language && resolveLangKey(item.language) === langKey);
    if (match) return match;
  }
  return trailers[0];
}

/**
 * Select the best Trailer (or Teaser fallback) for each available video platform (YouTube, Vimeo).
 * @param {Array<Trailer>} [trailers=[]]
 * @param {string} [lang='it']
 * @returns {Array<Trailer>}
 */
export function selectTrailersByPlatform(trailers = [], lang = DEFAULT_LANGUAGE_KEY) {
  if (!Array.isArray(trailers) || !trailers.length) return [];
  return SUPPORTED_TRAILER_SITES
    .map((site) => selectPreferredTrailer(trailers.filter((item) => item?.site === site), lang))
    .filter(/** @returns {trailer is Trailer} */ (trailer) => trailer !== null);
}

/**
 * Format a friend request date label from `sentAt` or `createdAt`.
 * @param {Object} [req]
 * @returns {string}
 */
export function formatRequestDate(req) {
  if (req?.sentAt) return req.sentAt;
  if (!req?.createdAt) return '';
  const parsed = new Date(req.createdAt);
  return Number.isNaN(parsed.getTime()) ? String(req.createdAt) : parsed.toLocaleDateString();
}

/**
 * Parse an optional season route or query parameter into a positive integer >= 1.
 * Defaults to 1 when absent or syntactically invalid.
 * @param {string|number|null|undefined} param
 * @returns {number}
 */
export function parseSeasonParam(param) {
  if (param === undefined || param === null) return 1;
  const raw = String(param).trim();
  if (!/^\d+$/.test(raw)) return 1;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
}

/**
 * Resolve localized display fields for an episode card from summary + optional enriched details.
 * @param {Record<string, any>} episode
 * @param {Record<string, any>|null} details
 * @param {Object} options
 * @param {number|string} options.epNum
 * @param {string} options.langKey
 * @param {string} options.normalizedLang
 * @param {(key: string) => string} options.t
 * @param {(text: string, params?: Record<string, any>) => string} options.formatTranslation
 */
export function resolveEpisodeView(episode, details, { epNum, langKey, normalizedLang, t, formatTranslation }) {
  const airDate = details?.airDate || episode.airDate;
  const vote = details?.voteAverage ?? episode.voteAverage;
  return {
    epTitle: details?.getName?.(langKey) || episode.getName?.(langKey) || details?.name || episode.name || formatTranslation(t('detail.episodeLabel'), { number: epNum }),
    epOverview: details?.getOverview?.(langKey) || episode.getOverview?.(langKey) || details?.overview || episode.overview || t('detail.overviewUnavailable'),
    stillSrc: details?.getStillUrl?.(langKey) || episode.getStillUrl?.(langKey) || details?.stillUrl || episode.stillUrl || IMAGE_PLACEHOLDERS.STILL,
    runtime: details?.runtime ?? episode.runtime,
    formattedAirDate: airDate ? formatDate(airDate, normalizedLang) : null,
    rating: vote > 0 ? Number(vote).toFixed(1) : null
  };
}



