export function formatYear(date) {
    return date ? String(date).slice(0, 4) : "—";
}

export function formatCount(value) {
    return typeof value === "number" ? value.toLocaleString("it-IT") : "—";
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
    if (!date) return '—';

    try {
        const dateStr = String(date).trim();
        if (/^\d{4}$/.test(dateStr)) return dateStr;

        const isISODate = /^\d{4}-\d{2}-\d{2}/.test(dateStr);
        const parsedDate = isISODate ? new Date(`${dateStr.slice(0, 10)}T00:00:00Z`) : new Date(date);

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

export const formatFullDate = formatDate;

/**
 * Calcola l'età in anni a partire dalla data di nascita rispetto alla data odierna (o data di decesso).
 * @param {string|Date|number} birthDate
 * @param {string|Date|number} [deathDate=null]
 * @returns {number|null}
 */
export function calculateAge(birthDate, deathDate = null) {
    if (!birthDate) return null;
    try {
        const birthStr = String(birthDate).trim().slice(0, 10);
        const birth = new Date(`${birthStr}T00:00:00Z`);
        if (isNaN(birth.getTime())) return null;

        const targetDate = deathDate
            ? new Date(`${String(deathDate).trim().slice(0, 10)}T00:00:00Z`)
            : new Date();
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
