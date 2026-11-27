# Cameos — Project Agent Guidelines

Guida operativa persistente per il repository **Cameos** (React 19 + JS/JSX con JSDoc + Vite + Bootstrap 5 + Firebase 13 + IndexedDB, architettura MVVM).

## 1. Workflow di revisione pagina-per-pagina

Quando l'utente chiede di revisionare una pagina (`src/pages/<Page>.jsx`), caricare sempre insieme le skill globali:
- `review` (workflow completo: inventario vertical slice, audit dati/architettura/ViewModel, audit React/lifecycle, audit UI, report con tabella approvazione in modalità **report-only** di default, test limite, verification gate, documentazione finale in 2 parti in `docs/pages/<page-slug>.md`).
- `mvvm`, `react`, `cleancode` (gerarchia: `mvvm` per confini tra layer, `react` per lifecycle/hooks/PropTypes/styling, `cleancode` per diff chirurgici e verification gate).
- **Controllo di coerenza cross-slice (parità tra pagine sorelle)**: ogni volta che una revisione introduce un nuovo guard difensivo su un pattern ricorrente (es. validazione parametri route, isolamento errori su singleton, token anti-stale), verificare prima della chiusura anche i loader/pagine sorelle già marcate `Completata` e segnalare nel report eventuali disallineamenti da riallineare.
- **Checkpoint utente prima dei test (editing massivo)**: nei lavori di editing massivo (modifiche multi-file, refactor UI/layout o interventi estesi), al termine della fase di modifica al codice e **prima** di scrivere, aggiornare o eseguire i test, fermarsi e chiedere all'utente se è soddisfatto del lavoro o se vuole sistemare qualcosa.

Aggiornare la tabella di avanzamento in fondo a questo file al completamento di ogni pagina.

## 2. Architettura e convenzioni consolidate

- **MVVM unidirezionale rigoroso**: `View -> ViewModel -> Repository -> Backend -> ApiService / IndexedDB -> Models`. Nessun import inverso, nessun ciclo (`import-x/no-cycle` deve restare a `0`), nessun accesso diretto di View/Context a Repository, Backend, `ApiService`, `IndexedDBService` o `data/`.
- **Gerarchia classi base (SRP)**:
  - `src/viewmodel/BaseViewModel.js` (stato osservabile `useSyncExternalStore`, `runAsync`, lingua, connettività) → `src/viewmodel/MediaCatalogViewModel.js` (paginazione unificata `loadPagination`, feed/categorie, ricerca) → ViewModel di dominio (`MovieViewModel`, `SeriesViewModel`, `CameoViewModel`).
  - `src/repository/BaseRepository.js` (dedup in-flight, TTL 5 min, Network-First + fallback offline, `_cacheEntitiesFromList`, `_executeEntityDetails`) → `src/repository/MediaCatalogRepository.js` (paginazione catalogo, generi, ricerca) → Repository di dominio (`MovieRepository`, `SeriesRepository`, `CameoRepository`).
- **Standard consumo ViewModel nelle View**:
  - Usare sempre gli hook dedicati (`use*ViewModel`) e destrutturare solo slice e azioni effettivamente usati (mai passare l'intero oggetto ViewModel nelle dipendenze di `useEffect`/`useMemo`/`useCallback`).
  - Preferire firme ad oggetto opzioni (`{ initialPages, limit, append, language, force }`) e stati `loading` / `error` / `onRetry` uniformi tra sezioni.
  - Per mappe di callback per categoria fuori da `.map()`, usare `useMemo`; per singole callback, `useCallback`.
- **Moduli di supporto**:
  - Configurazione categorie TMDB separata dalla presentazione UI: `src/utils/media/mediaCategoryConfig.js` (Backend/VM) vs `src/utils/media/mediaCategoryPresentation.js` (View). `src/utils/media/mediaCategories.js` è solo barrel di compatibilità.
  - Classificazione pura camei estratta in `src/backend/cameos/cameoClassification.js` (nessun coupling tra `SeriesBackend` e singleton `cameoBackend`).
  - I modelli in `src/models/*.js` importano sempre dai moduli foglia (`./utils/modelUtils.js`, `./utils/mediaLabels.js`), mai dal barrel `./utils/index.js`.

## 3. Esclusioni fisse (fuori perimetro)

- **Area Utente, Amici, Preferenze e Recensioni** (sviluppate su branch separato, verifica rinviata a un secondo momento): non modificare né segnalare come bloccanti `src/components/ReviewSection.jsx`, `src/components/media/MediaPreferencesBar.jsx`, `src/viewmodel/reviews/*`, `src/repository/reviews/*`, `src/backend/reviews/*`, `src/viewmodel/user/*`, `src/repository/user/*`, `src/backend/user/*`, `src/viewmodel/social/*`, `src/repository/social/*`, `src/backend/social/*`, `src/pages/Authentication.jsx`, `src/pages/Profile*.jsx`, `src/pages/Friends.jsx`, né i 4 import di `src/data/catalogData.js` (`Movies.jsx`, `TVSeries.jsx`, `MovieDetail.jsx`, `TVSeriesDetail.jsx`).
- **Script di test**: ignorare eventuali warning lint dentro `scripts/test-*.mjs`.
- **Report storici in `docs/` fuori da `docs/pages/`**: non modificare né allineare i file di analisi puntuale in `docs/` esterni a `docs/pages/` (es. `home-fetch-audit.md`, `media-search.md`, `non-social-audit.md`, `non-social-audit-inventory.json`, `code-cleanup-audit.md`, `kiss-review.md`). Mantenere aggiornata solo la documentazione per pagina dentro `docs/pages/`.

## 4. Decisioni progettuali già approvate

- **Persistenza liste in IndexedDB non distruttiva**: `_cacheEntitiesFromList` e `CameoRepository.getMovieCameos` inseriscono record `isComplete: false` **solo se assenti** (`{ shouldReplace: (existing) => !existing }`), senza mai sovrascrivere record già presenti o dettagli completi (`isComplete: true`).
- **Sezione `FamousCameos` come archivio storico di sessione**: condivisa via `useCameoViewModel({ language, shared: true })` (`sharedCatalogCameoVM`); fetchata una volta all'ingresso in app (`{ limit: 16, language, onlyIfEmpty: true, force: true }`), mai ri-fetchata durante la navigazione interna; traduzione live del titolo film in memoria tramite `cameo.getMediaTitle(langKey)` / `mediaTitles`.
- **Offline a freddo con cache vuota**: accettato per ora che l'app non si apra completamente offline a cache vuota; la gestione dedicata di `trendingState` per `TrendingMediaCardSlider` resta sospesa.
- **Pagine gemelle `Movies.jsx` e `TVSeries.jsx`**: mantenute intenzionalmente come file separati (1:1 speculari oggi, libere di divergere in futuro).
- **`src/utils/formatters.js` e `src/models/utils/modelUtils.js`**: lasciati nella struttura attuale (formattatori comuni di progetto vs builder dei model), segnati per eventuale revisione futura.
- **Fetch bilingue tollerante**: `ApiServiceHelpers.fetchLanguagesList` usa `allowPartial = true` (`Promise.allSettled`) in linea con `fetchLanguagesDetail`.
- **Derivazione camei in memoria (Opzione 1A — Film & Serie TV)**: `MovieDetail.jsx` e `TVSeriesDetail.jsx` non lanciano chiamate di rete duplicate per i camei (`loadMovieCameos` / `loadSeriesCameos`, evitando 2 GET ridondanti su `/movie/{id}` e `/tv/{id}`); derivano i camei in modo sincrono dal modello già caricato tramite `CameoViewModel.extractMovieCameos` / `extractSeriesCameos` → `CameoRepository` → `CameoBackend` → `cameoClassification.js` (`MAIN_CAST_CUTOFF = 8`, `MAX_SERIES_CAMEO_EPISODES = 2`, `DEFAULT_CAMEO_MIN_POPULARITY = 2`, `FAMOUS_CAMEO_MIN_POPULARITY = 4`, `extractCameosFromMovieCast`, `extractCameosFromSeriesCast`), mantenendo `Movie` e `Series` leggeri e separati dall'euristica camei.
- **Loader di dettaglio isolati per entità (pattern a 5 stadi non centralizzato)**: `loadMovieDetails`, `loadSeriesDetails`, `loadSeasonDetails` e `loadEpisodeDetails` restano intenzionalmente metodi separati (niente wrapper generico che accoppi entità diverse), ma condividono parità rigorosa sui 5 stadi: dual-signature + `force`, guard numerico `isValidNumericParam`, tracking richiesta/token (`requested*` + `_latest*Request`), `BaseViewModel.runAsync`, isolamento errore per entità (`movieError`, `seriesError`, `requestedSeason.error`, `requestedEpisode.error`) filtrato per route nelle View.

## 5. Verification Gate (ambiente Windows / PowerShell)

In PowerShell usare `npm.cmd` (non `npm`) e `;` al posto di `&&`. Prima di chiudere ogni pagina verificare:
1. **Type/JSDoc check** (`npx.cmd --yes --package=typescript@5.9.3 -- tsc --allowJs --checkJs --strictNullChecks --noEmit` su `src/**/*.js` e `src/**/*.jsx`): `0` errori fuori dai 4 file Review esclusi (usare `typescript@5.9.3` per compatibilità con la sintassi JSDoc Closure `function(new:T, Object)`).
2. **Lint progetto**: `npm.cmd run lint` → `0` errori `import-x/no-cycle`, `0` warning (ammessi solo i 4 errori `catalogData.js` esclusi).
3. **Audit stretto sui file toccati**: `node "C:\Users\loren\.gemini\config\skills\cleancode\scripts\eslint-advanced-audit.mjs" --max-warnings=0 <files...>` → `0` errori, `0` warning.
4. **Build di produzione**: `npm.cmd run build` → verde.
5. **Suite completa test (inclusi test limite)**: `node scripts/run-tests.mjs` → `0` suite fallite.

## 6. Stato avanzamento revisione pagine

| Pagina | Stato | Documentazione | Note |
| :--- | :--- | :--- | :--- |
| `src/pages/Movies.jsx` | Completata | `docs/pages/movies.md` | Standard di riferimento per pagine catalogo |
| `src/pages/TVSeries.jsx` | Completata | `docs/pages/tv-series.md` | Allineata 1:1 a `Movies.jsx`, categoria `kids` integrata |
| `src/pages/MovieCategory.jsx` | Completata | `docs/pages/movie-category.md` | Guard categoria (`Object.hasOwn`), `requestError` isolato in `loadPagination`, cambio lingua zero-refetch, alert append |
| `src/pages/TVSeriesCategory.jsx` | Completata | `docs/pages/tv-series-category.md` | Allineata 1:1 a `MovieCategory.jsx`; guard categoria (`Object.hasOwn`), cambio lingua zero-refetch, retry `force: true` |
| `src/pages/MovieDetail.jsx` | Completata | `docs/pages/movie-detail.md` | Standard pagine dettaglio; derivazione camei locale (1A), `movieError` isolato e guard route |
| `src/pages/TVSeriesDetail.jsx` | Completata | `docs/pages/tv-series-detail.md` | Allineata 1:1 a `MovieDetail.jsx`; camei locali (1A), `seriesError`/`season` isolati e guard route |
| `src/pages/TVSeriesEpisodeDetail.jsx` | Completata | `docs/pages/tv-series-episode-detail.md` | Allineata a `MovieDetail`/`TVSeriesDetail`; `requestedEpisode.error`, guard route, `CrewCredits` |
| `src/pages/PersonDetail.jsx` | Da revisionare | — | — |
| `src/pages/Search.jsx` | Completata | `docs/pages/search.md` | `sharedSearchVM` (stato paginazione conservato su back-nav), cambio lingua zero-refetch (`titleKey`), eviction promise rifiutate in `_peopleSections`, retry `force: true`, `useScrollToTop`, nessuna `<section>` annidata, spinner `CastCarousel` |
| `src/pages/Authentication.jsx` | Da revisionare | — | — |
| `src/pages/Profile.jsx` | Da revisionare | — | — |
| `src/pages/ProfileMediaCategory.jsx` | Da revisionare | — | — |
| `src/pages/ProfileReviews.jsx` | Fuori scope / Da verificare | — | Verificare dipendenza da branch Recensioni |
| `src/pages/Friends.jsx` | Da revisionare | — | — |
