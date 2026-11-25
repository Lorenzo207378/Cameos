# Documentazione Pagina `MovieCategory.jsx`

Documentazione tecnica della pagina [MovieCategory.jsx](file:///C:/GitHub_Repositories/Cameos/src/pages/MovieCategory.jsx), responsabile della vista a griglia completa dei film di una categoria o delle prossime uscite (`/Cameos/movies/category/:category`).

---

## Parte 1 — Fetch dei Dati (Architettura, ViewModel, Repository, Backend e Parametri)

### 1.1 Architettura e interazione tra i layer

La pagina applica rigorosamente l'architettura **MVVM unidirezionale** (`View -> ViewModel -> Repository -> Backend -> ApiService / IndexedDB -> Models`): `MovieCategory.jsx` non importa né interroga mai Repository, Backend, `ApiService`, `IndexedDBService` o `catalogData.js`. La configurazione statica delle categorie è isolata in [mediaCategoryConfig.js](file:///C:/GitHub_Repositories/Cameos/src/utils/media/mediaCategoryConfig.js), mentre i metadati di presentazione/i18n risiedono in [mediaCategoryPresentation.js](file:///C:/GitHub_Repositories/Cameos/src/utils/media/mediaCategoryPresentation.js).

```mermaid
flowchart LR
    View["MovieCategory.jsx (View)"] --> MVM["MovieViewModel\n(sharedMovieVM)"]
    MVM --> MCVM["MediaCatalogViewModel\n(loadPagination)"]
    MCVM --> MRepo["MovieRepository\n(STORES.QUERIES + STORES.MOVIES)"]
    MRepo <--> IDB[("IndexedDBService\nTTL 5m")]
    MRepo --> MBack["MovieBackend\n(extends BaseBackend)"]
    MBack --> API["ApiService + ApiServiceHelpers\n(fetchLanguagesList IT+EN)"]
    API --> TMDB[("TMDB API v3\n/discover/movie")]
```

La pagina gestisce **un solo flusso paginato per categoria**, con tre comportamenti distinti all'ingresso:

1. **Ingresso dal catalogo ([Movies.jsx](file:///C:/GitHub_Repositories/Cameos/src/pages/Movies.jsx))**: `sharedMovieVM.categoryMovies[categoryKey]` e `categoryPagination[categoryKey]` contengono già le 2 pagine pre-caricate dal feed; la griglia si apre istantaneamente senza `<LoadingScreen />` né chiamate di rete aggiuntive.
2. **Ingresso diretto via URL su categoria valida**: `useEffect` invoca `loadMoviesFromCategory(categoryKey, { page: 1, language: normalizedLang })` via `useEffectEvent` per caricare pagina `1` (con `20` film su generi standard o i film futuri filtrati per `upcoming`).
3. **URL con categoria non valida (`!Object.hasOwn(MOVIE_CATEGORY_CONFIG, categoryKey)`)**: bloccato sia nella View sia in `MovieViewModel.loadMoviesFromCategory` con **0 chiamate al Repository** e **0 scritture in cache/stato**; la pagina renderizza subito `DetailNotFound`.
4. **Paginazione incrementale ("Carica altri")**: `handleLoadMore` chiama `loadMoviesFromCategory(categoryKey, { append: true, language: normalizedLang })` richiedendo `currentPage + 1` e accodando i risultati deduplicati per `id`.

---

### 1.2 Layer ViewModel (`MovieViewModel`, `MediaCatalogViewModel`, `BaseViewModel`)

- **Istanziazione e sottoscrizione**: `useMovieViewModel({ language: normalizedLang })` sottoscrive il singleton di sessione `sharedMovieVM` ([useViewModel.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/useViewModel.js#L54-L91)) via `useSyncExternalStore`. `MovieCategory.jsx` destruttura esclusivamente `{ categoryMovies, categoryPagination, loadMoviesFromCategory }`.
- **Validazione categoria (`MovieViewModel.loadMoviesFromCategory`)** ([MovieViewModel.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/movies/MovieViewModel.js#L139-L158)):
  - Verifica `typeof categoryKey === 'string' && Object.hasOwn(MOVIE_CATEGORY_CONFIG, categoryKey)` (evitando sia slug inesistenti sia chiavi del prototipo come `constructor`/`__proto__`); se invalida ritorna `[]` senza toccare stato né Repository.
  - Se `categoryKey === 'upcoming'`, delega a `loadUpcomingMovies` ([MovieViewModel.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/movies/MovieViewModel.js#L113-L124)), che popola anch'esso `groupedListProp: 'categoryMovies'` e `paginationMapProp: 'categoryPagination'`.
  - Per tutte le altre 13 categorie di genere delega a `MediaCatalogViewModel.loadPagination` con `asyncKey: 'loadCategory_' + categoryKey`.
- **Paginazione e isolamento errori (`MediaCatalogViewModel.loadPagination`)** ([MediaCatalogViewModel.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/MediaCatalogViewModel.js#L132-L199)):
  - Pianifica pagine, lingua e politica `retainPages` tramite `planPaginationLoad` ([pagination.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/pagination.js#L45-L66)) e applica lo stato di loading iniziale via `_beginPaginationLoad` ([MediaCatalogViewModel.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/MediaCatalogViewModel.js#L82-L94)) usando `buildPaginationPatch` ([pagination.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/pagination.js#L28-L32)).
  - **Append (`append: true`)**: blocca clic concorrenti se `loadingMore || hasMore === false || _pendingOperations.has(asyncKey)`, deduplica in-place via `combinePages` ([pagination.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/pagination.js#L78-L88)) e fonde la sola categoria tramite `mergeCategoryPatch` ([pagination.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/pagination.js#L69-L75)). Su errore mantiene intatti gli elementi già in griglia e scrive `pagination.error`.
  - **Caricamento iniziale / Retry (`append: false`)**: delega a `_runRefreshPagination` ([MediaCatalogViewModel.js](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/MediaCatalogViewModel.js#L97-L115)) su [BaseViewModel.runAsync](file:///C:/GitHub_Repositories/Cameos/src/viewmodel/BaseViewModel.js#L201-L241) catturando localmente `requestError` nel `try/catch`. In questo modo un'altra operazione parallela su `sharedMovieVM` che azzera il generico `state.error` **non può mai cancellare** `categoryPagination[categoryKey].error`.

---

### 1.3 Snodo Centrale: Layer Repository (`BaseRepository`, `MediaCatalogRepository`, `MovieRepository`)

Entrambi i flussi (`getMoviesByCategory` [L114-L128](file:///C:/GitHub_Repositories/Cameos/src/repository/movies/MovieRepository.js#L114-L128) e `getUpcomingMovies` [L87-L102](file:///C:/GitHub_Repositories/Cameos/src/repository/movies/MovieRepository.js#L87-L102)) delegano a [MediaCatalogRepository._executeMediaCatalogPage](file:///C:/GitHub_Repositories/Cameos/src/repository/MediaCatalogRepository.js#L26-L42) e [BaseRepository.executeCatalogQuery](file:///C:/GitHub_Repositories/Cameos/src/repository/BaseRepository.js#L259-L322) su `cameos_pwa_db` v3 ([IndexedDBService.js](file:///C:/GitHub_Repositories/Cameos/src/storage/IndexedDBService.js)):

| Flusso | Store principale | Formato `cacheKey` | Effetti secondari |
| :--- | :--- | :--- | :--- |
| `getMoviesByCategory(key, params)` | `STORES.QUERIES` | `category_movies_<key>:categoryKey=<key>&language=<lang>&page=<p>` | Inserisce i singoli `Movie` in `STORES.MOVIES` (`isComplete: false`) **solo se assenti** (`shouldReplace: (existing) => !existing`) |
| `getUpcomingMovies(params)` | `STORES.QUERIES` | `upcoming_movies:language=<lang>&page=<p>` | Salva i `Movie` in `STORES.MOVIES` (non distruttivo) e ri-applica il filtro `isMediaUpcoming(movie, today)` anche sui record letti da cache |

- **Deduplicazione in-flight e TTL 5 minuti**: richieste concorrenti sulla stessa chiave (es. React StrictMode) condividono la stessa `Promise` in `_catalogRequests`; con `force: false`, record entro `300_000 ms` sono serviti subito da IndexedDB re-idratati in `new Movie(...)`.
- **Network-First + Fallback offline**: quando `handleRetry` passa `force: true`, se online bypassa il TTL e aggiorna la cache; se offline (anche con `force: true`), legge comunque la cache locale se disponibile, oppure lancia un errore controllato mostrato dalla UI con pulsante `Riprova`.

---

### 1.4 Layer Backend & Sorgente Remota (`MovieBackend`, `BaseBackend`, `ApiService`)

- **`MovieBackend.getMoviesByCategory`** ([MovieBackend.js](file:///C:/GitHub_Repositories/Cameos/src/backend/movies/MovieBackend.js#L79-L86)) → **`BaseBackend._getMediaByCategory`** ([BaseBackend.js](file:///C:/GitHub_Repositories/Cameos/src/backend/BaseBackend.js#L55-L77)) → **`ApiService.discoverMovie`** ([ApiService.js](file:///C:/GitHub_Repositories/Cameos/src/service/ApiService.js#L181-L183)):
  - Chiama `GET /discover/movie` in parallelo per `it-IT` ed `en-US` tramite `fetchLanguagesList` (tollerante a fallimenti parziali di una lingua con `Promise.allSettled`), filtrando `primary_release_date.lte: today`, `sort_by: 'popularity.desc'`, `with_genres: config.genreId` e gli eventuali `additionalParams` (es. `'vote_count.gte': 500` per `sagas`).
  - Restituisce modelli [Movie](file:///C:/GitHub_Repositories/Cameos/src/models/Movie.js) già bilingue (`titles`, `overviews`, `posterUrl`, `backdropUrl`).
- **`MovieBackend.getUpcomingMovies`** ([MovieBackend.js](file:///C:/GitHub_Repositories/Cameos/src/backend/movies/MovieBackend.js#L46-L68)) → **`ApiService.getUpcomingMovies`** ([ApiService.js](file:///C:/GitHub_Repositories/Cameos/src/service/ApiService.js#L205-L212)):
  - Chiama `GET /discover/movie` bilingue con `primary_release_date.gte: today`, filtra i candidati con `isMediaUpcoming`, arricchisce lo `status` dei candidati privi di status con `_enrichWithConcurrency(..., 4)` su `/movie/{id}` e rifiltra i soli titoli non ancora rilasciati.

---

### 1.5 Giustificazione dei parametri impiegati

| Parametro | Layer / Chiamata | Valore in `MovieCategory.jsx` | Motivazione tecnica |
| :--- | :--- | :--- | :--- |
| `category` (`categoryKey`) | `useParams()` → `loadMoviesFromCategory` | `:category` (default `'upcoming'`) | Seleziona la configurazione TMDB da `MOVIE_CATEGORY_CONFIG`, il titolo/sottotitolo da `getCategoryDisplayInfo` e lo slice in `categoryMovies`/`categoryPagination`; validato con `Object.hasOwn`. |
| `page` | `fetchInitialCategory`, `handleRetry` | `1` | Su ingresso diretto o retry carica la prima pagina da `20` film, lasciando all'utente il controllo esplicito di paginazione via `"Carica altri"`. |
| `append` | `handleLoadMore` | `true` | Attiva il ramo incrementale di `loadPagination`, calcolando `currentPage + 1` e mantenendo intatte tutte le card già visualizzate. |
| `language` / `normalizedLang` | Hook → VM → Repo | `'it-IT'` o `'en-US'` | Chiave di cache della query; il cambio lingua **non** rilancia il fetch (gestito via `useEffectEvent`) perché i `Movie` in memoria sono già bilingue e si traducono live preservando le pagine `2..N`. |
| `force` | `handleRetry` | `true` (solo su Retry) | Forza il bypass del TTL di 5 minuti se online su tentativo esplicito dell'utente, mantenendo il fallback IndexedDB se offline. |
| `primary_release_date.lte` / `.gte` | `BaseBackend` / `ApiService` | Data odierna ISO `YYYY-MM-DD` | Separa in modo netto i film già usciti (categorie di genere) da quelli in uscita (`upcoming`). |
| `vote_count.gte` | `MOVIE_CATEGORY_CONFIG.sagas` | `500` (solo `sagas`) | Isola i grandi franchise azione/avventura da produzioni minori con gli stessi generi `28,12`. |
| `upcoming` | `MediaCategoryLayout` → `MediaCard` | `categoryKey === 'upcoming'` | Nasconde il badge voto sulle card dei film non ancora usciti. |

---

## Parte 2 — Visualizzazione (Struttura, Componenti, Hooks e Props)

### 2.1 Struttura della pagina e gestione degli stati

La route `/Cameos/movies/category/:category` in [App.jsx](file:///C:/GitHub_Repositories/Cameos/src/App.jsx#L46) monta `<MovieCategory key={pathname} />`, garantendo il reset pulito di scroll e stato al cambio categoria.

```mermaid
flowchart TD
    Route["MovieCategory.jsx (/movies/category/:category)"]
    Route -->|"!isValidCategory"| NF["DetailNotFound ('Nessun risultato' + Indietro, 0 fetch)"]
    Route -->|"initialLoading"| Loader["LoadingScreen"]
    Route -->|"pronto"| Shell["MediaCategoryLayout (.media-category-page)"]

    Shell --> Header["header.glass-header-fixed: Indietro + subtitle + h1 title + count-pill"]
    Shell --> Scroll["div.media-category-scroll-container"]
    Scroll -->|"items.length > 0"| Grid["div.media-category-grid (MediaCard[])"]
    Scroll -->|"items.length === 0 && error"| InitErr["Stato errore (role='alert' + Riprova force:true)"]
    Scroll -->|"items.length === 0 && !error"| Empty["Stato vuoto ('Nessun risultato')"]
    Grid -->|"error su append"| AppendErr["Avviso inline role='alert' (card preservate)"]
    Scroll -->|"hasMore && (items > 0 || !error)"| More["Pulsante Carica altri / Riprova (load-more-btn)"]
    Grid -->|"!hasMore"| End["Indicatore fine lista (common.noMoreItems)"]
```

#### Stati di visualizzazione
- **Categoria non valida**: `!isValidCategory` mostra immediatamente [DetailNotFound](file:///C:/GitHub_Repositories/Cameos/src/components/media/MediaDetailLayout.jsx#L39-L86) (`icon="bi-film"`, `title={t('common.noResults')}`, `subtitle={null}`, `onBack={goBack}`) senza `<LoadingScreen />` né errori di rete.
- **Loading iniziale**: mostra [LoadingScreen](file:///C:/GitHub_Repositories/Cameos/src/components/LoadingScreen.jsx) solo quando `movies.length === 0` e la paginazione non è ancora pronta (`!pagination || pagination.loading`). Arrivando da `Movies.jsx` con dati già in memoria, il loader viene saltato del tutto.
- **Errore iniziale vs Errore su "Carica altri"**:
  - Se fallisce il caricamento iniziale (`items.length === 0 && error`), mostra il blocco centrato con `role="alert"` e il pulsante `Riprova` che chiama `handleRetry` (`force: true`).
  - Se fallisce la paginazione incrementale (`items.length > 0 && error`), mantiene tutte le card caricate in griglia, mostra un avviso compatto `role="alert"` subito sopra il footer e commuta il pulsante `.load-more-btn` su `Riprova` (invocando `handleLoadMore`).
- **Pagina 1 filtrata vuota con `hasMore: true`**: anche se `items.length === 0` senza errori (es. pagina 1 di `upcoming` con tutti i candidati scartati dal filtro temporale mentre esistono pagine successive), il pulsante `Carica altri` resta disponibile per avanzare a pagina 2.
- **Cambio lingua `IT <-> EN`**: aggiorna live titolo categoria, sottotitolo, badge conteggio (`N Film` ↔ `N Movies`) e tutte le `MediaCard` senza re-fetch né perdita delle pagine `2..N`.

---

### 2.2 Utilizzo degli Hooks e motivazioni

| Hook | Codice / Dipendenze | Come funziona e perché viene usato |
| :--- | :--- | :--- |
| `useParams()` | `const { category } = useParams()` | Estrae lo slug `:category` dalla route e lo valida contro `MOVIE_CATEGORY_CONFIG`. |
| `useTranslation()` | `{ t, normalizedLang }` | Fornisce traduzioni per `getCategoryDisplayInfo`/`DetailNotFound` e tag esteso per `useMovieViewModel` e fetch iniziali/retry. |
| `useMovieViewModel({ language })` | Destrutturati `{ categoryMovies, categoryPagination, loadMoviesFromCategory }` | Sottoscrive `sharedMovieVM` in modo tearing-safe, condividendo in memoria le pagine già caricate da `Movies.jsx`. |
| `useMemo` (`categoryInfo`) | Deps: `[categoryKey, isValidCategory, t]` | Risolve `{ name, fullTitle, subtitle }` solo al cambio categoria o lingua (saltato se categoria invalida). |
| `useScrollToTop(categoryKey, !initialLoading)` | [domUtils.js](file:///C:/GitHub_Repositories/Cameos/src/utils/domUtils.js#L71-L86) | Imposta `scrollRestoration = 'manual'` e resetta lo scroll di `window` solo a caricamento iniziale completato. |
| `useEffectEvent` (`fetchInitialCategory`) | Invoca `loadMoviesFromCategory(targetCategory, { page: 1, language: normalizedLang })` | Legge sempre `normalizedLang` corrente senza inserirlo nelle dipendenze di `useEffect`, azzerando i re-fetch distruttivi al cambio lingua. |
| `useEffect` (fetch iniziale) | Deps: `[categoryKey, isValidCategory, movies.length, pagination?.loading, pagination?.error, pagination?.page]` | Carica pagina `1` solo su categoria valida, vuota, mai richiesta e priva di errore pendente. |
| `useGoBack(APP_ROUTES.movies)` | [domUtils.js](file:///C:/GitHub_Repositories/Cameos/src/utils/domUtils.js#L55-L60) | Torna alla vista precedente nella history interna o ripiega su `/Cameos/movies` su accesso diretto. |
| `useCallback` (`handleLoadMore`, `handleRetry`) | Deps minime per azione | Mantengono stabile l'identità dei callback verso `MediaCategoryLayout`; `handleLoadMore` accoda la pagina successiva (`append: true`), `handleRetry` forza il ricaricamento (`force: true`). |

---

### 2.3 Componenti e Parametri (Props)

#### 1. `MediaCategoryLayout` ([MediaCategoryLayout.jsx](file:///C:/GitHub_Repositories/Cameos/src/components/media/MediaCategoryLayout.jsx))
Shell a tutto schermo condivisa con `TVSeriesCategory.jsx`: header glass fisso, griglia responsiva (`.media-category-grid` in [mediaCategory.css](file:///C:/GitHub_Repositories/Cameos/src/css/media/mediaCategory.css)), stati vuoto/errore iniziale, errore inline su append e pulsante `Carica altri`.

| Prop | Tipo | Default | Ruolo |
| :--- | :--- | :--- | :--- |
| `title` | `string` *(req)* | — | Titolo principale `<h1>` nell'header glass |
| `subtitle` | `string` | `''` | Sottotitolo descrittivo sopra `<h1>` (omesso se vuoto) |
| `countLabel` | `string` | Derivato (`common.mediaCount`) | Etichetta del badge conteggio; se omessa viene calcolata internamente da `items.length` e `type` |
| `items` | `Array<Object>` *(req)* | — | Lista dei modelli `Movie` o `Series` da renderizzare in griglia |
| `type` | `'movie' \| 'tv'` *(req)* | — | Determina icona badge (`bi-film`/`bi-tv`), etichetta conteggio di default e prop `type` di `MediaCard` |
| `upcoming` | `boolean` | `false` | Prop inoltrata a `MediaCard` per nascondere i voti sui titoli in uscita |
| `hasMore` | `boolean` | `false` | Mostra il pulsante `Carica altri` / `Riprova` quando esistono altre pagine (`items.length > 0 \|\| !error`) |
| `isLoadingMore` | `boolean` | `false` | Disabilita `.load-more-btn` e mostra spinner + `common.loadingMore` durante l'append |
| `error` | `Error \| string \| Object \| null` | `null` | Attiva `role="alert"` (stato centrato se `items` vuoto; avviso inline sopra `.load-more-btn` se `items` popolato) |
| `onBack` | `() => void` *(req)* | — | Azione del pulsante circolare indietro nell'header |
| `onLoadMore` | `() => void` *(req)* | — | Azione del pulsante `Carica altri` (e retry append in stato errore con `items > 0`) |
| `onRetry` | `() => void` *(req)* | — | Azione del pulsante `Riprova` in stato errore iniziale (`items.length === 0`) |

#### 2. Componenti condivisi usati dalla pagina
- **`MediaCard`** ([MediaCard.jsx](file:///C:/GitHub_Repositories/Cameos/src/components/media/MediaCard.jsx)): renderizzata per ogni elemento della griglia con `{ key: item.id, item, type: 'movie', upcoming }`. Risolve titolo, poster, anno, badge voto e badge cameo live tramite `langKey`.
- **`DetailNotFound`** ([MediaDetailLayout.jsx](file:///C:/GitHub_Repositories/Cameos/src/components/media/MediaDetailLayout.jsx#L39-L86)): usata solo quando `!isValidCategory` con `{ icon: 'bi-film', title: t('common.noResults'), subtitle: null, onBack: goBack }`.
- **`LoadingScreen`** ([LoadingScreen.jsx](file:///C:/GitHub_Repositories/Cameos/src/components/LoadingScreen.jsx)): velo full-screen di caricamento iniziale con messaggio predefinito `t('common.loading')`.
