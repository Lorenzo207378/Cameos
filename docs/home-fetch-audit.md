# Analisi del fetching delle home

Verifica del 6 novembre 2026. Nessuna modifica al comportamento dell'applicazione.

## Metodo e limiti

`node scripts/profile-home-fetch.mjs 100` e `node scripts/profile-home-fetch.mjs 250`
eseguono ApiService, scheduler, backend, repository e ViewModel reali. Solo il trasporto
HTTP viene sostituito: ogni risposta impiega rispettivamente 100 o 250 ms. Ogni lista
contiene 20 elementi; i dettagli dei film contengono due cameo validi. I candidati alle
uscite future non hanno lo status, quindi richiedono l'arricchimento previsto dal codice.
Le due sorgenti delle serie future condividono gli ID nel fixture, riducendo le richieste
di dettaglio grazie alla deduplicazione in corso. Dati reali differenti cambiano i conteggi.

Non sono tempi misurati su TMDB o sul telefono dell'utente. Sono esclusi immagini,
download/avvio JavaScript, React e tempi delle transazioni IndexedDB del browser;
lo storage del test usa il fallback in memoria. Nessun token o accesso remoto necessario.
Lo script verifica feedLoaded, assenza di errori, trending/uscite non vuoti e 16 cameo.

## Risultati

| Home | Richieste iniziali effettive nel fixture | Hero pronta, risposta 100 ms | Tutti i dati pronti, risposta 100 ms | Hero pronta, risposta 250 ms | Tutti i dati pronti, risposta 250 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Film | 116 | ~120 ms | ~1,54 s | ~276 ms | ~3,68 s |
| Serie | 114 | ~107 ms | ~1,53 s | ~262 ms | ~3,62 s |

Picco concorrente: 10. I conteggi includono la deduplicazione HTTP già presente.
Per Film: 60 richieste di discovery e 56 di dettaglio film. Per Serie: 56 discovery TV,
2 discovery film per i cameo, 40 dettagli TV e 16 dettagli film per i cameo.
Ricaricare il feed sullo stesso ViewModel non effettua altre chiamate.
Creare un nuovo CameoViewModel sul repository già popolato genera invece altre 18
richieste: circa 0,55 s con risposte da 100 ms, 1,29 s con risposte da 250 ms.

## Criticità, ordinate per priorità

1. **Barriera di rendering globale.** Movies.jsx e TVSeries.jsx restituiscono LoadingScreen
   fino a quando feed e cameo sono pronti. loadFilmsFeed/loadSeriesFeed attendono trending,
   uscite future e tutte le categorie tramite Promise.all. La hero pronta rimane nascosta
   durante il resto del lavoro. Mostrare prima la hero e le prime sezioni, con caricamenti
   locali per le altre, ridurrebbe l'attesa percepita senza rimuovere dati.
2. **Due pagine per ogni categoria al primo accesso.** Entrambe le pagine passano initialPages: 2.
   MovieViewModel carica 13 categorie oltre alle uscite; SeriesViewModel ne carica 12.
   Partire da una pagina e caricare le sezioni inferiori all'avvicinamento al viewport
   ridurrebbe le richieste iniziali. Le pagine successive possono mantenere la paginazione attuale.
3. **Richieste di dettaglio per ogni uscita futura.** MovieBackend.getUpcomingMovies richiede
   /movie/:id per i candidati senza status. SeriesBackend.getUpcomingSeries combina due
   discovery e richiede /tv/:id per ogni candidato per cercare stagioni future. Non eliminare
   questi controlli senza preservare i filtri di uscita e le stagioni delle serie di ritorno.
   Caricarli dopo il contenuto prioritario e conservarne i risultati eviterebbe di bloccare la hero.
4. **Localizzazione anticipata in entrambe le lingue.** fetchLanguagesResponses richiede
   it-IT ed en-US anche quando la UI usa una sola lingua. Questo raddoppia le richieste
   delle liste e dei dettagli localizzati. Valutare il caricamento della lingua attiva per
   prima, con seconda lingua differita; preservare fallback, cambio lingua e dati offline.
5. **Cameo nel percorso critico con dipendenze sequenziali.** Per ogni pagina, CameoBackend
   ottiene quattro film candidati e ne attende i dettagli uno alla volta. I dettagli usano
   entrambe le lingue e includono credits e images. La home ne richiede due pagine.
   Un caricamento indipendente dalla hero e un parallelismo limitato sui quattro candidati
   ridurrebbero questa attesa, mantenendo ordine, deduplicazione e massimo due cameo per film.
6. **Cache usata come fallback, non per accelerare gli accessi online.** BaseRepository.executeWithFallback
   consulta i dati locali solo offline o dopo errore. Attende inoltre saveLocal prima di
   restituire i dati. _cacheEntitiesFromList esegue una lettura sequenziale per elemento
   prima di putMany. Una cache con scadenza o visualizzazione immediata seguita da aggiornamento
   richiede una policy esplicita di freschezza. Letture locali in blocco sono un intervento separato.
7. **I cameo non condividono lo stato tra pagine.** useMovieViewModel e useSeriesViewModel
   mantengono istanze condivise; useCameoViewModel ne crea una nuova a ogni montaggio.
   Navigare fra Film e Serie ripete il caricamento dei cameo, nonostante entrambe mostrino
   gli stessi cameo cinematografici.

## Osservazioni aggiuntive

- ApiService deduplica richieste identiche solo mentre sono in corso. Non conserva una cache
  HTTP applicativa dopo la conclusione. Promise.all e il limite di 10 chiamate concorrenti
  sono già presenti: aumentare indiscriminatamente la concorrenza non affronta il volume iniziale.
- feedLoaded evita caricamenti già completati ma non condivide una Promise di feed in corso.
  StrictMode in sviluppo può rilanciare gli effetti di mount: la deduplicazione HTTP limita
  i duplicati simultanei, ma non evita il lavoro ripetuto di trasformazione e persistenza.
- Il singolo booleano loading di BaseViewModel è condiviso fra operazioni concorrenti e viene
  azzerato quando ciascuna termina. Non rappresenta il conteggio dei caricamenti in corso.
  Inoltre famousCameosPagination esiste dal costruttore: la sua presenza non prova un fetch concluso.
  Prima di rendere progressiva la UI conviene definire stati di caricamento per sezione.
- La build genera un bundle JS principale di circa 1.229 kB, 362 kB gzip; App.jsx importa
  direttamente tutte le pagine. Il costo di scaricamento e parsing può aggiungersi al fetching,
  soprattutto al primo accesso mobile. Le immagini della hero partono quando il loader lascia
  montare la pagina: il momento di disponibilità dei dati non coincide con la hero visivamente pronta.

## Ordine consigliato degli interventi

1. Separare la disponibilità della hero dal completamento delle sezioni e dei cameo.
2. Caricare una pagina per sezione; differire le sezioni sotto la parte visibile.
3. Riutilizzare i cameo tra home e aggiungere una policy di cache con scadenza.
4. Parallelizzare con limite l'idratazione dei cameo; ottimizzare persistenza e seconda lingua.
5. Misurare in produzione su 393 × 852 con rete mobile, cache fredda e calda:
   prima hero visibile, completamento sezioni, richieste API, immagini, JavaScript e tempi IndexedDB.

I 3–5 secondi riferiti sono compatibili con questa struttura: la simulazione dimostra
che la sola orchestrazione può produrre quell'attesa, ma non attribuisce percentuali
del tempo reale ai singoli costi senza una traccia di rete del browser.
