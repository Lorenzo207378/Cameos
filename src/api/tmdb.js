/// <reference types="vite/client" />
import { DEFAULT_LANGUAGE } from '../utils/languages.js';

const API_BASE_URL = "https://api.themoviedb.org/3";

/** @type {Record<string, string|undefined>} */
const env = import.meta.env;
const API_KEY = env.VITE_TMDB_API_KEY;
const ACCESS_TOKEN = env.VITE_TMDB_ACCESS_TOKEN;

function buildUrl(path, params = {}) {
    const url = new URL(`${API_BASE_URL}${path}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }
        url.searchParams.set(key, String(value));
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

    const response = await fetch(buildUrl(path, query).toString(), { headers });

    if (!response.ok) {
        throw new Error(`Richiesta TMDB non riuscita (${response.status} ${response.statusText}).`);
    }

    return response.json();
}

export function tvDetails(seriesId, { language = DEFAULT_LANGUAGE } = {}) {
    return request(`/tv/${seriesId}`, {
        append_to_response: "credits",
        language,
    });
}

export function tvEpisodeDetails(seriesId, seasonNumber, episodeNumber, { language = DEFAULT_LANGUAGE } = {}) {
    return request(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`, { language });
}
