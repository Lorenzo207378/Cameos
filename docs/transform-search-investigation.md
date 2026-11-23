# Analisi della ricerca "transform"

Verifica del 5 novembre 2026 tramite richieste reali, di sola lettura, all'API TMDb con la configurazione locale del progetto. Nessuna credenziale è inclusa nel documento.

## Risultati osservati

La ricerca `/search/movie?query=transform` restituisceva 426 risultati in 22 pagine. L'ordine delle pagine italiane e inglesi non era identico.

| Campione | Risultati | `video: true` | Descrizione esplicita del programma fitness |
| --- | ---: | ---: | ---: |
| Film, inglese, pagina 1 | 20 | 13 | 12 |
| Film, inglese, pagina 2 | 20 | 17 | 17 |
| Film, inglese, pagina 3 | 20 | 20 | 20 |
| Film, italiano, pagina 1 | 20 | 15 | 0, descrizioni italiane mancanti |

I 49 risultati fitness del campione inglese appartenevano al programma Transform 20 e avevano tutti `video: true` e `genre_ids: []`. Il cinquantesimo elemento con flag video nel campione inglese era l'evento di wrestling `ROH: Transform` (835073). Il campo `video` era già presente nelle risposte di ricerca; non occorre una chiamata ai dettagli per leggerlo.

Il controllo dei dettagli di quattro risultati fitness ha confermato generi e keyword vuoti, durata registrata pari a zero e flag `video: true`. Alcuni avevano voti: il titolo 646982 ne aveva tre. In italiano le descrizioni non contenevano il testo esplicativo disponibile in inglese.

## Controlli di confronto

| ID | Titolo | `video` | Durata | Voti |
| --- | --- | --- | ---: | ---: |
| 646986 | Transform 20 Extra - Nutrition | true | 0 | 0 |
| 647023 | Transform 20 - Talking About Transform 20 | true | 0 | 0 |
| 646408 | Transform 20 Bonus Workouts - 05 - 20 Min Abs | true | 0 | 0 |
| 646982 | Transform 20 Extra - 20 Tips To Rock Your Results | true | 0 | 3 |
| 853958 | Transform | false | 11 | 0 |
| 38972 | Kamen Rider Hibiki: Asumu Transform! You can be an Oni, too!! | false | 15 | 3 |
| 1858 | Transformers | false | 144 | 12714 |

I dati di catalogo, i conteggi dei voti e l'ordinamento possono cambiare.

## Regola implementata

Le ricerche escludono i record con `video === true`, tramite `isVideoMedia()` in `src/models/utils/mediaLabels.js`. Lo stesso criterio integra `isExcludedMedia()` per filmografie e cameo. Il filtro non dipende dal titolo, dalla lingua, dal numero dei voti, dalla durata o dalla presenza di generi. I controlli narrativi del campione restano inclusi. La correttezza del criterio dipende dalla classificazione del record su TMDb; non è un classificatore infallibile di contenuti.

La [documentazione Discover](https://developer.themoviedb.org/reference/discover-movie) espone `include_video`, con valore predefinito false. L'[endpoint Search](https://developer.themoviedb.org/reference/search-movie) non documenta questo parametro: nella ricerca per testo il filtro va quindi applicato dall'applicazione alla risposta, senza aggiungere un parametro non supportato.

`BaseBackend._searchMedia()` applica il filtro prima di costruire i modelli. `Movie` conserva il booleano `video`; `BaseRepository` applica il criterio anche alle query in cache e alle ricerche sui titoli locali. Le voci senza flag vengono conservate: i vecchi record già salvati senza il campo non permettono di ricostruirlo con certezza offline. Una successiva ricerca online aggiorna la query secondo la strategia Network-First esistente.

La paginazione continua a usare le pagine e i totali remoti: filtrare una pagina non rende validi nuovi totali calcolati dalla sola pagina corrente. `SearchViewModel._loadSection()` legge al massimo tre pagine consecutive per azione, fermandosi al primo gruppo di risultati validi o alla fine delle pagine remote. Se il gruppo resta vuoto ma esistono altre pagine, conserva `hasMore` e la pagina effettivamente consumata. I risultati già visualizzati rimangono disponibili.

## Verifica dell'implementazione

La verifica reale della prima pagina di `transform` ha confrontato gli ID restituiti dall'API con quelli del repository dopo il filtro: 20 risultati iniziali, 15 esclusi e 5 conservati in italiano; 20 iniziali, 13 esclusi e 7 conservati in inglese. I totali remoti sono rimasti 426 risultati e 22 pagine. Il cortometraggio `Transform` (853958) è rimasto incluso. Un controllo della paginazione partendo dalla pagina 3 inglese ha raggiunto la pagina 4 con due risultati validi, mantenendo altre pagine disponibili.

`scripts/test-video-filter.mjs` copre la regola indipendente dal testo, tutti i criteri di ricerca film, il modello, le query salvate, la ricerca locale, la filmografia e le pagine vuote/interrotte. Si esegue con `npm run test:search` insieme alle altre verifiche di ricerca.
