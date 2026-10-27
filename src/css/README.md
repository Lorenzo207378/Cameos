# Organizzazione degli stili

- `common/theme.css`: colori e variabili condivise dell'applicazione.
- `common/utilities.css`: utilità riutilizzabili per layout, colori, scroll e hover.
- `common/elements.css`: card, form, badge e pulsanti condivisi.
- `common/carouselControls.css`: pulsanti di navigazione dei caroselli.
- `films/` e `auth/`: layout e dettagli specifici delle rispettive pagine.
- `media/` e `components/`: stili dei componenti riutilizzabili, inclusi navbar e caricamento.
- `tv/list.css`: catalogo TV e relativi dettagli.

`src/index.css`, importato una sola volta da `main.jsx` dopo Bootstrap, carica
gli stili comuni e definisce la struttura di base dell'applicazione.
Ogni pagina o componente importa il proprio CSS, senza dipendere dal CSS di
un'altra pagina o componente per ottenere stili condivisi.

Usare un prefisso specifico per gli stili di pagina (ad esempio `film-detail-`).
Le varianti che dipendono dal layout di una pagina, come le dimensioni delle
card nella griglia delle categorie, restano nel CSS della pagina e sono
limitate al suo contenitore. I valori calcolati dai dati possono restare
negli attributi `style`; gli stili statici vanno nei file CSS.
