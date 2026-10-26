# Analisi Dettagliata Campi JSON TMDB - Progetto CAMEOS

Questo documento analizza ciascun campo restituito dalle API ufficiali di TMDb per le entità:
1. **Catalog Lists (Discover / Trending / Search)**
2. **TV Series (Dettagli)**
3. **Season (Stagione)**
4. **Episode (Episodio)**
5. **Movie (Film)**
6. **Person (Attore / Artista)**
7. **Cameo (Entità derivata per il Core Domain)**

---

## 1. Catalog Lists (`/discover/tv`, `/discover/movie`, `/search/...`, `/trending/...`)

Oggetto leggero per liste, griglie, caroselli e filtri.

| Campo TMDb | Tipo | Significato TMDb | Rilevanza CAMEOS | Decisione e Mappatura |
| :--- | :--- | :--- | :--- | :--- |
| `id` | int | Identificativo univoco TMDb dell'opera. | **Critica** | **Mantieni**: `id` |
| `name` / `title` | string | Titolo tradotto nella lingua richiesta (`language`). `name` per TV, `title` per Film. | **Critica** | **Rinomina/Uniforma**: `name` in TV, `title` in Film, oppure proprietà unificata `title` |
| `original_name` / `original_title` | string | Titolo nella lingua d'origine dell'opera. | **Media** | **Rinomina**: `originalName` / `originalTitle`. Utile per mostrare il titolo originale tra parentesi |
| `overview` | string | Sinossi/trama sintetica dell'opera. | **Alta** | **Mantieni**: `overview`. Se vuota (non tradotta), fallback a inglese |
| `poster_path` | string | Path relativo locandina verticale (`/abc.jpg`). | **Critica** | **Sostituito da `posterUrl` bilingue**: `{ it: "...", en: "..." }`. Il vecchio campo path è eliminato. |
| `backdrop_path` | string | Path relativo immagine orizzontale copertina. | **Alta** | **Sostituito da `backdropUrl` bilingue**: `{ it: "...", en: "..." }`. Il vecchio campo path è eliminato. |
| `genre_ids` | int[] | Array di ID numerici dei generi (es. `18` per Dramma, `35` Commedia). | **Alta** | **Rinomina**: `genreIds`. Utile per filtri e badge genere senza fare chiamate extra |
| `first_air_date` / `release_date` | string | Data prima uscita (`YYYY-MM-DD`). | **Alta** | **Rinomina**: `firstAirDate` (TV) / `releaseDate` (Film) |
| `popularity` | float | Punteggio algoritmico interno di TMDb (ricerche, visualizzazioni settimanali). | **Alta** | **Mantieni**: `popularity`. Usato per ordinamento popolarità |
| `vote_average` | float | Media voti utenti TMDb (da 0.0 a 10.0). | **Alta** | **Rinomina**: `voteAverage` |
| `vote_count` | int | Numero totale di voti ricevuti. | **Media** | **Rinomina**: `voteCount`. Utile per evitare che opere con 1 solo voto da 10 finiscano prime |
| `origin_country` | string[] | Codici nazione di produzione (es. `["US"]`, `["IT"]`). | **Bassa** | **Rinomina**: `originCountry`. Utile solo per bandierine o filtri nazione |
| `original_language` | string | Codice lingua originale (`"en"`, `"it"`, `"ja"`). | **Bassa** | **Rinomina**: `originalLanguage` |
| `adult` | bool | Flag contenuti espliciti per adulti. | **Filtro** | **Ometti nel model**, usato solo a monte come filtro per escludere contenuti non idonei |
| `video` (solo film) | bool | Indica se TMDb ha video/trailer embeddati. | **Nessuna** | **Ometti**: non fornisce il video vero, solo un booleano |
| `softcore` | bool | Flag non standard TMDb su alcune serie. | **Nessuna** | **Ometti** |

---

## 2. Dettaglio Serie TV (`/tv/{id}`)

Dati completi quando l'utente apre la scheda della serie.

| Campo TMDb | Tipo | Significato TMDb | Rilevanza CAMEOS | Decisione e Mappatura |
| :--- | :--- | :--- | :--- | :--- |
| `id`, `name`, `original_name`, `overview` | vari | Vedere sezione 1. | **Critica** | **Mantieni/Rinomina** (`id`, `name`, `originalName`, `overview`) |
| `poster_path`, `backdrop_path` | string | Locandina e sfondo alta risoluzione. | **Critica** | **Mantieni + Getter**: `posterPath` (`posterUrl`), `backdropPath` (`backdropUrl`) |
| `first_air_date` | string | Data messa in onda primo episodio. | **Alta** | **Rinomina**: `firstAirDate` |
| `last_air_date` | string | Data messa in onda ultimo episodio andato in onda. | **Media** | **Rinomina**: `lastAirDate`. Utile per mostrare l'arco temporale (es. 2008 - 2013) |
| `status` | string | Stato produzione: `"Ended"`, `"Returning Series"`, `"Canceled"`, `"In Production"`. | **Alta** | **Mantieni**: `status`. Fondamentale per indicare se la serie è conclusa o in corso |
| `type` | string | Tipologia formato: `"Scripted"`, `"Miniseries"`, `"Documentary"`, `"Reality"`. | **Media** | **Mantieni**: `type` (es. Miniserie vs Serie TV) |
| `tagline` | string | Slogan promozionale della serie (se presente). | **Bassa** | **Mantieni**: `tagline` |
| `in_production` | bool | Indica se la serie è attivamente in produzione. | **Media** | **Rinomina**: `inProduction` |
| `homepage` | string | URL del sito web ufficiale della serie. | **Bassa** | **Mantieni**: `homepage` (link esterno opzionale) |
| `number_of_seasons` | int | Numero totale stagioni regolari. | **Alta** | **Rinomina**: `numberOfSeasons` |
| `number_of_episodes` | int | Numero totale episodi complessivi. | **Alta** | **Rinomina**: `numberOfEpisodes` |
| `genres` | object[] | Array oggetti `{ id, name }` tradotti (es. `"Dramma"`, `"Crime"`). | **Alta** | **Mantieni**: `genres` (arricchito rispetto a `genre_ids`) |
| `created_by` | object[] | Creatori/showrunner `{ id, name, profile_path }`. | **Alta** | **Rinomina**: `createdBy`. Chi ha ideato la serie |
| `networks` | object[] | Emittenti televisive/broadcaster (es. AMC, HBO, Netflix) con `{ id, name, logo_path }`. | **Alta** | **Mantieni**: `networks`. Ottimo per mostrare il logo del canale/piattaforma |
| `production_companies` | object[] | Case di produzione cinematografiche/TV con logo. | **Media** | **Rinomina**: `productionCompanies` |
| `production_countries` | object[] | Paesi di produzione `{ iso_3166_1, name }`. | **Bassa** | **Ometti o secondario** |
| `languages`, `spoken_languages` | array | Lingue audio e parlate. | **Bassa** | **Ometti o secondario**: non cruciale per l'utente |
| `episode_run_time` | int[] | Durata media episodi (spesso vuoto nelle serie recenti di TMDb). | **Bassa** | **Ometti**: si usa il `runtime` specifico presente nel singolo episodio |
| `seasons` | object[] | Lista sintetica delle stagioni (vedere sezione 3). | **Critica** | **Mantieni**: `seasons` |
| `last_episode_to_air` | object | Dati dell'ultimo episodio trasmesso. | **Media** | **Rinomina**: `lastEpisodeToAir`. Utile per "Ultimo episodio uscito" |
| `next_episode_to_air` | object | Dati del prossimo episodio programmato. | **Media** | **Rinomina**: `nextEpisodeToAir`. Utile per countdown |
| `aggregate_credits` | object | Cast e Crew complessivi dell'intera serie. | **Critica per Camei** | **Rinomina**: `aggregateCredits` / `cast`. Da qui si estraggono i VIP con 1 o 2 episodi |

---

## 3. Dettaglio Stagione (`/tv/{id}/season/{season_number}`)

| Campo TMDb | Tipo | Significato TMDb | Rilevanza CAMEOS | Decisione e Mappatura |
| :--- | :--- | :--- | :--- | :--- |
| `id` | int | ID univoco della stagione. | **Critica** | **Mantieni**: `id` |
| `_id` | string | ID hash MongoDB legacy interno a TMDb (es. `"5256cfbb..."`). | **Nessuna** | **Ometti**: duplicato ridondante di `id` |
| `season_number` | int | Numero d'ordine (`0` = Episodi speciali / dietro le quinte, `1..N` stagioni canoniche). | **Critica** | **Rinomina**: `seasonNumber` |
| `name` | string | Nome della stagione (es. `"Stagione 1"` o titolo dedicato). | **Alta** | **Mantieni**: `name` |
| `overview` | string | Trama specifica di quella stagione. | **Media** | **Mantieni**: `overview` |
| `air_date` | string | Data di inizio trasmissione della stagione. | **Alta** | **Rinomina**: `airDate` |
| `poster_path` | string | Locandina specifica della stagione. | **Alta** | **Mantieni + Getter**: `posterPath` (`posterUrl`) |
| `vote_average` | float | Valutazione media della stagione. | **Media** | **Rinomina**: `voteAverage` |
| `episodes` | object[] | Elenco completo di tutti gli episodi della stagione. | **Critica** | **Mantieni**: `episodes` (istanziati come `Episode`) |

---

## 4. Dettaglio Episodio (in `season.episodes` o `/tv/{id}/season/{s}/episode/{e}`)

| Campo TMDb | Tipo | Significato TMDb | Rilevanza CAMEOS | Decisione e Mappatura |
| :--- | :--- | :--- | :--- | :--- |
| `id` | int | ID univoco episodio TMDb. | **Critica** | **Mantieni**: `id` |
| `show_id` | int | ID della serie padre. | **Alta** | **Rinomina**: `seriesId` (più chiaro di `show_id`) |
| `season_number` | int | Numero stagione a cui appartiene. | **Critica** | **Rinomina**: `seasonNumber` |
| `episode_number` | int | Numero episodio all'interno della stagione (`1`, `2`...). | **Critica** | **Rinomina**: `episodeNumber` |
| `name` | string | Titolo dell'episodio (nella lingua richiesta). | **Critica** | **Mantieni**: `name` |
| `overview` | string | Trama dettagliata dell'episodio. | **Alta** | **Mantieni**: `overview` |
| `air_date` | string | Data di prima messa in onda dell'episodio. | **Alta** | **Rinomina**: `airDate` |
| `runtime` | int | Durata precisa in minuti dell'episodio. | **Alta** | **Mantieni**: `runtime` |
| `still_path` | string | Immagine/fotogramma catturato dall'episodio (`/still.jpg`). | **Critica** | **Mantieni + Getter**: `stillPath` + getter `stillUrl` |
| `vote_average`, `vote_count` | float, int | Voti specifici per questo episodio. | **Media** | **Rinomina**: `voteAverage`, `voteCount` |
| `episode_type` | string | Classificazione: `"standard"`, `"midseason"`, `"finale"`. | **Media** | **Rinomina**: `episodeType` (utile per badge "Finale di stagione") |
| `production_code` | string | Codice interno di produzione dello studio (es. `"3X5566"`). | **Nessuna** | **Ometti**: irrilevante per gli utenti |
| `guest_stars` | object[] | **ELENCO GUEST STARS DELL'EPISODIO**. | **FONDAMENTALE PER CAMEOS** | **Mantieni/Elabora**: da questo array estraiamo direttamente i Camei dell'episodio! |
| `crew` | object[] | Regista (`Director`), Sceneggiatore (`Writer`), ecc. | **Media** | **Mantieni**: `crew` (filtrando per ruoli chiave: Regia e Sceneggiatura) |

---

## 5. Dettaglio Film (`/movie/{id}`)

| Campo TMDb | Tipo | Significato TMDb | Rilevanza CAMEOS | Decisione e Mappatura |
| :--- | :--- | :--- | :--- | :--- |
| `id`, `title`, `original_title`, `overview` | vari | Dati anagrafici del film. | **Critica** | **Mantieni/Rinomina**: `id`, `title`, `originalTitle`, `overview` |
| `release_date` | string | Data di uscita nei cinema (`YYYY-MM-DD`). | **Critica** | **Rinomina**: `releaseDate` |
| `runtime` | int | Durata del film in minuti (es. `181`). | **Critica** | **Mantieni**: `runtime` |
| `status` | string | Stato (`"Released"`, `"Post Production"`, `"In Production"`). | **Alta** | **Mantieni**: `status` |
| `tagline` | string | Slogan promozionale della locandina. | **Media** | **Mantieni**: `tagline` |
| `poster_path`, `backdrop_path` | string | Immagini locandina e sfondo. | **Critica** | **Mantieni + Getter**: `posterPath` (`posterUrl`), `backdropPath` (`backdropUrl`) |
| `budget` | int | Budget di produzione in dollari (es. `356000000`). | **Media** | **Mantieni**: `budget` |
| `revenue` | int | Incassi mondiali al botteghino in dollari (es. `2938567784`). | **Media** | **Mantieni**: `revenue` |
| `popularity`, `vote_average`, `vote_count` | float, int | Popolarità e voti utenti. | **Alta** | **Rinomina**: `popularity`, `voteAverage`, `voteCount` |
| `belongs_to_collection` | object | Informazioni sulla saga/franchise cinematografico (es. *Avengers - Collezione*). | **Alta** | **Rinomina**: `collection`. Utile per correlare i film della stessa saga |
| `genres` | object[] | Generi con nome tradotto (`{ id, name }`). | **Alta** | **Mantieni**: `genres` |
| `production_companies` | object[] | Studi cinematografici (Marvel Studios, Warner, Universal). | **Media** | **Rinomina**: `productionCompanies` |
| `production_countries`, `spoken_languages` | array | Paesi e lingue parlate. | **Bassa** | **Ometti o secondario** |
| `imdb_id` | string | ID IMDb (es. `"tt4154796"`). | **Alta** | **Rinomina**: `imdbId`. Permette di mettere il link diretto "Vedi su IMDb" |
| `homepage` | string | Sito web ufficiale. | **Bassa** | **Mantieni**: `homepage` |
| `credits.cast` | object[] | Cast attori completo del film con ruoli e ordine. | **FONDAMENTALE PER CAMEOS** | **Rinomina**: `cast`. Analizzato per estrarre i camei del film |
| `credits.crew` | object[] | Registi e reparto tecnico. | **Alta** | **Rinomina**: `crew`. Registi fondamentali |

---

## 6. Scheda Persona / Attore (`/person/{id}`)

| Campo TMDb | Tipo | Significato TMDb | Rilevanza CAMEOS | Decisione e Mappatura |
| :--- | :--- | :--- | :--- | :--- |
| `id` | int | ID univoco persona TMDb. | **Critica** | **Mantieni**: `id` |
| `name` | string | Nome dell'attore/regista (es. `"Stan Lee"`). | **Critica** | **Mantieni**: `name` |
| `also_known_as` | string[] | Pseudonimi, soprannomi (es. `"The Man"`, `"Stan The Man"`). | **Media** | **Rinomina**: `alsoKnownAs` |
| `biography` | string | Biografia tradotta dell'artista. | **Alta** | **Mantieni**: `biography` |
| `birthday` | string | Data di nascita (`YYYY-MM-DD`). | **Alta** | **Mantieni**: `birthday` |
| `deathday` | string/null | Data di morte (`YYYY-MM-DD`) o `null` se in vita. | **Alta** | **Mantieni**: `deathday` |
| `place_of_birth` | string | Luogo di nascita (città, stato). | **Media** | **Rinomina**: `placeOfBirth` |
| `gender` | int | Sesso: `1` = Femminile, `2` = Maschile, `3` = Non binario, `0` = Non specificato. | **Bassa** | **Mantieni**: `gender` |
| `known_for_department` | string | Ruolo principale: `"Acting"` (Recitazione), `"Writing"`, `"Directing"`. | **Alta** | **Rinomina**: `knownForDepartment` |
| `popularity` | float | Punteggio fama globale TMDb. | **Alta** | **Mantieni**: `popularity` |
| `profile_path` | string | Foto ritratto/avatar dell'attore (`/foto.jpg`). | **Critica** | **Mantieni + Getter**: `profilePath` + getter `profileUrl` |
| `imdb_id` | string | ID IMDb della persona (es. `"nm0498278"`). | **Media** | **Rinomina**: `imdbId` |
| `homepage` | string | Sito web personale. | **Bassa** | **Mantieni**: `homepage` |
| `tv_credits.cast` | object[] | Tutte le serie TV in cui è apparso con `episode_count` e `character`. | **FONDAMENTALE PER CAMEOS** | **Elabora**: base per calcolare `careerCameos` in TV |
| `movie_credits.cast` | object[] | Tutti i film in cui è apparso con `order` e `character`. | **FONDAMENTALE PER CAMEOS** | **Elabora**: base per calcolare `careerCameos` nei Film |

---

## 7. Oggetto di Dominio `Cameo` (Creato appositamente per CAMEOS)

Non esiste un endpoint nativo `/cameo` su TMDb: è il **valore aggiunto del nostro backend**. L'oggetto `Cameo` unifica e normalizza apparizioni da `guest_stars`, `aggregate_credits`, `movie_credits` e `tv_credits`.

| Proprietà Modellata | Tipo | Significato e Regola di Derivazione |
| :--- | :--- | :--- |
| `id` | int | ID dell'attore su TMDb. |
| `name` | string | Nome dell'attore (es. "Stan Lee", "Stephen Hawking"). |
| `character` | string | Personaggio interpretato (es. "Stan Lee", "Self", "Driver", "Man in Fair (uncredited)"). |
| `profilePath` / `profileUrl` | string | Foto dell'attore con URL completo risolto. |
| `popularity` | float | Popolarità dell'attore al momento della chiamata. |
| `cameoBadge` | string | Badge categorizzato: `'VIP (Se stesso)'` \| `'Cameo'` \| `'Special Guest Star'` \| `'VIP Guest Star'`. |
| `isVoiceActor` | bool | `true` se il personaggio contiene `"(voice)"` o `"(voce)"` (doppiatore originale). |
| `isCameoHighlight` | bool | `true` se soddisfa le condizioni di cameo (esplicito, nome proprio o alta popolarità). |
| `order` | int/null | Posizione nei titoli di testa (nei film, se `order >= 8` non è protagonista). |
| `episodeCount` | int/null | Numero di episodi (nelle serie TV: `1` o `2` indicano apparizione speciale). |
| `mediaType` | string | `'tv'` oppure `'movie'`. |
| `mediaTitle` | string | Titolo del film o serie TV in cui compare. |
| `mediaId` | int | ID dell'opera di riferimento per permettere la navigazione incrociata. |
