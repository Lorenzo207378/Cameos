# Organizzazione degli stili

- `common/theme.css`: colori e variabili condivise dell'applicazione (`:root`).
- `common/utilities.css`: utilità riutilizzabili per layout, colori, scroll e hover.
- `common/elements.css`: card, pannelli, card collassabili (`media-collapse-*`), pillole/badge (`genre-pill`, `info-pill`, `count-pill`, `badge-warning-box`) e pulsanti condivisi (`back-btn`).
- `common/carouselControls.css`: pulsanti di navigazione caroselli, header vincolati e link titolo carosello con freccia interattiva.
- `common/text.css`: tipografia fluida, troncamento a riga singola, line-clamping multi-riga e titoli di sezione condivisi.
- `common/mediaIconButton.css`: pulsanti icona touch/mobile senza sfondo.
- `common/moviesAndSeries.css`: layout di pagina condiviso (`.main-page`) per cataloghi Film e Serie TV.
- `common/mediaDetailPage.css`: layout di dettaglio condiviso (backdrop immersivo, sfumature, heading e info-section) per Film e Serie TV.
- `movies/`, `tv/`, `actor/`, `auth/`: stili specifici delle singole entità che estendono le basi di `common/`.
- `media/` e `components/`: componenti riutilizzabili dell'applicazione (navbar, loadingScreen, reviewSection, etc.).

`src/index.css`, importato da `main.jsx` dopo Bootstrap, carica gli stili comuni e definisce la struttura di base dell'applicazione.
Ogni pagina o componente importa il proprio CSS o i moduli comuni pertinenti, senza dipendere dal CSS di un'altra pagina o componente per ottenere stili condivisi.

I valori calcolati dai dati possono restare negli attributi `style`; gli stili statici vanno nei file CSS.
