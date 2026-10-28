import { DEFAULT_LANGUAGE } from '../utils/languages.js';

const API_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;

export const POSTER_SIZE = "w342";
export const BACKDROP_SIZE = "w780";
export const PROFILE_SIZE = "w185";

export const TIME_WINDOWS = [
    { id: "day", label: "Oggi" },
    { id: "week", label: "Settimana" },
];

export const TV_SORT_OPTIONS = [
    { id: "popularity.desc", label: "Più popolari" },
    { id: "vote_average.desc", label: "Voto più alto" },
    { id: "first_air_date.desc", label: "Più recenti" },
    { id: "name.asc", label: "Titolo (A-Z)" },
];

export const TV_GENRES = [
    { id: 10759, label: "Action & Adventure" },
    { id: 16, label: "Animazione" },
    { id: 35, label: "Commedia" },
    { id: 80, label: "Crime" },
    { id: 99, label: "Documentari" },
    { id: 18, label: "Dramma" },
    { id: 10751, label: "Famiglia" },
    { id: 10752, label: "Storia" },
    { id: 9648, label: "Mistero" },
    { id: 10764, label: "Reality" },
    { id: 10765, label: "Sci-Fi & Fantasy" },
    { id: 10766, label: "Soap" },
    { id: 10767, label: "Talk Show" },
    { id: 10768, label: "Guerra & Politica" },
    { id: 37, label: "Western" },
];

function buildUrl(path, params = {}) {
    const url = new URL(`${API_BASE_URL}${path}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }
        url.searchParams.set(key, value);
    });
    return url;
}

async function request(path, params = {}) {
    if (!API_KEY && !ACCESS_TOKEN) {
        throw new Error("Chiave API TMDB mancante: imposta VITE_TMDB_ACCESS_TOKEN (o VITE_TMDB_API_KEY) nel file .env.");
    }

    const headers = {};
    const query = { ...params };

    if (ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
    } else {
        query.api_key = API_KEY;
    }

    const response = await fetch(buildUrl(path, query), { headers });

    if (!response.ok) {
        throw new Error(`Richiesta TMDB non riuscita (${response.status} ${response.statusText}).`);
    }

    return response.json();
}

export function posterUrl(path, size = POSTER_SIZE) {
    return path ? `${IMAGE_BASE_URL}/${size}${path}` : "";
}

export function backdropUrl(path, size = BACKDROP_SIZE) {
    return path ? `${IMAGE_BASE_URL}/${size}${path}` : "";
}

export function profileUrl(path, size = PROFILE_SIZE) {
    return path ? `${IMAGE_BASE_URL}/${size}${path}` : "";
}

export function discoverTv({ page = 1, sortBy = "popularity.desc", genreId = "", language = DEFAULT_LANGUAGE } = {}) {
    return request("/discover/tv", {
        page,
        sort_by: sortBy,
        with_genres: genreId,
        language,
    });
}

export function trendingTv({ timeWindow = "month", page = 1, language = DEFAULT_LANGUAGE } = {}) {
    if (timeWindow === "month") {
        const today = new Date().toISOString().slice(0, 10);
        const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return request('/discover/tv', {
            sort_by: 'popularity.desc',
            'first_air_date.gte': pastMonth,
            'first_air_date.lte': today,
            page,
            language
        });
    }
    return request(`/trending/tv/${timeWindow}`, {
        page,
        language,
    });
}

export function searchTv({ query = "", page = 1, language = DEFAULT_LANGUAGE } = {}) {
    return request("/search/tv", {
        query,
        page,
        include_adult: false,
        language,
    });
}

export function tvDetails(seriesId, { language = DEFAULT_LANGUAGE } = {}) {
    return request(`/tv/${seriesId}`, {
        append_to_response: "credits",
        language,
    });
}

export function tvSeasonDetails(seriesId, seasonNumber, { language = DEFAULT_LANGUAGE } = {}) {
    return request(`/tv/${seriesId}/season/${seasonNumber}`, { language });
}

export function tvEpisodeDetails(seriesId, seasonNumber, episodeNumber, { language = DEFAULT_LANGUAGE } = {}) {
    return request(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`, { language });
}

export function personDetails(personId, { language = DEFAULT_LANGUAGE } = {}) {
    return request(`/person/${personId}`, {
        append_to_response: "combined_credits",
        language,
    });
}
