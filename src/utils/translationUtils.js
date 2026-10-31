import {resolveLangKey} from '../models/index.js';

/**
 * Dizionario completo delle stringhe dell'applicazione in Italiano (it) e Inglese (en).
 */
export const translations = {
    it: {
        actor: {
            acting: 'Recitazione',
            popularity: 'Popolarità: {value}',
            age: '{age} anni'
        },
        // Stato Media
        status: {
            released: 'Rilasciato',
            returningSeries: 'In corso',
            ended: 'Conclusa',
            pilot: 'Pilota',
            inProduction: 'In Produzione',
            postProduction: 'Post-Produzione',
            planned: 'Pianificato',
            canceled: 'Cancellato',
            unknown: 'Sconosciuto'
        },

        // Navigazione principale
        nav: {
            brand: 'Cameos',
            media: 'Media',
            changeLanguage: 'Cambia lingua',
            switchToEnglish: 'Passa all\'Inglese',
            switchToItalian: 'Passa all\'Italiano',
            movies: 'Film',
            tvSeries: 'Serie TV',
            profile: 'Profilo',
            friends: 'Amici',
            searchPlaceholder: 'Cerca film o serie...',
            searchPlaceholderDesktop: 'Cerca film o serie TV...',
            searchAriaLabel: 'Cerca film o serie TV',
            login: 'Log In',
            logout: 'Esci',
            signUp: 'Registrati',
            user: 'Utente'
        },

        // Slider / Carosello Superiore di Tendenza
        slider: {
            topOfMonth: 'TOP #{rank} DEL MESE',
            seasonsCount: '{count} Stagioni',
            seasonsShort: '{count} Stag.',
            cameoDetected: 'Cameo detected',
            unknownTitle: 'Titolo',
            fullDetails: 'Dettagli Completi',
            clickToView: 'Clicca per visualizzare',
            plotUpdating: 'Trama in fase di aggiornamento...',
            activeTitleAria: 'Titolo attivo: {title}',
            prevTitleAria: 'Titolo precedente: {title}. Clicca per portare al centro',
            nextTitleAria: 'Titolo successivo: {title}. Clicca per portare al centro',
            prevSlide: 'Slide precedente',
            nextSlide: 'Slide successiva',
            goToSlide: 'Vai alla slide {index}',
            carouselAria: 'Carousel titoli in tendenza'
        },

        // Filtri Categorie
        categories: {
            all: 'Tutti',
            sciFi: 'Fantascienza',
            action: 'Azione',
            thriller: 'Thriller',
            drama: 'Dramma',
            adventure: 'Avventura',
            animation: 'Animazione',
            classics: 'Classici',
            crime: 'Crime',
            sciFiFantasy: 'Sci-Fi & Fantasy',
            actionAdventure: 'Azione & Avventura',
            kids: 'Bambini',
            news: 'Notizie',
            reality: 'Reality',
            soap: 'Soap opera',
            talk: 'Talk show',
            warPolitics: 'Guerra & Politica',
            comedy: 'Commedia',
            mystery: 'Mistero',
            upcoming: 'In Arrivo',
            romance: 'Romantico',
            fantasy: 'Fantasy',
            horror: 'Horror',
            sagas: 'Saghe',
            documentary: 'Documentario',
            family: 'Famiglia',
            history: 'Storia',
            music: 'Musica',
            tvMovie: 'Film TV',
            war: 'Guerra',
            western: 'Western'
        },

        // Caroselli & Sezioni Home / Pagine Cataloghi
        carousels: {
            showAllMovies: 'Mostra tutti i film',
            upcomingTitle: 'Titoli in Arrivo & Prossime Uscite',
            upcomingSub: 'Anteprime & Film Più Attesi nel Futuro',
            romanceTitle: 'Sentimenti & Passione',
            romanceSub: 'Commedie Romantiche e Grandi Amori',
            fantasyTitle: 'Mondi Fantastici & Magia',
            fantasySub: 'Avventure Epiche e Creature Mitiche',
            horrorTitle: 'Brivido & Terrore',
            horrorSub: 'Horror, Soprannaturale & Tensione',
            sagasTitle: 'Grandi Saghe & Universi Epici',
            sagasSub: 'I Franchise Più Amati della Storia',
            sciFiTitle: 'Fantascienza & Mondi Futuri',
            sciFiSub: 'Esplorazione Spaziale & Sci-Fi',
            animationTitle: 'Animazione & Grandi Avventure',
            animationSub: 'Capolavori Animati per Tutte le Età',
            adventureTitle: 'Avventura & Esplorazione',
            adventureSub: 'Viaggi Straordinari e Grandi Sfide',
            actionTitle: 'Azione & Adrenalina',
            actionSub: 'Blockbuster e Grandi Emozioni',
            movieComedyTitle: 'Commedie & Risate',
            movieComedySub: 'Umorismo, Brillantezza & Divertimento',
            thrillerTitle: 'Thriller & Suspense',
            thrillerSub: 'Colpi di Scena & Alta Tensione',
            dramaTitle: 'Grandi Capolavori Drammatici',
            dramaSub: "Cinema d'Autore e Storie Intense",
            crimeTitle: 'Crime & Investigazione',
            crimeSub: 'Tensione & Polizieschi Cult',
            warTitle: 'Guerra & Dramma Politico',
            warSub: 'Conflitti Storici & Intrighi Politici',
            tvDramaTitle: 'Serie Drammatiche Più Acclamate',
            tvDramaSub: "Scrittura d'Autore & Personaggi Iconici",
            comedyTitle: 'Sitcom & Serie Comiche',
            comedySub: 'Risate & Camei Brillanti',
            easterEggsTag: 'Easter Egg & Curiosità',
            cameoHistoryTitle: 'Camei della Storia del Cinema',
            guestStarsTag: 'Guest Star & Crossover',
            cameoTvTitle: 'Camei e Star nelle Serie TV',
            viewAllCameos: 'Vedi tutti i camei ({count})',
            viewAll: 'Vedi tutti ({count})',
            fansVoice: 'La Voce dei Fan',
            reviewsAndRatings: 'Recensioni e Valutazioni dal Pubblico',
            writeReview: 'Scrivi una Recensione',
            scrollLeft: 'Scorri a sinistra',
            scrollRight: 'Scorri a destra'
        },

        // Schede Media & Cameo (MediaCard, CameoCard)
        cards: {
            ratingNotAvailable: 'N/D',
            movieType: 'Film',
            tvType: 'Serie TV',
            cameoBadge: 'Cameo',
            specialCameo: 'Cameo Speciale',
            easterEgg: 'Easter Egg',
            inTheRoleOf: 'Nel ruolo di:',
            appearance: 'Apparizione:',
            clickForActorDetails: 'Vedi scheda attore',
            uncredited: 'uncredited'
        },

        // Cast Carousel
        cast: {
            title: 'Cast Principale',
            subtitle: 'Interpreti e Personaggi',
            scrollPrevious: 'Scorri indietro cast',
            scrollNext: 'Scorri avanti cast',
            noCastMembers: 'Nessun membro del cast registrato.'
        },

        // Cameos Carousel
        cameos: {
            title: 'Camei Presenti',
            subtitle: 'Apparizioni Speciali e Curiosità',
            scrollPrevious: 'Scorri indietro camei',
            scrollNext: 'Scorri avanti camei',
            noCameos: 'Nessun cameo speciale segnalato per questa opera.'
        },

        // Pagine di Dettaglio (MovieDetail, TVSeriesDetail, SeasonDetail, ActorDetail)
        detail: {
            goBack: 'Torna indietro',
            alsoKnownAs: 'Noto anche come:',
            backToSeries: 'Torna alla serie',
            seriesIdLabel: 'Serie ID: {id}',
            seasonOverviewFallback: 'Tutti gli episodi e i camei speciali della stagione {number} di {name}.',
            seasonCameosTitle: 'Camei & Guest Star in questa Stagione',
            fullEpisodeList: 'Elenco Completo',
            episodePlotLoading: 'Trama dettagliata dell\'episodio in caricamento...',
            openFullEpisodeList: 'Apri lista completa episodi e cameo',
            runtimeMinutes: 'Durata: {runtime} min',
            guestStarCameoLabel: 'Guest Star / Cameo:',
            movieNotFound: 'Film non trovato',
            votes: 'voti',
            voteSingle: 'voto',
            directing: 'Regia',
            directors: 'Registi',
            writing: 'Sceneggiatura',
            writers: 'Sceneggiatori',
            directorsAndWriters: 'Registi & Sceneggiatori',
            creator: 'Creato da',
            creators: 'Creatori',
            genre: 'Genere',
            statsAndDetails: 'Statistiche & Dettagli',
            technicalSheet: 'Scheda Tecnica Ufficiale',
            originalTitle: 'Titolo Originale',
            releaseDate: 'Data di uscita',
            firstAirDate: 'Prima TV',
            airingPeriod: 'Periodo di messa in onda',
            lastAirDate: 'Ultima TV',
            runtime: 'Durata',
            seasons: 'Stagioni',
            episodes: 'Episodi',
            originalLanguage: 'Lingua originale',
            status: 'Stato',
            budget: 'Budget',
            revenue: 'Incassi',
            notDisclosed: 'Non dichiarato',
            millions: 'Milioni',
            synopsisTitle: 'Trama',
            showLess: 'Mostra meno',
            readMore: 'Leggi tutto',
            collapse: 'Comprimi',
            expand: 'Espandi',
            overviewUnavailable: 'Trama non disponibile al momento.',
            cameosSectionTitle: 'Camei Presenti',
            noCameosReported: 'Nessun cameo speciale segnalato per questa opera.',
            submitCameo: 'Segnala un Cameo',
            seasonsGuideTitle: 'Guida alle Stagioni & Episodi',
            seasonLabel: 'Stagione {number}',
            episodeLabel: 'Episodio {number}',
            minutes: 'Minuti',
            minShort: 'm',
            hoursShort: 'h',
            airedOn: 'Trasmesso il',
            episodeDetails: 'Dettagli Episodio',
            biographyTitle: 'Biografia',
            bioUnavailable: 'Biografia al momento non disponibile.',
            placeOfBirth: 'Luogo di nascita',
            dateOfBirth: 'Data di nascita',
            alive: 'In Vita',
            deceased: 'Deceduto ({year})',
            knownFor: 'Conosciuto per',
            memorableCameos: 'Camei Memorabili nella Carriera',
            filmography: 'Filmografia e Ruoli',
            moviesTab: 'Film',
            tvSeriesTab: 'Serie TV'
        },

        // Barra delle Preferenze (MediaPreferencesBar)
        preferences: {
            like: 'Like',
            removeFavorites: 'Rimuovi dai Preferiti',
            removeWatchlist: 'Rimuovi dalla Watchlist',
            watchedShort: 'Visto',
            markWatchedShort: 'Segna visto',
            liked: 'Mi piace',
            addWatchlist: 'Salva in Watchlist',
            inWatchlist: 'In Watchlist',
            addFavorites: 'Aggiungi ai Preferiti',
            inFavorites: 'Nei Preferiti',
            markWatched: 'Segna come Visto',
            watched: 'Già Visto',
            writeReview: 'Scrivi Recensione',
            loginPrompt: 'Effettua il login per sincronizzare le tue preferenze su cloud. Vuoi accedere ora?'
        },

        // Sezione Recensioni (ReviewSection)
        reviews: {
            sectionTitle: 'Recensioni della Community',
            seasonReviewsTitle: 'Recensioni per Stagione {number}',
            writeReviewBtn: 'Scrivi una Recensione',
            noReviewsNotice: "Nessuna recensione presente per quest'opera. Sii il primo a commentare!",
            modalTitle: 'Scrivi una Recensione',
            yourRating: 'Il tuo Voto',
            starsCount: '{count} su 10 stelle',
            yourComment: 'Il tuo Commento',
            commentPlaceholder: 'Condividi le tue opinioni su trama, regia e i camei presenti...',
            charMinNotice: 'Scrivi almeno 5 caratteri per inviare la recensione',
            cancelBtn: 'Annulla',
            publishBtn: 'Pubblica Recensione',
            publishing: 'Pubblicazione in corso...',
            anonymousUser: 'Utente Anonimo',
            reviewerBadge: 'Recensore Cameos',
            edit: 'Modifica',
            delete: 'Elimina',
            deleteConfirm: 'Confermi di voler eliminare la recensione?',
            likesCount: '{count} Mi Piace',
            verifiedReview: 'Verificata'
        },

        // Pagina Social & Amici (Friends)
        social: {
            friendsTab: 'I Tuoi Amici',
            newFriendBadge: 'Nuovo Amico',
            acceptedRequestMsg: 'Hai accettato la richiesta di {name}!',
            rejectedRequestMsg: 'Richiesta rifiutata.',
            cancelledRequestMsg: 'Richiesta annullata.',
            friendRemovedMsg: 'Amico rimosso dalla lista.',
            friendFallback: 'amico',
            socialRulesTitle: 'Tracciabilità & Regole Sociali',
            guideRule1: '• Le richieste pending evitano invii duplicati allo stesso utente.',
            guideRule2: '• Non è possibile inviare richieste di amicizia a se stessi.',
            guideRule3: '• Quando una richiesta viene accettata, l\'ID viene salvato in lista amici Firestore.',
            guideRule4: '• Funzionamento offline supportato con coda di sincronizzazione automatica.',
            receivedRequestsTab: 'Richieste Ricevute',
            sentRequestsTab: 'Richieste Inviate',
            notificationsTab: 'Notifiche',
            addFriendCardTitle: 'Aggiungi Amico',
            addFriendInputPlaceholder: "Inserisci UID o Username dell'amico...",
            sendRequestBtn: 'Invia Richiesta',
            noFriends: 'Nessun amico trovato',
            noFriendsSub: 'Aggiungi i tuoi amici tramite UID o Username per condividere scoperte ed easter egg!',
            noIncomingRequests: 'Nessuna richiesta in arrivo',
            noPendingRequests: 'Nessuna richiesta in sospeso',
            noNotifications: 'Nessuna nuova notifica',
            acceptBtn: 'Accetta',
            declineBtn: 'Rifiuta',
            cancelRequestBtn: 'Annulla richiesta',
            mutualCameos: 'Camei in comune: {count}',
            sentOn: 'Inviata: {date}',
            alreadyFriendError: 'Questo utente fa già parte della tua lista amici!',
            requestAlreadySentError: 'Hai già inviato una richiesta a questo utente!',
            requestSentSuccess: 'Richiesta di amicizia inviata con successo!',
            cannotAddSelfError: 'Non puoi inviare una richiesta a te stesso.',
            removeFriend: 'Rimuovi Amico',
            removeFriendConfirm: 'Vuoi rimuovere {name} dalla tua lista amici?'
        },

        // Pagina Profilo (Profile)
        profile: {
            title: 'Profilo',
            friendsTab: 'Amici',
            loadingFavorites: 'Caricamento preferiti…',
            favoritesError: 'Errore nel caricamento dei preferiti.',
            noFavorites: 'Nessuna serie nei preferiti.',
            loadingVoted: 'Caricamento voti…',
            votedError: 'Errore nel caricamento dei voti.',
            noVoted: 'Nessun voto registrato.',
            votedSeries: 'Serie votate',
            votedEpisodes: 'Episodi votati',
            noVotedSeries: 'Nessuna serie votata.',
            noVotedEpisodes: 'Nessun episodio votato.',
            loadingWatchlist: 'Caricamento watchlist…',
            watchlistError: 'Errore nel caricamento della watchlist.',
            noWatchlist: 'Nessuna serie nella watchlist.',
            notLoggedInTitle: 'Profilo Utente',
            notLoggedInText: 'Non hai effettuato l' + "'" + 'accesso. Accedi o registrati per visualizzare il tuo profilo.',
            loginBtn: 'Log In',
            signupBtn: 'Registrati',
            friendsCount: 'Amici: {count}',
            watchlistCount: 'Watchlist: {count}',
            favoritesCount: 'Preferiti: {count}',
            watchedCount: 'Visti: {count}',
            reviewsCount: 'Recensioni: {count}',
            watchlistTab: 'Watchlist',
            favoritesTab: 'Preferiti',
            votedTab: 'Votati',
            languageSettings: 'Lingua Applicazione',
            selectLanguage: 'Seleziona Lingua',
            italianLang: 'Italiano (IT)',
            englishLang: 'Inglese (EN)'
        },

        // Autenticazione (Authentication)
        auth: {
            loginTitle: 'Accedi a Cameos',
            signupTitle: 'Crea un Account',
            usernameRequiredTitle: 'Completa il Tuo Profilo',
            usernamePrompt: 'Scegli uno username per iniziare a condividere camei ed easter egg con la community.',
            emailLabel: 'Email',
            emailPlaceholder: 'nome@esempio.it',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Inserisci la tua password',
            usernameLabel: 'Username',
            usernamePlaceholder: 'Scegli il tuo username',
            rememberMe: 'Ricordami',
            loginSubmit: 'Accedi',
            signupSubmit: 'Registrati',
            saveAndContinue: 'Salva ed entra',
            orWith: 'Oppure con',
            loginWithGoogle: 'Accedi con Google',
            noAccountPrompt: 'Non hai ancora un account?',
            hasAccountPrompt: 'Hai già un account?',
            goToSignup: 'Registrati ora',
            goToLogin: 'Accedi qui',
            googleSuccess: 'Accesso con Google completato!',
            googleUsernameNeeded: 'Accesso Google riuscito! Inserisci uno username valido per completare la configurazione.',
            loginFailed: 'Errore durante il login. Controlla le credenziali.'
        },

        // Stringhe Comuni & Stati di Sistema
        common: {
            actor: 'Attore',
            role: 'Ruolo',
            noOverview: 'Nessuna descrizione disponibile.',
            rating: 'Voto',
            resultsCount: 'risultati',
            loading: 'Caricamento in corso...',
            loadingMore: 'Caricamento in corso...',
            loadMore: 'Load More',
            noMoreItems: 'Tutti i film sono stati caricati',
            back: 'Indietro',
            backToFilms: 'Torna ai Film',
            allCategoryFilms: 'Tutti i film della categoria',
            moviesCount: '{count} film',
            error: 'Si è verificato un errore',
            retry: 'Riprova',
            noResults: 'Nessun risultato trovato',
            save: 'Salva',
            cancel: 'Annulla',
            confirm: 'Conferma',
            close: 'Chiudi',
            delete: 'Elimina',
            edit: 'Modifica',
            unknown: 'Sconosciuto',
            notAvailable: 'Non disponibile',
            offlineNotice: 'Sei offline. Alcune informazioni potrebbero essere memorizzate localmente.'
        },

        // Sezione TV e Catalogo
        tv: {
            tmdbCatalog: 'Catalogo TMDB',
            series: 'Serie TV',
            searchPlaceholder: 'Cerca una serie TV…',
            allGenres: 'Tutti i generi',
            modesCatalog: 'Catalogo',
            modesTrending: 'Tendenze',
            modesSearch: 'Ricerca',
            loadingEpisode: 'Caricamento episodio…',
            loadingDetails: 'Caricamento dettagli…',
            loginRequiredFavorites: 'Devi essere registrato per aggiungere questa serie ai preferiti.',
            loginRequiredWatchlist: 'Devi essere registrato per aggiungere questa serie alla watchlist.',
            loginRequiredVote: 'Devi essere registrato per assegnare un voto alla serie.',
            yourVote: 'Il tuo voto:',
            noSeasons: 'Nessuna stagione disponibile.'
        },

        meta: {
            langCode: 'it'
        }
    },

    en: {
        actor: {
            acting: 'Acting',
            popularity: 'Popularity: {value}',
            age: '{age} years old'
        },
        // Media Status
        status: {
            released: 'Released',
            returningSeries: 'Returning series',
            ended: 'Ended',
            pilot: 'Pilot',
            inProduction: 'In Production',
            postProduction: 'Post-Production',
            planned: 'Planned',
            canceled: 'Canceled',
            unknown: 'Unknown'
        },

        // Main Navigation
        nav: {
            brand: 'Cameos',
            media: 'Media',
            changeLanguage: 'Change language',
            switchToEnglish: 'Switch to English',
            switchToItalian: 'Switch to Italian',
            movies: 'Movies',
            tvSeries: 'TV Series',
            profile: 'Profile',
            friends: 'Friends',
            searchPlaceholder: 'Search media or series...',
            searchPlaceholderDesktop: 'Search media or TV series...',
            searchAriaLabel: 'Search media or TV series',
            login: 'Log In',
            logout: 'Log Out',
            signUp: 'Sign Up',
            user: 'User'
        },

        // Trending Hero Carousel / Slider
        slider: {
            topOfMonth: 'TOP #{rank} OF THE MONTH',
            seasonsCount: '{count} Seasons',
            seasonsShort: '{count} S.',
            cameoDetected: 'Cameo detected',
            unknownTitle: 'Title',
            fullDetails: 'Full Details',
            clickToView: 'Click to view',
            plotUpdating: 'Plot being updated...',
            activeTitleAria: 'Active title: {title}',
            prevTitleAria: 'Previous title: {title}. Click to focus',
            nextTitleAria: 'Next title: {title}. Click to focus',
            prevSlide: 'Previous slide',
            nextSlide: 'Next slide',
            goToSlide: 'Go to slide {index}',
            carouselAria: 'Trending titles carousel'
        },

        // Category Filters
        categories: {
            all: 'All',
            sciFi: 'Sci-Fi',
            action: 'Action',
            thriller: 'Thriller',
            drama: 'Drama',
            adventure: 'Adventure',
            animation: 'Animation',
            classics: 'Classics',
            crime: 'Crime',
            sciFiFantasy: 'Sci-Fi & Fantasy',
            actionAdventure: 'Action & Adventure',
            kids: 'Kids',
            news: 'News',
            reality: 'Reality',
            soap: 'Soap opera',
            talk: 'Talk show',
            warPolitics: 'War & Politics',
            comedy: 'Comedy',
            mystery: 'Mystery',
            upcoming: 'Coming Soon',
            romance: 'Romance',
            fantasy: 'Fantasy',
            horror: 'Horror',
            sagas: 'Sagas',
            documentary: 'Documentary',
            family: 'Family',
            history: 'History',
            music: 'Music',
            tvMovie: 'TV Movie',
            war: 'War',
            western: 'Western'
        },

        // Carousels & Catalog Sections
        carousels: {
            showAllMovies: 'Show all movies',
            upcomingTitle: 'Coming Soon & Future Releases',
            upcomingSub: 'Anticipated Premieres & Upcoming Blockbusters',
            romanceTitle: 'Romance & Passion',
            romanceSub: 'Romantic Comedies & Love Stories',
            fantasyTitle: 'Fantasy Worlds & Magic',
            fantasySub: 'Epic Adventures & Mythical Realms',
            horrorTitle: 'Chills & Thrills',
            horrorSub: 'Horror, Supernatural & Suspense',
            sagasTitle: 'Epic Sagas & Franchises',
            sagasSub: 'Beloved Cinematic Universes',
            sciFiTitle: 'Sci-Fi & Future Worlds',
            sciFiSub: 'Space Exploration & Sci-Fi',
            animationTitle: 'Animation & Great Adventures',
            animationSub: 'Animated Masterpieces for All Ages',
            adventureTitle: 'Adventure & Exploration',
            adventureSub: 'Extraordinary Journeys & Epic Quests',
            actionTitle: 'Action & Adrenaline',
            actionSub: 'Blockbusters & Great Emotions',
            movieComedyTitle: 'Comedies & Laughs',
            movieComedySub: 'Humor, Wit & Lighthearted Fun',
            thrillerTitle: 'Thriller & Suspense',
            thrillerSub: 'Plot Twists & High Tension',
            dramaTitle: 'Dramatic Masterpieces',
            dramaSub: 'Art Cinema & Intense Stories',
            crimeTitle: 'Crime & Investigation',
            crimeSub: 'Suspense & Cult Crime',
            warTitle: 'War & Political Dramas',
            warSub: 'Historical Conflicts & Political Intrigue',
            tvDramaTitle: 'Most Acclaimed Drama Series',
            tvDramaSub: 'Authorial Writing & Iconic Characters',
            comedyTitle: 'Sitcoms & Comedy Series',
            comedySub: 'Laughter & Brilliant Cameos',
            easterEggsTag: 'Easter Eggs & Trivia',
            cameoHistoryTitle: 'Cameos in Cinema History',
            guestStarsTag: 'Guest Stars & Crossovers',
            cameoTvTitle: 'Cameos and Stars in TV Series',
            viewAllCameos: 'View all cameos ({count})',
            viewAll: 'View all ({count})',
            fansVoice: "Fans' Voice",
            reviewsAndRatings: 'Reviews and Audience Ratings',
            writeReview: 'Write a Review',
            scrollLeft: 'Scroll left',
            scrollRight: 'Scroll right'
        },

        // Media & Cameo Cards
        cards: {
            ratingNotAvailable: 'N/A',
            movieType: 'Movie',
            tvType: 'TV Series',
            cameoBadge: 'Cameo',
            specialCameo: 'Special Cameo',
            easterEgg: 'Easter Egg',
            inTheRoleOf: 'In the role of:',
            appearance: 'Appearance:',
            clickForActorDetails: 'View actor profile',
            uncredited: 'uncredited'
        },

        // Cast Carousel
        cast: {
            title: 'Main Cast',
            subtitle: 'Cast & Characters',
            scrollPrevious: 'Scroll cast backward',
            scrollNext: 'Scroll cast forward',
            noCastMembers: 'No cast members registered.'
        },

        // Cameos Carousel
        cameos: {
            title: 'Cameos Present',
            subtitle: 'Special Appearances & Trivia',
            scrollPrevious: 'Scroll previous cameos',
            scrollNext: 'Scroll next cameos',
            noCameos: 'No special cameos reported for this title.'
        },

        // Detail Pages
        detail: {
            goBack: 'Go back',
            alsoKnownAs: 'Also known as:',
            backToSeries: 'Back to series',
            seriesIdLabel: 'Series ID: {id}',
            seasonOverviewFallback: 'All episodes and special cameos of season {number} of {name}.',
            seasonCameosTitle: 'Cameos & Guest Stars in this Season',
            fullEpisodeList: 'Full List',
            episodePlotLoading: 'Detailed episode plot loading...',
            openFullEpisodeList: 'Open full episode and cameo list',
            runtimeMinutes: 'Runtime: {runtime} min',
            guestStarCameoLabel: 'Guest Star / Cameo:',
            movieNotFound: 'Movie not found',
            votes: 'votes',
            voteSingle: 'vote',
            directing: 'Director',
            directors: 'Directors',
            writing: 'Screenplay',
            writers: 'Screenwriters',
            directorsAndWriters: 'Directors & Writers',
            creator: 'Created by',
            creators: 'Creators',
            genre: 'Genre',
            statsAndDetails: 'Stats & Details',
            technicalSheet: 'Official Technical Sheet',
            originalTitle: 'Original Title',
            releaseDate: 'Release date',
            firstAirDate: 'First Aired',
            airingPeriod: 'Airing period',
            lastAirDate: 'Last Aired',
            runtime: 'Runtime',
            seasons: 'Seasons',
            episodes: 'Episodes',
            originalLanguage: 'Original language',
            status: 'Status',
            budget: 'Budget',
            revenue: 'Revenue',
            notDisclosed: 'Not disclosed',
            millions: 'Million',
            synopsisTitle: 'Overview',
            showLess: 'Show less',
            readMore: 'Read more',
            collapse: 'Collapse',
            expand: 'Expand',
            overviewUnavailable: 'Overview not currently available.',
            cameosSectionTitle: 'Cameos & Easter Eggs in this Title',
            noCameosReported: 'No special cameos reported for this title.',
            submitCameo: 'Submit a Cameo',
            seasonsGuideTitle: 'Seasons & Episodes Guide',
            seasonLabel: 'Season {number}',
            episodeLabel: 'Episode {number}',
            minutes: 'Minutes',
            minShort: 'm',
            hoursShort: 'h',
            airedOn: 'Aired on',
            episodeDetails: 'Episode Details',
            biographyTitle: 'Biography',
            bioUnavailable: 'Biography not currently available.',
            placeOfBirth: 'Place of birth',
            dateOfBirth: 'Date of birth',
            alive: 'Alive',
            deceased: 'Deceased ({year})',
            knownFor: 'Known for',
            memorableCameos: 'Memorable Cameos in Career',
            filmography: 'Filmography & Roles',
            moviesTab: 'Movies',
            tvSeriesTab: 'TV Series'
        },

        // Preferences Bar
        preferences: {
            like: 'Like',
            removeFavorites: 'Remove from Favorites',
            removeWatchlist: 'Remove from Watchlist',
            watchedShort: 'Watched',
            markWatchedShort: 'Mark watched',
            liked: 'Liked',
            addWatchlist: 'Add to Watchlist',
            inWatchlist: 'In Watchlist',
            addFavorites: 'Add to Favorites',
            inFavorites: 'In Favorites',
            markWatched: 'Mark as Watched',
            watched: 'Watched',
            writeReview: 'Write Review',
            loginPrompt: 'Please log in to sync your preferences to the cloud. Do you want to sign in now?'
        },

        // Reviews Section
        reviews: {
            sectionTitle: 'Community Reviews',
            seasonReviewsTitle: 'Reviews for Season {number}',
            writeReviewBtn: 'Write a Review',
            noReviewsNotice: 'No reviews for this title yet. Be the first to comment!',
            modalTitle: 'Write a Review',
            yourRating: 'Your Rating',
            starsCount: '{count} out of 10 stars',
            yourComment: 'Your Comment',
            commentPlaceholder: 'Share your thoughts on plot, directing, and featured cameos...',
            charMinNotice: 'Write at least 5 characters to submit your review',
            cancelBtn: 'Cancel',
            publishBtn: 'Post Review',
            publishing: 'Posting review...',
            anonymousUser: 'Anonymous User',
            reviewerBadge: 'Cameos Reviewer',
            edit: 'Edit',
            delete: 'Delete',
            deleteConfirm: 'Are you sure you want to delete this review?',
            likesCount: '{count} Likes',
            verifiedReview: 'Verified'
        },

        // Social & Friends
        social: {
            friendsTab: 'Your Friends',
            newFriendBadge: 'New Friend',
            acceptedRequestMsg: 'You accepted {name}\'s request!',
            rejectedRequestMsg: 'Request declined.',
            cancelledRequestMsg: 'Request cancelled.',
            friendRemovedMsg: 'Friend removed from list.',
            friendFallback: 'friend',
            socialRulesTitle: 'Traceability & Social Rules',
            guideRule1: '• Pending requests prevent duplicate requests to the same user.',
            guideRule2: '• You cannot send friend requests to yourself.',
            guideRule3: '• When a request is accepted, the ID is saved to the Firestore friends list.',
            guideRule4: '• Offline functionality supported with automatic sync queue.',
            receivedRequestsTab: 'Received Requests',
            sentRequestsTab: 'Sent Requests',
            notificationsTab: 'Notifications',
            addFriendCardTitle: 'Add Friend',
            addFriendInputPlaceholder: "Enter friend's UID or Username...",
            sendRequestBtn: 'Send Request',
            noFriends: 'No friends found',
            noFriendsSub: 'Add friends via UID or Username to share discoveries and easter eggs!',
            noIncomingRequests: 'No incoming requests',
            noPendingRequests: 'No pending requests',
            noNotifications: 'No new notifications',
            acceptBtn: 'Accept',
            declineBtn: 'Decline',
            cancelRequestBtn: 'Cancel request',
            mutualCameos: 'Mutual cameos: {count}',
            sentOn: 'Sent: {date}',
            alreadyFriendError: 'This user is already on your friends list!',
            requestAlreadySentError: 'You have already sent a request to this user!',
            requestSentSuccess: 'Friend request sent successfully!',
            cannotAddSelfError: 'You cannot send a friend request to yourself.',
            removeFriend: 'Remove Friend',
            removeFriendConfirm: 'Are you sure you want to remove {name} from your friends list?'
        },

        // Profile Page
        profile: {
            title: 'Profile',
            friendsTab: 'Friends',
            loadingFavorites: 'Loading favorites…',
            favoritesError: 'Error loading favorites.',
            noFavorites: 'No series in favorites.',
            loadingVoted: 'Loading votes…',
            votedError: 'Error loading votes.',
            noVoted: 'No votes recorded.',
            votedSeries: 'Voted series',
            votedEpisodes: 'Voted episodes',
            noVotedSeries: 'No series voted.',
            noVotedEpisodes: 'No episodes voted.',
            loadingWatchlist: 'Loading watchlist…',
            watchlistError: 'Error loading watchlist.',
            noWatchlist: 'No series in watchlist.',
            notLoggedInTitle: 'User Profile',
            notLoggedInText: 'You are not logged in. Please log in or register to view your profile.',
            loginBtn: 'Log In',
            signupBtn: 'Sign Up',
            friendsCount: 'Friends: {count}',
            watchlistCount: 'Watchlist: {count}',
            favoritesCount: 'Favorites: {count}',
            watchedCount: 'Watched: {count}',
            reviewsCount: 'Reviews: {count}',
            watchlistTab: 'Watchlist',
            favoritesTab: 'Favorites',
            votedTab: 'Voted',
            languageSettings: 'Application Language',
            selectLanguage: 'Select Language',
            italianLang: 'Italian (IT)',
            englishLang: 'English (EN)'
        },

        // Authentication Page
        auth: {
            loginTitle: 'Log In to Cameos',
            signupTitle: 'Create an Account',
            usernameRequiredTitle: 'Complete Your Profile',
            usernamePrompt: 'Choose a username to start sharing cameos and easter eggs with the community.',
            emailLabel: 'Email',
            emailPlaceholder: 'name@example.com',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Enter your password',
            usernameLabel: 'Username',
            usernamePlaceholder: 'Choose your username',
            rememberMe: 'Remember me',
            loginSubmit: 'Log In',
            signupSubmit: 'Sign Up',
            saveAndContinue: 'Save and continue',
            orWith: 'Or with',
            loginWithGoogle: 'Log In with Google',
            noAccountPrompt: "Don't have an account?",
            hasAccountPrompt: 'Already have an account?',
            goToSignup: 'Sign up now',
            goToLogin: 'Log in here',
            googleSuccess: 'Google login successful!',
            googleUsernameNeeded: 'Google login completed! Please enter a valid username to finish setup.',
            loginFailed: 'Login failed. Please check your credentials.'
        },

        // Common & System Strings
        common: {
            actor: 'Actor',
            role: 'Role',
            noOverview: 'No description available.',
            rating: 'Rating',
            resultsCount: 'results',
            loading: 'Loading...',
            loadingMore: 'Loading...',
            loadMore: 'Load More',
            noMoreItems: 'All movies have been loaded',
            back: 'Back',
            backToFilms: 'Back to Movies',
            allCategoryFilms: 'All category movies',
            moviesCount: '{count} movies',
            error: 'An error occurred',
            retry: 'Retry',
            noResults: 'No results found',
            save: 'Save',
            cancel: 'Cancel',
            confirm: 'Confirm',
            close: 'Close',
            delete: 'Delete',
            edit: 'Edit',
            unknown: 'Unknown',
            notAvailable: 'Not available',
            offlineNotice: 'You are offline. Some content might be served from local storage.'
        },

        // TV and Catalog section
        tv: {
            tmdbCatalog: 'TMDB Catalog',
            series: 'TV Series',
            searchPlaceholder: 'Search TV series…',
            allGenres: 'All genres',
            modesCatalog: 'Catalog',
            modesTrending: 'Trending',
            modesSearch: 'Search',
            loadingEpisode: 'Loading episode…',
            loadingDetails: 'Loading details…',
            loginRequiredFavorites: 'You must be registered to add this series to favorites.',
            loginRequiredWatchlist: 'You must be registered to add this series to watchlist.',
            loginRequiredVote: 'You must be registered to rate this series.',
            yourVote: 'Your rating:',
            noSeasons: 'No seasons available.'
        },

        meta: {
            langCode: 'en'
        }
    }
};

export const STORAGE_LANG_KEY = 'cameos_language';

/**
 * Interpolates named values in a translated string without interpreting replacement tokens.
 * Unknown placeholders remain intact so missing values are visible during development.
 * @param {string} text
 * @param {Object<string, unknown>} [params={}]
 * @returns {string}
 */
export function formatTranslation(text, params = {}) {
    return text.replace(/\{(\w+)\}/g, (placeholder, key) =>
        Object.hasOwn(params, key) ? String(params[key] ?? '') : placeholder
    );
}

/**
 * Legge la lingua attiva salvata localmente o dal browser ('it' | 'en')
 * @returns {'it'|'en'}
 */
export function getSavedLanguage() {
    if (typeof window === 'undefined') return 'it';
    try {
        const saved = localStorage.getItem(STORAGE_LANG_KEY);
        if (saved) return resolveLangKey(saved);
        const navLang = navigator.language || navigator.userLanguage || 'it';
        return resolveLangKey(navLang);
    } catch {
        return 'it';
    }
}

/**
 * Risolve ricorsivamente una chiave di traduzione nidificata (es. 'nav.media' o 'slider.topOfMonth')
 * @param {string} path - Percorso con notazione a punto
 * @param {'it'|'en'} [lang='it']
 * @param {Object} [params] - Eventuali parametri di interpolazione { count: 3 }
 * @param {string} [fallback] - Testo di fallback se la chiave non esiste
 * @returns {string}
 */
export function translate(path, lang = 'it', params = null, fallback = '') {
    if (!path) return fallback;

    const activeLang = resolveLangKey(lang);
    const langDict = translations[activeLang] || translations.it;

    const parts = String(path).split('.');
    let current = langDict;

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            current = undefined;
            break;
        }
    }

    // Fallback sul dizionario italiano se non trovato nella lingua corrente
    if (current === undefined && activeLang !== 'it') {
        let itCurrent = translations.it;
        for (const part of parts) {
            if (itCurrent && typeof itCurrent === 'object' && part in itCurrent) {
                itCurrent = itCurrent[part];
            } else {
                itCurrent = undefined;
                break;
            }
        }
        current = itCurrent;
    }

    const result = (typeof current === 'string' ? current : null) || fallback || path;

    // Sostituzione parametri interpolati {key}
    if (params && typeof params === 'object') {
        return formatTranslation(result, params);
    }

    return result;
}

export default translations;
