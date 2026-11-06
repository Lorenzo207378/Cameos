# Revisione architetturale non sociale

Stato: **completata il 6 novembre 2026** per i 85 file non sociali inclusi.
L inventario `non-social-audit-inventory.json` contiene 117 file: 85 verificati e 32
sociali o di integrazione rinviati. Le sezioni seguenti conservano le evidenze raccolte
durante la revisione; l esito finale in fondo sostituisce gli stati intermedi.

## Perimetro

Inclusi cataloghi film/serie, dettagli, episodi, persone, cameo, ricerca, modelli,
servizi TMDB, cache, storage, ViewModel e componenti di presentazione condivisi.
Amicizie, notifiche e profilo esclusi. Recensioni, preferenze personali e autenticazione
sono trattate come confini della parte sociale: si annotano i punti di integrazione,
senza rifattorizzarne il comportamento prima del merge dell'altro branch.
CSS giÃƒÂ  modificati nella sessione e gli interventi sulla ricerca e sul contrasto dei
titoli precedono questa revisione; non sono presentati come correzioni dell'audit.

## Evidenze iniziali

- `npm run lint`: nessun errore o warning ESLint, prima e dopo le prime correzioni.
- Ispezioni WebStorm su servizi, backend e repository non sociali e principali ViewModel:
  cinque riferimenti non risolti in SearchViewModel. Corretti con un contratto esplicito dello stato.
- Ispezioni WebStorm sulle pagine non sociali, modelli principali, storage e principali componenti:
  inferenza `unknown[]` nel rendering di PersonFimography. Corretta annotando il risultato JSX
  del callback; successiva analisi del file priva di problemi.
- Le richieste dirette da JSX a repository/backend emerse dalla scansione sono nella parte
  profilo/autenticazione esclusa. Nei JSX inclusi restano comunque trasformazioni di dominio
  da esaminare: non basta verificare che non importino un servizio HTTP.
- 35 test esistenti di ricerca, crediti e contratti architetturali superati. La suite condivisa
  esegue anche regressioni sociali: ciÃƒÂ² non costituisce revisione nÃƒÂ© modifica di quella parte.
- Aggiunto e superato un test mirato alla proiezione dei dati della pagina persona.
- Build riuscita; rimane il warning Vite sul bundle JS principale oltre 500 kB.

## Correzioni completate nella prima tranche

1. **PersonDetail Ã¢â€ â€™ PersonViewModel.** Spostati filtri dei cameo, scelta cast/crew,
   esclusione delle apparizioni giÃƒÂ  mostrate e selezione delle immagini in `getPersonPageData`.
   Il JSX richiede ora la proiezione al ViewModel. Il precaricamento immagini e lo stato di
   espansione della biografia restano responsabilitÃƒÂ  della view. Conservati ID della route,
   modalitÃƒÂ  esplicita, lingua e sovrapposizioni ammesse tra cameo e crediti creativi.
2. **SearchViewModel.** Dichiarati SearchSection e SearchViewModelState e aggiunto il getter
   tipizzato: risolti i warning su sections/query/filter senza cambiare il flusso di ricerca.
3. **Dipendenze piÃƒÂ¹ precise.** SearchViewModel importa i tre repository effettivamente usati;
   ApiServiceHelpers importa le sole utility pure, evitando il barrel che riesporta anche
   classi di dominio e modelli sociali. Non aggiunte astrazioni o dipendenze.
4. **PersonFimography.** Esplicitato il contratto delle props e il risultato del callback JSX.

WebStorm suggerisce ancora di accorciare gli import diretti tramite i barrel: sono suggerimenti
di stile, non simboli irrisolti. In questi punti il percorso diretto ÃƒÂ¨ intenzionale per
rendere visibile e limitare la dipendenza. Non disattivate ispezioni globali.

## CriticitÃƒÂ  confermate da affrontare

| PrioritÃƒÂ  | Area | Evidenza e prossima verifica |
| --- | --- | --- |
| Alta | Stato asincrono condiviso | BaseViewModel.runAsync azzera il singolo loading alla conclusione di ogni operazione. I dettagli serie lanciano piÃƒÂ¹ operazioni contemporanee. Verificare con richieste controllate il rendering intermedio e definire uno stato affidabile senza modificare i contratti sociali. |
| Alta | Navigazione episodio | TVSeriesEpisodeDetail costruisce Episode dal payload della route e salta il recupero se l'identitÃƒÂ  corrisponde. IdentitÃƒÂ  e completezza sono condizioni diverse: verificare guest star, crediti, accesso diretto e payload parziale; spostare risoluzione/idratazione nel ViewModel. |
| Media | Modelli creati nei JSX | CameoCard e PersonCard normalizzano Cameo, oltre a TVSeriesEpisodeDetail. Verificare tutti i chiamanti prima di centralizzare la normalizzazione: non eliminare supporto a dati cache o raw senza una sostituzione equivalente. |
| Media | Home e dettagli | Controlli di disponibilitÃƒÂ  duplicati fra pagine e presenza di pagination interpretata come completamento. Conservare il caricamento atomico richiesto dall'utente: niente sezioni progressive o rimozione del loader globale. |
| Media | Configurazioni categoria | MovieBackend e SeriesBackend importano utils/selections, che contiene anche costruzione delle sezioni UI. Separare configurazioni di interrogazione e selettori della view solo dopo aver verificato i consumatori. |
| Media | Cicli di import | models/utils/index riesporta modelli che a loro volta lo importano. Verificare dipendenze effettive e sostituire i barrel nei punti interni appropriati; evitare una riorganizzazione indiscriminata. |
| Media | Dati dimostrativi nella view | Le home e i dettagli leggono direttamente catalogData per le recensioni. Registrato come confine sociale da riprendere dopo il merge. |
| Prestazioni | Cache e idratazione | Confermati network-first, scritture attese, letture sequenziali per entitÃƒÂ  e chiamate multilingua. Analisi dettagliata in home-fetch-audit.md. Nessun cambio della policy di cache o dei cameo introdotto da questa tranche. |

## Prosecuzione

1. Riprodurre concorrenza e completezza dei dati nei percorsi dettaglio film/serie/episodio.
2. Revisione manuale di ciascun servizio/backend/repository, inclusi fallback e cache offline.
3. Semplificare i JSX rimasti e verificare le proiezioni di ogni componente.
4. Controllare duplicazioni, dipendenze e warning residui, poi completare i test dei flussi.
5. Aggiornare l'inventario per file e svolgere l'audit finale requisito per requisito.

La revisione a tappeto ÃƒÂ¨ ancora aperta; i test superati coprono solo gli invarianti indicati.


## Seconda tranche: concorrenza, episodi e dipendenze

Correzioni verificate:

- `BaseViewModel.runAsync` tiene conto delle operazioni indipendenti ancora attive.
  Il caricamento non termina quando una sola richiesta figlia ? conclusa. Per richieste
  con la stessa chiave resta valido il contratto latest-wins: una risposta obsoleta
  non cambia stato, errore o loading della richiesta successiva.
- `TVSeriesEpisodeDetail` recupera sempre l'episodio dal ViewModel/repository, che pu?
  servire i dettagli dalla cache recente. Non costruisce pi? modelli dal payload della route
  e non considera la sola corrispondenza degli ID una garanzia di dati completi.
  `SeriesViewModel.getEpisodeForRoute` centralizza il controllo dell'identit?.
- `TVEpisodeCard` non invia pi? una copia dei dettagli nel payload di navigazione. Le route
  accettano la stagione speciale 0, prima esclusa dal controllo truthy del numero di stagione.
- Configurazioni interrogazione in `utils/mediaCategories.js`; backend e ViewModel catalogo
  non dipendono pi? dal modulo che costruisce le sezioni della UI. `utils/selections.js`
  conserva i re-export e `getCategoryDisplayInfo`, mantenendo i consumatori esistenti.
- Movie, Series, Episode, Season, Person e Cameo importano le utility pure direttamente.
  Anche `personCredits` evita il barrel che reimportava i modelli e creava un ciclo con Series.
- Cache categorie film/serie: un sortBy diverso da popularity.desc dispone ora di chiave
  separata. L'ordinamento predefinito continua a leggere le chiavi gi? salvate.

Verifiche:

- 83 test unitari/contratto/localizzazione/ricerca/immagini superati nella suite estesa,
  seguiti da un ulteriore caso sulle cache categoria; sei casi totali in test-detail-flows.
- `npm run test:carousel` superato fuori sandbox dopo timeout di connessione al primo tentativo.
  Include scorrimento, deduplicazione richieste, swipe, resizing, stagioni e pagina dettagli serie
  reale a 375 e 1024 px.
- ESLint pulito e build riuscita dopo le correzioni; permane il warning bundle Vite.
- WebStorm sui file modificati non segnala errori o riferimenti non risolti. Restano suggerimenti
  di import tramite barrel, deliberatamente non applicati perch? ricreerebbero dipendenze superflue.

Le righe della tabella iniziale su concorrenza, episodio e configurazioni categorie sono
ora affrontate dalle correzioni sopra; non rappresentano problemi ancora invariati.
L'inventario aggiorna l'evidenza per file, senza dichiarare terminata la revisione dei metodi non esaminati.

Prossimi punti emersi nella lettura dei repository: distinguere dati episodio richiesti con/senza crediti
nella cache TTL e completezza delle entit? nei record condivisi; verificare tutti i chiamanti delle
normalizzazioni Cameo ancora presenti nei JSX. Policy network-first e caricamento atomico delle home conservati.


## Terza tranche: completezza della cache e card

Problemi riprodotti e corretti:

1. Il parametro `appendCredits: false` (e l'equivalente per i crediti aggregati) veniva passato
   come undefined dai backend e il servizio ripristinava il default. Ora la stringa vuota
   significa esplicitamente nessun credito; il servizio distingue vuoto da assente tramite `??`.
   Le immagini rimangono incluse dove gi? previste, senza cambiare localizzazione o API pubbliche.
2. Richieste sintetiche a film, serie, stagioni, episodi e persone usano record `:basic`,
   marcati non completi. Le chiavi dei dettagli completi esistenti rimangono invariate.
   Una risposta priva di crediti non sovrascrive la variante completa, anche se termina dopo di essa.
3. Il TTL degli episodi distingue la variante richiesta. Il timestamp viene registrato dopo
   il salvataggio riuscito. Riassunti degli episodi provenienti dalla stagione usano `:summary`,
   evitando di sovrascrivere dettagli episodio gi? salvati. Conservato fallback offline per gli indici.
4. Le liste non garantiscono crediti: la loro euristica `isComplete` basata su durata/stato
   non viene pi? usata per segnare record completi o sostituire un dettaglio completo esistente.
5. CameoCard e PersonCard estraggono direttamente i campi dagli oggetti ricevuti dal ViewModel.
   Non costruiscono modelli Cameo. Le semplici derivazioni per la presentazione rimangono nei JSX;
   non serve un modulo ViewModel separato per nomi, ruoli e link.

Verifiche finali della tranche:

- Otto regressioni cache: richieste HTTP effettive senza crediti, cinque tipi di entit?,
  TTL e riassunti stagione, protezione da liste con completezza ingannevole.
- Le precedenti prove del modulo di proiezione delle card sono state rimosse con il modulo.
  La suite browser verifica la card reale: nome, personaggio, non accreditato, link persona/media
  e posizione del pulsante attore nella variante movie-detail.
- `test-layer-boundaries.mjs` controlla gli import tramite AST ESLint e vieta fetch diretto
  nelle view non sociali. L'inventario esplicita il perimetro; non sono inclusi moduli sociali.
  Questa prova controlla dipendenze, non dimostra da sola correttezza della logica interna.
- Suite estesa: 95 test superati. Suite browser caroselli/serie superata a tutte le larghezze previste.
- Ispezioni IDE sui nuovi file: nessun errore o riferimento irrisolto; solo suggerimenti di barrel.

Restano da completare la lettura manuale di ogni file pendente, l'esame dei salvataggi concorrenti
sulle cache condivise, i dati derivati ancora preparati nei componenti media e la disponibilit?
iniziale di home/dettagli su errore o cambio route. La revisione completa non ? ancora terminata.

## Caricamento iniziale delle home e criterio per i JSX

- Movies e TVSeries attendono la conclusione delle operazioni iniziali dei ViewModel, anche quando
  i cameo sono vuoti. La sola esistenza dell'oggetto paginazione non indica il completamento.
- Il layout viene preparato dietro al loader: i caroselli conservano la larghezza reale per
  riempimento automatico e adattamento testi. Si attendono immagini visibili nelle prime colonne,
  decodifica e font; le colonne successive mantengono il caricamento lazy.
- La pagina compare dopo questa preparazione iniziale. Paginazione e altre operazioni successive
  non la nascondono nuovamente. La suite browser verifica Film a 393 px e Serie TV a 1600 px,
  con categorie, cameo, immagini e riempimento rallentati separatamente.
- Precisazione dell'utente: i JSX recuperano i dati attraverso i ViewModel, ma possono estrarre
  campi, comporre link e applicare semplici derivazioni locali ai dati ricevuti.
  Rimosso cardPresentation.js; nessuna costruzione di modelli nelle card.

## Persistenza concorrente e completamento della revisione dei repository

- Riprodotto su film e serie: una lista leggeva un record incompleto, attendeva il batch e
  sovrascriveva un dettaglio completo salvato nel frattempo. Il repository definisce ora la
  condizione di sostituzione; lo storage la valuta nella stessa transazione della scrittura.
  Rimossi i singoli accessi di lettura seriali per ogni elemento della lista.
- Riprodotto anche il commit parziale di un batch nativo quando una richiesta successiva
  sollevava un errore sincrono. `_write` ora annulla esplicitamente la transazione in questo caso.
- Offline, una lista nella lingua richiesta non nasconde più un dettaglio completo presente
  in un'altra lingua. I record parziali rimangono disponibili quando mancano dettagli completi.
- Le cache stagione/episodio prodotte dal recupero cameo riportano la completezza coerentemente
  con i crediti già richiesti dal backend. Nessuna modifica agli algoritmi di classificazione.
- La reidratazione Movie conserva il titolo media già associato al cameo: prima sostituiva
  il titolo localizzato con il titolo predefinito del film.
- Le serie in uscita mantengono la paginazione finché almeno una delle sorgenti, nuove serie
  o serie di ritorno, dispone di altre pagine. Prima decideva soltanto la sorgente nuove serie.
- Su indicazione dell'utente, `src/data` rimane riservata al mock del prototipo. La nuova
  configurazione delle categorie è stata spostata in `src/utils/mediaCategories.js`.

Evidenza: 111 test superati; suite Chrome superata, inclusi cache nativa con connessioni concorrenti,
rollback del batch, card reali e disponibilità iniziale delle home. ESLint pulito e build riuscita;
permane il warning sul bundle oltre 500 kB. WebStorm sui file corretti segnala soltanto il suggerimento
di abbreviare l'import di Movie tramite barrel, non applicato per evitare il ciclo già rimosso.

Completata la lettura dei repository non sociali e dei backend Base/Movie/Series/Person.
L'inventario conserva separatamente i file ancora pendenti: ViewModel, modelli, utility, pagine e
componenti devono ancora ricevere la verifica finale completa. Il controllo AST non sostituisce questa lettura.

## Stato dei ViewModel, paginazione e semplicità dei JSX

- Riprodotta e corretta l'aggiunta di risultati obsoleti dopo un ricaricamento della stessa categoria.
  La paginazione usa il contatore delle richieste esistente e impedisce append durante la richiesta iniziale.
  I nuovi totali possono diminuire: una categoria ricaricata non conserva il vecchio numero di pagine.
- Ogni paginazione espone carico iniziale ed errore. Le pagine categoria film/serie escono dal loader
  dopo un errore e offrono Riprova; un caricamento riuscito svuota l'errore precedente.
- Rimossa la scrittura non protetta di feedLoaded nei task interni: il flag viene confermato soltanto
  dal reducer già protetto di runAsync. Un feed obsoleto non rende pronto quello ancora in corso.
- I contatori di selezione cameo seguono il campo di stato, non il singolo ID richiesto. Cambiare film
  o attore non permette a una risposta precedente di sovrascrivere l'ultima selezione. I batch continuano
  a restituire tutte le risposte. Il cambio serie svuota la lista cameo precedente durante la nuova richiesta.
- L'identità della paginazione cameo include il tipo media: film e serie con lo stesso ID numerico
  rimangono entrambi visibili. Nessuna modifica agli algoritmi di rilevamento nel backend.
- MediaCard ricava il titolo dalle traduzioni già ricevute: film e serie cambiano lingua senza recuperi
  aggiuntivi. Movie riutilizza dedupeCrew invece di mantenere una seconda implementazione identica.
- Su richiesta dell'utente, Movies e TVSeries chiamano direttamente i metodi di caricamento dei ViewModel.
  La disponibilità dei dati deriva dagli stati dei ViewModel; rimosso Promise.allSettled e lo stato locale
  duplicato. La preparazione di immagini/layout rimane una responsabilità della UI.

Verifiche: 129 test superati nella suite estesa; regressioni mirate dopo il riuso di dedupeCrew superate.
Suite browser superata per home atomiche, paginazione successiva, errore/retry categorie, cambio lingua
delle card, cache nativa e gerarchia serie. ESLint e ispezioni WebStorm dei file modificati puliti.
Build riuscita; rimane il warning sulla dimensione del bundle.

Completata la lettura dei modelli non sociali e dei ViewModel Base/Movie/Series/Person/Cameo.
Restano la verifica finale dei servizi e delle utility, il retry multilingua della ricerca, la lettura
dei JSX ancora pendenti e il controllo completo dei cambi route nei dettagli. Non creare nuovi file in src/data.

## Utility, servizi e suite completa

- Riprodotti e corretti il retry ricerca che perdeva la lingua esplicita e il default API saltato
  quando language era presente ma vuoto/undefined. Le API reali sono state eseguite con successo.
- Formattatori: supportati Date e timestamp, incluso zero per l'epoca Unix, conservando date calendario
  e anni parziali. Tutti i casi di test preesistenti sono mantenuti insieme alle nuove regressioni.
- Risoluzione lingua condivisa invece della funzione duplicata; i profili raw usano lo stesso
  fallback immagini dei modelli. I cameo famosi conservano il titolo nella lingua richiesta.
- Preloading e decode delle immagini condivisi tra hook. La prontezza segue anche gli URL cambiati
  per lo stesso media; callback obsolete e timer vengono annullati. Conservato il timeout di 1200 ms nei dettagli.
- Lo scaling del titolo usava una conversione in rem che presumeva root a 16 px. Ora applica i pixel
  misurati: la prova browser con root a 24 px resta entro la larghezza disponibile.
- La filmografia a due righe comunicava il numero di colonne al carosello, che misura i figli DOM.
  Ora comunica il numero di crediti; la freccia raggiunge l'ultima colonna anche con 30 crediti.
- Aggiunto npm run test:all: scopre tutti i file di test isolati ed esegue poi API, repository,
  ViewModel, contratti e Chrome. Gli script di integrazione che importavano HomeViewModel, rimosso
  dall'app, ora controllano i feed Movie/Series e il loro ripristino offline.

Suite completa rieseguita dopo il ripristino di tutti i casi originali dei formattatori:
24 file eseguiti, zero suite fallite. Il diff del file formattatori conserva i cinque test originali
e aggiunge tre regressioni sulle date. Anche ESLint e build finale sono superati; resta il warning bundle.
I test sociali preesistenti utilizzano adapter in memoria: eseguirli non costituisce revisione
o modifica delle implementazioni sociali escluse.

Restano da verificare i cambi route dei dettagli e lo stato carico stagione/episodio: il flag globale
loading della serie viene passato alla guida stagioni, quindi un fetch episodio puo smontare la card
espansa. Completare inoltre la lettura dei JSX ancora pendenti e il controllo finale del bundle.

## Esito finale e ultime indicazioni dell'utente

- Completata la lettura dei file JS/JSX non sociali nell'inventario, incluse pagine,
  caroselli, card, selezione stagioni e binding React dei ViewModel. Nessun file incluso
  rimane pendente. CatalogData contiene il mock recensioni e resta escluso con la parte sociale.
- I caricamenti di film, serie, stagione ed episodio seguono identita della richiesta
  e operazione del ViewModel. Recuperare un episodio non smonta piu la card espansa.
  Cambiare serie ripristina la selezione della stagione; errori e stagioni vuote escono dal loader.
  Eliminata l'attesa artificiale di 500 ms nella guida stagioni.
- Ripristinato l'ordine delle notifiche di stato: runAsync segnala loading prima di
  aggiornare l'identita del dettaglio richiesto. Il test preesistente delle subscription passa.
- Navbar: matching delle route reali invece di sottostringhe che includevano anche
  la home film e le categorie. Identita della deduplicazione cameo comprensiva del tipo media.
- Su richiesta, configurazioni e funzioni pure di selezione sono unificate in
  src/utils/mediaCategories.js. Rimosso selections.js, aggiornati tutti gli import applicativi
  e dei test; nessuna dipendenza applicativa o richiesta remota nella utility condivisa.
- Build: React, Firebase e Firestore hanno chunk separati per la cache delle dipendenze.
  Rimane invariato il caricamento iniziale delle pagine. Questa divisione non riduce da sola
  il totale del codice trasferito. Chunk applicativo 460.11 kB e maggiore chunk 483.56 kB:
  nessun warning di dimensione e nessun aumento della soglia di avviso.
- Icone e manifest nell'HTML usano BASE_URL, coerentemente con il deploy sotto /Cameos/.
  Smoke test della build in Chrome: autenticazione e ricerca renderizzate, asset PWA disponibili,
  nessuna eccezione JavaScript. Nessuna operazione sociale eseguita contro servizi reali.
- Dopo la rimozione utente di Movie.getName, verificati tutti i riferimenti: i film usano
  gia getTitle. I richiami getName rimasti appartengono a Series, Season ed Episode.

Verifica finale: npm run test:all superato, con 149 test unitari/contratto e tutte le
integrazioni API, repository, ViewModel, contratti e Chrome: 25 file, zero suite fallite.
ESLint e build superati. Nessun commit o pubblicazione. Le implementazioni sociali e
la revisione delle politiche di classificazione cameo restano fuori dal perimetro concordato.

## Allineamento richiesto delle pagine e delle utility

Tutti i 15 richiami agli hook ViewModel, distribuiti su 10 pagine, seguono ora lo stesso
schema: const movieViewModel = useMovieViewModel(), seguito dalla destrutturazione di
stato e funzioni. Gli altri domini usano i corrispondenti nomi seriesViewModel,
personViewModel, cameoViewModel, searchViewModel e socialViewModel. Il controllo AST
ha verificato ogni richiamo nelle pagine, compresi quelli nei componenti interni.
Le pagine sociali senza hook preesistenti mantengono l'implementazione rinviata.

Movie espone soltanto getTitle; Series, Season ed Episode espongono soltanto getName.
Rimossi i getter alias e aggiornati slider, scheda tecnica e risultati di ricerca misti.
Questi ultimi conservano title per i film e name per le serie, senza aggiungere entrambi
alla stessa proiezione di presentazione.

Le funzioni pure di personCredits.js sono state trasferite in formatters.js e il file
separato eliminato. getCreativeRoleKeys diventa getCrewRoleKeys; getCreativeCrew diventa
selectCrewByRole. selectPersonCredits conserva il nome e le politiche di filtro.
Modelli, ViewModel e test importano tutti dal modulo consolidato.

usePageReady non osserva piu continuamente il DOM: eliminati MutationObserver, contatore
di revisioni, flag checking e ciclo di riprogrammazione. La UI usa gli stati di paginazione
gia esposti dai ViewModel; l'hook attende una sola preparazione di immagini visibili e font
quando i dati sono pronti. I frame servono esclusivamente alle misure del layout. La pagina
resta visibile durante la paginazione successiva, senza reintrodurre sezioni progressive.

Il ritorno indietro condiviso usa useGoBack nel file esistente src/utils/domUtils.js
(non esisteva domUtils.jsx). Le sei pagine di dettaglio/categoria importano questo hook.
Quando manca una route precedente dell'app, viene usato il fallback specifico della pagina.
Le callback di autenticazione conservano i propri redirect dopo le operazioni di login.

Verifiche: npm run test:all superato, 25 file e zero suite fallite; 149 test unitari/contratto
piu tutte le integrazioni. Chrome verifica anche il dettaglio episodio senza alias getTitle,
la navigazione indietro da cronologia o accesso diretto e le home complete a 393/1600 px.
Controllo AST di tutte le pagine e dei getter nativi superato. ESLint e build superati.

## Intestazioni condivise e semplificazione degli stati dei pulsanti

I sei caroselli applicativi usano CarouselHeading, compreso il caricamento dei cameo famosi.
Titoli e sopratitoli condividono la classe CSS text-single-line e lo stesso adattamento del font.
Su chiarimento dell'utente, viene mantenuto l'autoresize dipendente dalla lunghezza del testo:
clamp e troncamento CSS non sono un sostituto equivalente. useSingleLineFit resta condiviso,
senza misurazioni duplicate nei singoli caroselli. Il componente aggiuntivo SingleLineText
non e presente nel risultato finale. Le regole multilinea delle card sono conservate.

La misurazione rispetta il minimo CSS anche con root a 24 px, ripristina la dimensione iniziale
quando aumenta lo spazio e ricalcola al cambio testo e dopo il caricamento font.
Eliminati navBtnPointerHandlers, clearNavBtnState e gli attributi data-hovered/data-active.
Hover, pressione, disabilitazione e focus da tastiera sono affidati agli stati CSS nativi.
