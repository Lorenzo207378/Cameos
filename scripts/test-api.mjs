import process from 'node:process';
try {
  process.loadEnvFile('.env');
} catch {
  // Ignora se .env non presente
}

import { seriesBackend } from '../src/backend/series/SeriesBackend.js';
import { movieBackend } from '../src/backend/movies/MovieBackend.js';
import { cameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { personBackend } from '../src/backend/person/PersonBackend.js';

function divider(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`[TEST] ${title}`);
  console.log('='.repeat(70));
}

async function main() {
  console.log('--- AVVIO TEST CHIAMATE API TMDB & BACKEND SCOPES (TV + MOVIES) ---');

  // 1. Series Scope
  divider('1. SCOPE SERIES: Discover, Trending, Search, Dettagli');
  const discover = await seriesBackend.discoverSeries({ page: 1, sortBy: 'popularity.desc' });
  console.log(`Discover TV: ${discover.results.length} serie. Prima: "${discover.results[0]?.name}" (ID: ${discover.results[0]?.id})`);

  const search = await seriesBackend.searchSeries({ query: 'The Big Bang Theory' });
  const tbbt = search.results[0];
  console.log(`Search TV: Trovata "${tbbt?.name}" (ID: ${tbbt?.id})`);

  // 2. Movie Scope: Discover, Search, Details
  divider('2. SCOPE MOVIES: Discover, Trending, Search, Dettagli Film');
  const discoverMovies = await movieBackend.discoverMovies({ page: 1 });
  console.log(`Discover Film: ${discoverMovies.results.length} film. Primo: "${discoverMovies.results[0]?.title}"`);

  const searchMovie = await movieBackend.searchMovies({ query: 'Avengers: Endgame' });
  const endgame = searchMovie.results[0];
  console.log(`Search Film: Trovato "${endgame?.title}" (ID: ${endgame?.id})`);

  const movieDetails = await movieBackend.getMovieDetails({ movieId: endgame.id });
  console.log(`Dettagli Film "${movieDetails.title}": durata ${movieDetails.runtime} min, cast: ${movieDetails.credits?.cast?.length} attori.`);

  // 3. Cameo Scope in Movies
  divider('3. SCOPE CAMEOS IN FILM: Rilevamento Camei nei Film');
  const movieCameos = await cameoBackend.getMovieCameos({ movieId: endgame.id, minPopularity: 4 });
  console.log(`Camei rilevati in "${endgame.title}": ${movieCameos.cameos.length}. Esempi:`, movieCameos.cameos.slice(0, 4).map(c => ({
    nome: c.name,
    personaggio: c.character,
    badge: c.cameoBadge,
    order: c.order
  })));

  // 4. Cameo Scope in TV
  divider('4. SCOPE CAMEOS IN TV: Stan Lee in The Big Bang Theory');
  const episodeCameos = await cameoBackend.getEpisodeCameos({ seriesId: tbbt.id, seasonNumber: 3, episodeNumber: 16 });
  console.log(`Camei rilevati in S03E16:`, episodeCameos.cameos.map((c) => ({
    nome: c.name,
    personaggio: c.character,
    badge: c.cameoBadge
  })));

  // 5. Person Scope: Stan Lee con TV e Film
  divider('5. SCOPE PERSON: Stan Lee (Filmografia Completa TV + Film)');
  const filmography = await personBackend.getPersonFilmography({ personId: 7624, mediaType: 'all' });
  console.log(`Filmografia totale Stan Lee: ${filmography.cast.length} crediti recitativi.`);

  const movieCameosStan = await cameoBackend.getActorMovieCameos({ personId: 7624 });
  console.log(`Camei cinematografici di Stan Lee: ${movieCameosStan.length} film. Primi 4:`, movieCameosStan.slice(0, 4).map(m => ({
    film: m.title,
    ruolo: m.character,
    badge: m.cameoBadge
  })));

  divider('TEST TV E FILM COMPLETATI CON SUCCESSO');
}

main().catch((err) => {
  console.error('Errore durante i test:', err);
  process.exit(1);
});
