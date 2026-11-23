# Revisione KISS dei package applicativi

Revisione del 4 novembre 2026. Ambito: tutti i file in `src/backend`, `src/contexts`, `src/models`, `src/repository`, `src/service`, `src/storage` e `src/viewmodel`.

Sono stati esaminati 53 file iniziali, comprendenti 39 classi. I due moduli di supporto aggiunti portano il controllo finale a 55 file. Sono inclusi provider, hook, funzioni di supporto e file di esportazione, anche quando non dichiarano classi.

## Valutazione

La separazione generale tra accesso remoto, cache, modelli e stato delle viste è coerente. Le principali difficoltà erano la paginazione concentrata nella classe base, la costruzione ed esecuzione delle richieste HTTP nello stesso metodo, e alcune duplicazioni nelle proiezioni dei dati.

KISS non significa minimizzare il numero di righe o eliminare ogni controllo. I valori predefiniti e gli alias dei modelli gestiscono dati API e record locali diversi. Le condizioni di selezione dei cameo e delle uscite future esprimono politiche esistenti. Non sono stati sostituiti con regole più permissive o con una nuova architettura generica.

## Copertura e decisioni

| Package | Classi e moduli verificati | Esito della revisione |
| --- | --- | --- |
| `backend` | `MovieBackend`, `SeriesBackend`, `CameoBackend`, `PersonBackend`, `UserBackend`, `SocialBackend`, `NotificationBackend`, `ReviewBackend`; adapter Firestore, autenticazione, funzioni utente ed esportazioni | Separate selezione della stagione futura, caricamento delle pagine cameo e proiezione dei crediti. Unificata la mappatura della filmografia. Riutilizzati i serializzatori dei modelli per richieste di amicizia, notifiche e recensioni. Corrette le annotazioni dei payload e degli utenti Firebase. |
| `contexts` | `AuthContext`, `DeviceContext`, `LanguageContext` | Responsabilità distinte e comprensibili. Conservati listener, cleanup, timer di autenticazione, fallback locali e sincronizzazione della lingua. Spostare semplicemente gli effetti in altri file non avrebbe ridotto la complessità del comportamento. |
| `models` | `Cameo`, `Episode`, `FriendRequest`, `MediaStats`, `Movie`, `Notification`, `Person`, `Review`, `Season`, `Series`, `User`; etichette, utilità ed esportazioni | Eliminata la risoluzione ripetuta della descrizione del cameo e una condizione ridondante sul titolo. Allineato il tipo documentato del numero di stagione agli input già accettati. Mantenuti costruttori espliciti, identificatori, valori predefiniti, fallback linguistici e serializzazione. |
| `repository` | `BaseRepository` e repository di film, serie, cameo, persone, utenti, socialità, notifiche e recensioni; esportazioni | Semplificata la scrittura della cache notifiche e riutilizzato `Review.toUserReference()`. Corretti tipi e import. Rimossi controlli ridondanti su una mappa inizializzata dal costruttore. Conservate strategia Network-First, priorità dei record completi, chiavi di cache, TTL degli episodi di 15 secondi e sincronizzazione differita degli utenti. |
| `service` | `ApiService`, `ApiServiceHelpers` | Separate esecuzione HTTP e gestione retry dalla deduplicazione e preparazione del risultato. Semplificata la lettura dell'ambiente. Documentate le risposte paginate e l'arricchimento dei payload JSON. |
| `storage` | `IndexedDBService` | Implementazione già suddivisa in apertura, letture, scritture e fallback in memoria. Conservati schema, versione del database, indici, clonazione e attesa del completamento delle transazioni di scrittura. Nessun cambiamento necessario. |
| `viewmodel` | `BaseViewModel` e viewmodel di film, serie, cameo, persone, utenti, socialità, notifiche e recensioni; hook ed esportazioni | Estratte le operazioni pure di paginazione in `pagination.js`; semplificato il confronto degli snapshot. Conservati aggiornamenti immutabili, notifiche, protezione dalle risposte obsolete e fusione delle categorie concorrenti. Corretti tipi e uso esplicito delle promesse. |

Le deleghe di `UserRepository` e `UserViewModel` restano disponibili per compatibilità. La logica specifica continua a risiedere nei repository dedicati: introdurre altre gerarchie o generare dinamicamente i metodi renderebbe il percorso delle chiamate meno leggibile.

## Politiche preservate e verificate

- Richieste API: massimo 10 operazioni concorrenti, deduplicazione in corso, risultati indipendenti, autenticazione tramite query o Bearer, retry di rete dopo 200 ms e retry per 429/5xx dopo 300 ms.
- Paginazione: ordine di inserimento, sostituzione dei duplicati, caricamento iniziale di più pagine, append, fine dei risultati e conservazione delle categorie caricate in parallelo.
- Cameo: ordine di fatturazione minimo 8 per i ruoli cinematografici minori; apparizioni televisive di 1–2 episodi; riconoscimento dei ruoli espliciti e di sé stessi; esclusioni preesistenti; massimo due candidati per film nel catalogo dei cameo celebri.
- Serie future: precedenza delle nuove serie, delle stagioni future e delle première annunciate; mantenimento dei dati disponibili in caso di errore del dettaglio.
- Persistenza: fallback locale, proprietà della sessione, aggiornamenti utente pendenti, riferimenti leggeri alle recensioni, campi serializzati e distinte politiche di refresh completo/parziale delle notifiche.
- Operazioni sociali: autorizzazioni esistenti, rifiuto dei duplicati, accettazione delle richieste e blocco delle mutazioni che richiedono connettività.

## Verifiche

La scansione iniziale di WebStorm riportava 46 segnalazioni in 19 file. La scansione finale dei 55 file non riporta errori, warning o weak warning, né analisi incomplete. ESLint passa con `--max-warnings 0`. Non sono state aggiunte soppressioni delle ispezioni.

Comandi riproducibili:

```powershell
node node_modules/eslint/bin/eslint.js src/backend src/contexts src/models src/repository src/service src/storage src/viewmodel scripts/test-architecture.mjs --max-warnings 0
npm run test:architecture
node --test scripts/test-architecture.mjs scripts/test-localization.mjs scripts/test-cameo-viewmodel.mjs scripts/test-translations.mjs scripts/test-formatters.mjs
npm run build
```

La suite combinata passa 38 test, di cui 20 nuovi test deterministici di architettura. I test di rete e Firestore usano sostituti locali: non scrivono su servizi remoti. La build di produzione passa.

Limiti delle verifiche:

- `scripts/test-viewmodel.mjs` e `scripts/test-edge-cases-and-contracts.mjs` non partono perché importano `HomeViewModel`, assente dal progetto già prima di questa revisione. Non sono stati conteggiati tra i test superati.
- La build mantiene l'avviso Vite sui chunk superiori a 500 kB. Riguarda la distribuzione del bundle, non le ispezioni delle classi di questi package.
- Non sono stati eseguiti test end-to-end contro Firebase o TMDb reali, né una sessione manuale nel browser. I provider React non sono stati modificati.
