# Riordino delle utility e controllo del codice

Verifica del 5 novembre 2026 sul worktree corrente.

## Organizzazione

- `../src/utils/media/search.js` contiene ora anche `MediaSearchParams`, `normalizeMediaSearch()` ed `emptySearchPage()`. Il vecchio `mediaSearch.js` è stato rimosso e sono stati aggiornati import, riferimenti JSDoc e documentazione.
- `Carousel.jsx` gestisce il rendering. `useCarouselNavigation.js` conserva stato, paginazione, riempimento e destinazione dello scorrimento; `domUtils.js` contiene misurazione delle card, calcolo del passo di scorrimento, stato dei pulsanti e lettura delle gesture touch condivisa con slider e selettore delle stagioni.
- `ApiService.js` conserva configurazione, stato delle richieste e operazioni HTTP. `ApiServiceHelpers.js` gestisce risoluzione del token, estrazione della chiave, preparazione di URL e identità della richiesta, coda di concorrenza e clonazione dei payload. Retry, autenticazione, deduplicazione e limite di dieci richieste concorrenti mantengono il comportamento verificato dai test.

## Pulizia generale

Il controllo ha incluso ESLint per sorgenti e script `.mjs`, ispezioni WebStorm su tutti i 146 file JavaScript, JSX e CSS in `src`, analisi degli import statici e controllo manuale dei riferimenti dinamici.

Sono stati eliminati il vecchio componente `SeriesDetail.jsx` interamente commentato, i cataloghi dimostrativi non consumati, gli helper e gli export legacy senza chiamanti, l'inizializzazione Firebase Storage inutilizzata, alias di formattazione inutilizzati e iterazioni che producevano soltanto frammenti vuoti nelle sezioni del profilo. Le recensioni dimostrative effettivamente visualizzate sono state conservate.

Sono stati corretti documentazione e props obsolete del loader, tipi dei riferimenti DOM e dei componenti, Promise avviate intenzionalmente senza attenderne il risultato, la selezione singolare/plurale del conteggio voti, la dichiarazione della proprietà CSS del backdrop e le duplicazioni nei gestori touch. I riferimenti ai dati delle immagini usano URL espliciti.

L'analisi degli import non trova moduli sorgente orfani. Due candidati segnalati dall'analisi statica sono stati verificati e conservati: `normalizeLanguagesText` viene usato tramite import dinamico nei test di localizzazione; `isUpcomingMovie` è dichiarato come alias pubblico di compatibilità.

## Verifiche

- `npm run lint`: nessun errore o warning; la configurazione include anche gli script Node `.mjs`.
- 79 test deterministici passati: architettura, ricerca, filtro video, crediti personali, precaricamento immagini, localizzazione, traduzioni, cameo e formattazione.
- `npm run test:carousel -- --live`: passati i controlli Chrome su riempimento, navigazione alla prima pressione, click ripetuti, caricamenti in corso, fine delle pagine, ruoli nelle card, ridimensionamento e swipe dei componenti reali. Verificate anche le ricerche TMDb `transform` e `chris` a 2048 pixel.
- `npm run build`: completata. Il JavaScript principale passa da circa 1,84 MB prima della pulizia a circa 1,23 MB; i dati dimostrativi rimossi non vengono più importati e inizializzati dall'applicazione.
- `git diff --check`: nessun errore di whitespace.

## Segnalazioni residue

Le ispezioni IDE non segnalano errori né warning di severità normale sui sorgenti. Rimangono segnalazioni di severità debole:

- 15 avvisi sui breakpoint CSS frazionari, come `767.98px`, utilizzati per separare le fasce responsive.
- 10 avvisi di inferenza JSX su array di elementi e spread di `react-hook-form`. Build e controlli di rendering utilizzati per questo intervento passano; questi avvisi sono riportati senza disabilitare le ispezioni.

La build mantiene l'avviso relativo al chunk JavaScript principale superiore a 500 kB. Il limite non è stato aumentato per nascondere la segnalazione; un intervento dedicato di suddivisione del bundle resta possibile.
