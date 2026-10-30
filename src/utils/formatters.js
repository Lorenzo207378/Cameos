export function formatYear(date) {
    return date ? String(date).slice(0, 4) : "—";
}

export function formatCount(value) {
    return typeof value === "number" ? value.toLocaleString("it-IT") : "—";
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
