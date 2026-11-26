# Ricerca di film e serie

## Pagina Search e barra di ricerca

`SearchBar.jsx` è un componente della navbar condiviso tra desktop/tablet e mobile. Testo e filtro sono una bozza locale: digitare o cambiare criterio non effettua richieste. Il pulsante con la lente o Invio aprono `/Cameos/search?q=...&filter=...`; un testo vuoto non avvia la ricerca. Il dropdown contiene `all`, film/serie, attori, registi e generi. Su desktop/tablet mostra l'etichetta e un triangolo; su mobile mostra l'icona del filtro. La navigazione indietro ripristina i valori dall'URL.

`Search.jsx` legge i parametri e visualizza i caroselli preparati da `SearchViewModel`, tramite `useSearchViewModel`. La pagina non chiama repository o servizi, non classifica persone e non calcola il matching dei generi.

- Il criterio `title` prepara un `MediaCarousel` per i film e uno per le serie.
- `actor` e `director` preparano ciascuno un `CastCarousel` di persone, con collegamento al profilo. Nei risultati di ricerca le card mostrano foto e nome, senza didascalie del ruolo (`showRoles={false}`); i normali caroselli del cast conservano il personaggio interpretato. La classificazione usa il dipartimento principale TMDb (`Acting` oppure `Directing`); non interroga la filmografia di ogni candidato. Le persone note principalmente per altri dipartimenti non vengono incluse in questi gruppi. La ricerca per nome restituisce più candidati senza selezionare automaticamente una sola persona.
- `genre` confronta l'input con i generi localizzati e prepara un `MediaCarousel` misto film/serie per ogni corrispondenza. I titoli con lo stesso ID ma tipi diversi restano distinti.
- `all` esegue i percorsi mirati insieme. Attori e registi condividono la stessa richiesta per ogni pagina di persone.

Titoli e persone utilizzano gli endpoint di ricerca TMDb. L'endpoint delle persone cerca per nome e nomi alternativi; non espone un parametro documentato che garantisca la corrispondenza di una sottostringa arbitraria nel nome completo. La paginazione e l'ordinamento del servizio possono quindi impedire di ottenere tutti i candidati attesi da una ricerca parziale. Il frontend mantiene l'ordine dei candidati ricevuti.

Una verifica reale del 5 novembre 2026 ha restituito 10.000 risultati e 500 pagine per `chris`: le prime cinque pagine e i campioni alle pagine 50, 150, 300 e 500 contenevano nomi con la parola `Chris`, senza `Christopher`. La ricerca esplicita `christopher` restituiva subito Christopher Nolan, Christopher Lloyd e altri candidati. Aggiungere asterischi al testo non risolveva il problema nelle prime pagine; cercare `ristoph` restituiva zero risultati. Questo campione non dimostra che ogni pagina intermedia abbia lo stesso contenuto, ma dimostra che il servizio non garantisce la ricerca di sottostringhe richiesta dall'applicazione. Filtrare solo i risultati ricevuti con `includes()` non recupera i candidati assenti dalle risposte.

Per garantire il matching per sottostringa sull'intero catalogo serve un indice dei nomi indipendente dalla paginazione della ricerca TMDb. L'[esportazione giornaliera delle persone](https://developer.themoviedb.org/docs/daily-id-exports) è una possibile fonte da verificare per alimentarlo. L'indice potrebbe essere servito da un backend o generato e pubblicato come risorsa statica; nel progetto attuale non è presente un servizio di indicizzazione. La scelta richiede di definire hosting, aggiornamenti e dimensioni dei dati. Questa funzionalità non è attualmente implementata.

Per i generi, `utils/search.js` normalizza maiuscole e accenti e calcola la distanza di modifica dalla migliore sottostringa: massimo `min(2, floor(lunghezzaInput / 4))`, minimo due caratteri e massimo quattro generi distinti. I generi comuni a film e serie sono raggruppati per ID. Non vengono avviate ricerche per tutti i generi disponibili.

I caroselli caricano ulteriori pagine su richiesta. Le query restano separate per tipo, testo/ID, pagina e lingua; i cataloghi dei generi e le ricerche persone usano il fallback IndexedDB. I record sintetici delle persone non sovrascrivono i profili completi. Una ricerca precedente o una paginazione precedente non possono sovrascrivere una ricerca nuova. Se una sezione fallisce, gli altri risultati restano disponibili e il pulsante Riprova ripete la ricerca confermata.

Le ricerche di film e serie riutilizzano `isExcludedMedia()`, la stessa funzione applicata alla filmografia in `PersonDetail.jsx`. Vengono esclusi documentari (99), talk show (10767), reality (10764), notiziari (10763), record con `video === true` e titoli/apparizioni non narrativi già riconosciuti dalla regola condivisa. Non vengono aggiunte nuove categorie, soglie su voti o durata, né chiamate ai dettagli di ogni risultato. I cortometraggi, i film senza voti o generi e i film TV narrativi rimangono ammessi quando non ricadono nelle esclusioni esistenti.

`BaseBackend` filtra i dati originali, che conservano eventuali metadati di ruolo/video, e i modelli normalizzati, che risolvono anche le mappe dei titoli localizzati. `BaseRepository` applica lo stesso criterio alle query già salvate e alle ricerche sui titoli delle entità locali. Le pagine svuotate vengono superate in gruppi di massimo tre pagine remote per azione; al limite del gruppo la paginazione resta disponibile se il server indica altre pagine. I totali delle query rimangono quelli remoti, senza inventare un conteggio filtrato globale; il fallback sulle entità locali calcola invece i totali dopo le esclusioni.

`scripts/test-search-exclusions.mjs`, incluso in `npm run test:search`, verifica le esclusioni su entrambi i tipi di media, tutti i criteri, le query in cache, il fallback offline e le pagine svuotate dai generi esclusi.

Il componente condiviso `Carousel` misura la larghezza effettiva delle card, escludendo l'indicatore di caricamento e il padding del contenitore. Se le card non riempiono lo spazio disponibile, richiede altre pagine senza spostare la posizione di scorrimento. `ResizeObserver` aggiorna la misura quando cambia il layout, anche passando da mobile a desktop. Un carosello già pieno, senza altre pagine o con un caricamento in corso non avvia richieste di riempimento.

La gestione dello stato e dei caricamenti è raccolta in `utils/useCarouselNavigation.js`; misure, passo di scorrimento e gestori dei pulsanti risiedono in `utils/domUtils.js`. `Carousel.jsx` usa questi moduli e compone il layout.

Il limite dei caricamenti automatici viene calcolato alla prima richiesta per la larghezza corrente: al massimo un caricamento per ogni card mancante a riempire lo spazio visibile, considerando larghezza delle card e gap. Un ridimensionamento rinnova il limite. Questo permette di riempire anche i gruppi più sparsi, come i registi, senza fermarsi dopo tre richieste con gran parte della riga ancora vuota. Una risposta che non aggiunge card (pagina vuota, duplicati o errore) interrompe il riempimento automatico. La freccia rimane disponibile per continuare quando esistono altre pagine. Il limite è distinto da quello del ViewModel: ogni caricamento della ricerca può già leggere fino a tre pagine remote consecutive per superare pagine svuotate dal filtro.

La freccia destra conserva una destinazione assoluta a una schermata di distanza. Se le card caricate consentono soltanto uno spostamento parziale ma esistono altre pagine, attende le pagine necessarie e poi esegue un solo scorrimento verso quella destinazione. Anche questa sequenza ha un limite proporzionato alle card mancanti e si interrompe senza progressi. Un caricamento già in corso viene atteso, i click ripetuti non duplicano la destinazione e la freccia sinistra annulla l'avanzamento in attesa. Quando finiscono le pagine viene mostrata la porzione finale effettivamente disponibile. L'indicatore di caricamento non viene conteggiato come contenuto navigabile.

`npm run test:carousel` avvia Vite e Chrome senza finestra e verifica il componente reale, senza chiamate TMDb. Copre riempimento, ordine, posizione, ridimensionamento mobile/desktop, limite delle richieste, continuazione manuale, assenza di progressi, fine delle pagine e caricamenti in corso, anche in React StrictMode. Include un `CastCarousel` con pagine che aggiungono una sola persona alla volta, per riprodurre il caso dei registi. Chrome viene cercato nel percorso standard del sistema; `CHROME_PATH` permette di indicare un altro eseguibile. `npm run test:carousel -- --live` aggiunge le verifiche reali di `transform` (film) e `chris` (registi) a 2048 pixel usando la configurazione TMDb locale. Nella verifica del 5 novembre 2026 il carosello dei registi ha raggiunto 15 persone, con 2.099 pixel di contenuto per 2.000 pixel disponibili, dopo aver consumato le prime 11 pagine di ricerca persone; non ha spostato la posizione iniziale né mostrato persone duplicate.

`npm run test:search` comprende anche i test di orchestrazione della pagina, isolamento dei filtri, matching dei generi, richieste condivise, paginazione, errori, risposte obsolete e cache. La navigazione della navbar e i caroselli sono stati verificati in Chrome con repository simulati a 1280, 820, 768 e 375 pixel.

Le ricerche sono disponibili in `MovieViewModel`, `MovieRepository`, `MovieBackend` e nei corrispondenti livelli delle serie. Il contratto comune è documentato da `MediaSearchParams` in `../src/utils/media/search.js`.

| `searchBy` | Parametro | Comportamento |
| --- | --- | --- |
| `title` (predefinito) | `query` | Ricerca del titolo tramite gli endpoint di ricerca TMDb. |
| `genre` | `genreId` oppure `query` | ID del genere, combinazione di ID con virgola/pipe, oppure nome esatto del genere nella lingua richiesta. |
| `actor` | `personId` oppure `query` | Film o serie presenti nei crediti di recitazione della persona. |
| `director` | `personId` oppure `query` | Film o serie con incarico esattamente `Director`. Gli altri incarichi della troupe non sono inclusi. |

`page` parte da 1; `language` usa le convenzioni già presenti nel progetto. Gli ID hanno precedenza sul testo. Un titolo vuoto restituisce una pagina vuota. Criteri, pagine o identificatori non validi producono un errore, gestito nello stato del ViewModel secondo il comportamento esistente.

## Chiamate dai ViewModel

Le chiamate precedenti per titolo e genere restano valide. Entrambi i ViewModel espongono anche i metodi dedicati per attore e regista:

```js
await movieVM.searchMovies('Inception');
await movieVM.searchMoviesByGenre('Dramma');
await movieVM.searchMoviesByGenre(18, 2, 'it-IT');
await movieVM.searchMoviesByActor('Leonardo DiCaprio');
await movieVM.searchMoviesByDirector({ personId: 525, page: 1 });

await seriesVM.searchSeries('Twin Peaks');
await seriesVM.searchSeriesByGenre('Drama', 1, 'en-US');
await seriesVM.searchSeriesByActor('Kyle MacLachlan');
await seriesVM.searchSeriesByDirector('David Lynch');
```

Tutti i metodi di ricerca che restituiscono Promise sono dichiarati `async`, anche quando delegano ad altri metodi asincroni. Normalizzazione e adattamento dei parametri restano sincroni.

Il metodo comune permette di scegliere esplicitamente il criterio:

```js
await movieVM.searchMovies({ searchBy: 'actor', query: 'Tom Hanks', page: 2 });
await seriesVM.searchSeries({ searchBy: 'director', personId: 5602, language: 'it-IT' });
```

Repository e backend accettano lo stesso oggetto, anche nei metodi dedicati:

```js
await movieRepository.searchMoviesByActor({ query: 'Tom Hanks', page: 2 });
await seriesBackend.searchSeriesByDirector({ personId: 5602, language: 'it-IT' });
```

## Risultati e politiche

Tutti i criteri restituiscono `{ page, total_pages, total_results, results }`, con istanze `Movie` o `Series`. Il ViewModel aggiorna `searchResults`, `page`, `totalPages`, `totalResults`, `loading` ed `error`. Una sola chiave di richiesta protegge i risultati anche quando una ricerca più recente usa un criterio diverso.

I nomi delle persone vengono risolti con `/search/person`: viene preferita una corrispondenza esatta senza distinzione tra maiuscole e minuscole nella prima pagina; altrimenti viene scelto il primo risultato TMDb. Per distinguere omonimi o selezionare una persona precisa, usare `personId`. Nessuna corrispondenza restituisce una pagina vuota. I nomi dei generi vengono confrontati con l'elenco TMDb nella lingua richiesta.

I crediti personali mantengono titoli, trame e immagini nelle lingue supportate. Vengono applicate le esclusioni della filmografia per contenuti non narrativi. I risultati sono deduplicati per ID, ordinati per popolarità e suddivisi in pagine da 20 elementi; i totali sono calcolati dopo il filtro. Un errore remoto non viene trasformato in un risultato vuoto.

Le ricerche condividono la strategia Network-First e il fallback IndexedDB. Le chiavi distinguono criterio, testo o ID, pagina e lingua; quelle precedenti per titolo e genere per ID restano compatibili. Solo la ricerca per titolo mantiene anche la ricerca sugli elementi locali quando la query non è mai stata salvata. I risultati sintetici non sovrascrivono dettagli completi già in cache.

La logica comune risiede nelle classi Base dei tre layer: `BaseBackend._searchMedia()` gestisce richieste e selezione dei crediti; `BaseRepository._executeMediaSearch()` gestisce chiavi di cache e fallback; `BaseViewModel._mediaSearchInput()` adatta i parametri e `runSearch()` gestisce lo stato. `MovieBackend` e `SeriesBackend` estendono `BaseBackend`. I metodi dedicati delegano al percorso comune. Contratto, validazione ed esito vuoto restano in `utils/search.js`, condivisi tra backend e repository.

## Verifica

I profili personali usano `/Cameos/person/:id` e la pagina `PersonDetail.jsx`; i vecchi indirizzi `/Cameos/actor/:id` restano validi. Le pill dei registi, sceneggiatori e creatori nei dettagli film/serie aprono il profilo con `?credits=crew`, mostrando le opere con incarichi creativi al posto del personaggio interpretato. Le opere con più incarichi sono raggruppate per tipo e ID. I cameo restano nella sezione esistente anche quando la stessa opera compare nella filmografia creativa. Senza criterio esplicito, i profili noti per regia o scrittura mostrano i crediti creativi; gli altri mostrano la recitazione. `?credits=cast` permette di richiedere esplicitamente quest'ultima.

I componenti personali sono in `src/components/person`: `PersonHeader`, `PersonBiography`, `PersonCard`, `PersonCameos` e `PersonFilmography`. La selezione dei crediti applica le esclusioni anche alle query già in cache, sia per recitazione sia per incarichi creativi. Il filtro accetta i generi nei campi `genreIds`, `genre_ids` e `genres`: documentari (99), talk show (10767), reality (10764) e notiziari (10763). Le serie narrative restano incluse; le esclusioni dipendono dai metadati disponibili e dalle regole esistenti su titoli e apparizioni non narrative.

La filmografia normalizza valutazioni, conteggi dei voti e date dei crediti TMDb. Le card accettano anche i campi originali per leggere le query già in cache. La pagina personale attende i dati di filmografia e cameo e il caricamento/decodifica di foto e poster; gli errori delle immagini non bloccano la pagina. Il limite temporale delle immagini delle altre pagine di dettaglio resta invariato.

`npm run test:person` verifica ruoli creativi, aggregazione dei crediti TV, deduplicazione, separazione dei cameo, metadati e persistenza online/offline della filmografia personale. Verifica inoltre caricamento, decodifica, errori e annullamento dell'attesa delle immagini.

`npm run test:search` esegue test deterministici su entrambi i tipi di media, tutti i criteri, nomi/ID, filtro della regia, localizzazione, deduplicazione, paginazione, cache, errori e risposte obsolete. Gli endpoint remoti sono sostituiti da fixture locali; non è richiesto un accesso reale a TMDb.
