import { BaseRepository, STORES } from '../BaseRepository.js';
import { cameoBackend as defaultCameoBackend } from '../../backend/cameos/CameoBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Cameo, Movie, Series, Season, Episode } from '../../models/index.js';

export const HISTORIC_FAMOUS_REGISTRY = Object.freeze([
  {
    movieId: 383498,
    personId: 287,
    name: 'Brad Pitt',
    character: 'Vanisher',
    role: 'Apparizione flash di due secondi sui cavi elettrici: compensato con una tazza di caffè da Ryan Reynolds.',
    badge: 'Flash Cameo (2 sec)'
  },
  {
    movieId: 9398,
    personId: 7487,
    name: 'David Bowie',
    character: 'David Bowie',
    role: 'Giudice impeccabile e arbitro della sfida di moda tra Derek Zoolander e Hansel.',
    badge: 'Iconic Cameo'
  },
  {
    movieId: 284053,
    personId: 1892,
    name: 'Matt Damon',
    character: 'Actor Loki',
    role: 'Interpreta in modo esilarante l\'attore che recita la morte teatrale di Loki ad Asgard davanti a Odino.',
    badge: 'Cameo Comico'
  },
  {
    movieId: 157336,
    personId: 1892,
    name: 'Matt Damon',
    character: 'Dr. Mann',
    role: 'Dr. Mann: presenza a sorpresa totalmente tenuta segreta nella promozione e nei trailer fino all\'uscita.',
    badge: 'Top Secret Cameo'
  },
  {
    movieId: 19908,
    personId: 1532,
    name: 'Bill Murray',
    character: 'Bill Murray',
    role: 'Interpreta se stesso truccato da zombie per poter giocare a golf indisturbato durante l\'apocalisse.',
    badge: 'Cult Cameo'
  },
  {
    movieId: 299534,
    personId: 7624,
    name: 'Stan Lee',
    character: 'Driver 1970s',
    role: 'Ultima apparizione cinematografica del co-creatore della Marvel nei panni di un pacifista hippie anni \'70.',
    badge: 'Cameo Storico'
  },
  {
    movieId: 680,
    personId: 138,
    name: 'Quentin Tarantino',
    character: 'Jimmie Dimmick',
    role: 'Il regista appare nei panni dell\'amico Jimmie che accoglie Jules e Vincent per ripulire l\'auto.',
    badge: 'Cameo del Regista'
  },
  {
    movieId: 539,
    personId: 2636,
    name: 'Alfred Hitchcock',
    character: 'Man Outside Office',
    role: 'Il maestro della suspense appare fuori dall\'ufficio immobiliare di Marion Crane con cappello da cowboy.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 7446,
    personId: 500,
    name: 'Tom Cruise',
    character: 'Les Grossman',
    role: 'Irriconoscibile produttore esecutivo volgare e irascibile Les Grossman con celebre balletto finale.',
    badge: 'Cameo Cult'
  },
  {
    movieId: 608,
    personId: 82702,
    name: 'Michael Jackson',
    character: 'Agent M',
    role: 'Il Re del Pop appare nei panni dell\'Agente M che insiste con Zed per diventare capo della divisione aliena.',
    badge: 'Special Guest'
  },
  {
    movieId: 634649,
    personId: 23458,
    name: 'Charlie Cox',
    character: 'Matt Murdock',
    role: 'L\'avvocato cieco Matt Murdock aiuta Peter Parker e afferra al volo un mattone: "Sono un ottimo avvocato."',
    badge: 'Multiverse Cameo'
  },
  {
    movieId: 120,
    personId: 108,
    name: 'Peter Jackson',
    character: 'Albert Dreary',
    role: 'Il regista Peter Jackson compare a Brea nei panni di Albert Dreary mentre sgranocchia una carota sotto la pioggia.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 772,
    personId: 33663,
    name: 'Donald Trump',
    character: 'Donald Trump',
    role: 'Indica a Kevin McCallister la direzione della hall del Plaza Hotel di New York.',
    badge: 'Iconic Cameo'
  },
  {
    movieId: 103,
    personId: 1032,
    name: 'Martin Scorsese',
    character: 'Passenger',
    role: 'Il regista sale sul taxi di Travis Bickle e osserva la finestra della moglie infedele.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 387,
    personId: 6529,
    name: 'Bruce Campbell',
    character: 'Snooty Usher',
    role: 'L\'iconico usciere altezzoso che impedisce a Peter Parker di entrare a teatro a spettacolo iniziato.',
    badge: 'Cameo Cult'
  },
  {
    movieId: 582883,
    personId: 6384,
    name: 'Keanu Reeves',
    character: 'Keanu Reeves',
    role: 'Esilarante parodia di se stesso a cena con occhiali senza lenti e citazioni filosofiche stravaganti.',
    badge: 'Cult Cameo'
  },
  {
    movieId: 49538,
    personId: 6968,
    name: 'Hugh Jackman',
    character: 'Logan / Wolverine',
    role: 'Wolverine seduto al bar che manda via Charles Xavier ed Erik Lehnsherr in due parole secche.',
    badge: 'Flash Cameo (1 sec)'
  },
  {
    movieId: 8367,
    personId: 738,
    name: 'Sean Connery',
    character: 'King Richard',
    role: 'Apparizione a sorpresa finale di Re Riccardo Cuor di Leone per celebrare il matrimonio di Robin Hood.',
    badge: 'Top Secret Cameo'
  },
  {
    movieId: 4638,
    personId: 112,
    name: 'Cate Blanchett',
    character: 'Janine',
    role: 'L\'ex fidanzata dell\'agente Angel completamente irriconoscibile con tuta hazmat e mascherina facciale.',
    badge: 'Hidden Cameo'
  },
  {
    movieId: 64688,
    personId: 85,
    name: 'Johnny Depp',
    character: 'Tom Hanson',
    role: 'L\'originale poliziotto sotto copertura si toglie il trucco da biker in un clamoroso colpo di scena.',
    badge: 'Nostalgia Cameo'
  },
  {
    movieId: 8839,
    personId: 7447,
    name: 'Dan Aykroyd',
    character: 'Dr. Raymond Stantz',
    role: 'Fugge terrorizzato dalla villa infestata con lo zaino protonico: "Chi chiamerai? Qualcun altro!"',
    badge: 'Crossover Cameo'
  },
  {
    movieId: 474350,
    personId: 6718,
    name: 'Stephen King',
    character: 'Shopkeeper',
    role: 'Il maestro dell\'horror interpreta il burbero negoziante di antiquariato che rivende la bicicletta a Bill.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 140607,
    personId: 8784,
    name: 'Daniel Craig',
    character: 'Stormtrooper FN-1824',
    role: '007 veste l\'armatura da Stormtrooper manipolato con la Forza da Rey: "E getterò via la mia arma."',
    badge: 'Secret Cameo'
  },
  {
    movieId: 2293,
    personId: 7624,
    name: 'Stan Lee',
    character: 'Stan Lee',
    role: 'Insegna lezioni di vita, cuori infranti e supereroi a Brodie Bruce fuori dal negozio.',
    badge: 'Cameo Cult'
  },
  {
    movieId: 9352,
    personId: 1892,
    name: 'Matt Damon',
    character: 'Donny',
    role: 'Canta a sorpresa la celebre "Scotty Doesn\'t Know" con testa rasata e tatuaggi alla festa.',
    badge: 'Cult Cameo'
  },
  {
    movieId: 2300,
    personId: 1532,
    name: 'Bill Murray',
    character: 'Bill Murray',
    role: 'Arriva all\'ultimo secondo sul campo di gioco per salvare i Looney Tunes con Michael Jordan.',
    badge: 'Iconic Cameo'
  },
  {
    movieId: 1726,
    personId: 2231,
    name: 'Samuel L. Jackson',
    character: 'Nick Fury',
    role: 'La storica scena post-credits che dà inizio al Marvel Cinematic Universe: "Iniziativa Vendicatori".',
    badge: 'Post-Credits Legend'
  },
  {
    movieId: 1726,
    personId: 7624,
    name: 'Stan Lee',
    character: 'Stan Lee',
    role: 'Scambiato da Tony Stark per Hugh Hefner sul red carpet con vestaglia di seta: "Sei fantastico, Hugh!".',
    badge: 'Marvel Cameo'
  },
  {
    movieId: 680,
    personId: 139,
    name: 'Christopher Walken',
    character: 'Captain Koons',
    role: 'Il memorabile e teso monologo dell\'orologio d\'oro tramandato di generazione in generazione.',
    badge: 'Iconic Monologue'
  },
  {
    movieId: 902,
    personId: 5049,
    name: 'John Hurt',
    character: 'John Hurt',
    role: 'Riesegue la celebre scena dello chestburster di Alien al diner spaziale: "Oh no... not again!".',
    badge: 'Parody Cameo'
  },
  {
    movieId: 283995,
    personId: 1104,
    name: 'Sylvester Stallone',
    character: 'Stakar Ogord',
    role: 'Il leggendario leader dei Ravager che affronta Yondu Udonta sul pianeta innevato Contraxia.',
    badge: 'Special Guest'
  },
  {
    movieId: 9479,
    personId: 8654,
    name: 'Chuck Norris',
    character: 'Chuck Norris',
    role: 'Giudice decisivo del torneo che vota con il pollice in su decretando il destino della finale di Dodgeball.',
    badge: 'Cult Cameo'
  },
  {
    movieId: 599,
    personId: 8856,
    name: 'Buster Keaton',
    character: 'Buster Keaton',
    role: 'La leggenda del cinema muto appare al tavolo di bridge tra i "fantasmi" di Norma Desmond.',
    badge: 'Cameo Storico'
  },
  {
    movieId: 1895,
    personId: 1,
    name: 'George Lucas',
    character: 'Baron Papanoida',
    role: 'Il creatore della saga galattica compare con trucco blu all\'ingresso dell\'opera di Coruscant.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 525,
    personId: 488,
    name: 'Steven Spielberg',
    character: 'Cook County Assessor',
    role: 'L\'impiegato dell\'ufficio imposte della Contea di Cook che timbra e valida la ricevuta finale.',
    badge: 'Cameo del Regista'
  },
  {
    movieId: 374720,
    personId: 3895,
    name: 'Michael Caine',
    character: 'Fortis Leader (voice)',
    role: 'Cameo vocale via radio nei panni del comandante dello squadrone di caccia Spitfire della RAF.',
    badge: 'Cameo Vocale'
  },
  {
    movieId: 18435,
    personId: 3,
    name: 'Harrison Ford',
    character: 'Harrison Ford',
    role: 'Fermato per strada a Los Angeles dall\'esuberante Brüno, lo liquida con due parole categoriche.',
    badge: 'Flash Cameo'
  },
  {
    movieId: 109410,
    personId: 206,
    name: 'Jim Carrey',
    character: 'Scott Riles',
    role: 'Conduttore canadese della CBC che irrompe nella leggendaria rissa campale tra giornalisti televisivi.',
    badge: 'Cameo Comico'
  },
  {
    movieId: 4638,
    personId: 108,
    name: 'Peter Jackson',
    character: 'Father Christmas',
    role: 'Irriconoscibile Babbo Natale furioso che accoltella la mano dell\'agente Nicholas Angel.',
    badge: 'Hidden Cameo'
  },
  {
    movieId: 879,
    personId: 1461,
    name: 'Glenn Close',
    character: 'Gutless',
    role: 'Piratessa barbuta rinchiusa nella temuta cassa dei bucanieri e delle scorciatoie da Capitan Uncino.',
    badge: 'Hidden Cameo'
  },
  {
    movieId: 39513,
    personId: 10205,
    name: 'Sigourney Weaver',
    character: 'The Big Guy',
    role: 'La leggendaria icona della fantascienza comanda l\'operazione militare per catturare l\'alieno Paul.',
    badge: 'Sci-Fi Cameo'
  },
  {
    movieId: 329,
    personId: 8555,
    name: 'Roman Polanski',
    character: 'Man with Knife',
    role: 'Il regista sfregia il naso del detective Jake Gittes intimandogli di non ficcare il naso negli affari altrui.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 10414,
    personId: 510,
    name: 'Tim Burton',
    character: 'Corpse',
    role: 'Il visionario regista appare per pochi secondi come cadavere disteso sul lettino dell\'obitorio.',
    badge: 'Hidden Cameo'
  },
  {
    movieId: 492,
    personId: 7467,
    name: 'David Fincher',
    character: 'Christopher Bing',
    role: 'Interpreta se stesso commentando il fenomeno delle marionette nel documentario fittizio su Malkovich.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 180,
    personId: 2639,
    name: 'Cameron Crowe',
    character: 'Bus Passenger',
    role: 'Passeggero della metropolitana che legge il giornale mentre Tom Cruise fugge tra i vagoni.',
    badge: 'Friendship Cameo'
  },
  {
    movieId: 453395,
    personId: 6529,
    name: 'Bruce Campbell',
    character: 'Pizza Poppa',
    role: 'L\'attore feticcio di Sam Raimi combatte per giorni contro la propria mano stregata vendendo pizze.',
    badge: 'Cameo Cult'
  },
  {
    movieId: 44717,
    personId: 1032,
    name: 'Martin Scorsese',
    character: 'Photographer',
    role: 'Il maestro appare nei panni del fotografo che ritrae Georges Méliès al culmine del suo successo.',
    badge: 'Firma d\'Autore'
  },
  {
    movieId: 559,
    personId: 7624,
    name: 'Stan Lee',
    character: 'Man in Times Square',
    role: 'Rivolge a Peter Parker parole indimenticabili: "Sai, penso che una sola persona possa fare la differenza".',
    badge: 'Marvel Cameo'
  }
]);

/**
 * CameoRepository
 * Manages Cameos persistence in IndexedDB across Series, Seasons, Episodes, Movies, and Actors
 * with Network-First strategy and automatic fallback to local storage when offline or on API errors.
 */
export class CameoRepository extends BaseRepository {
  /**
   * @param {import('../../backend/cameos/CameoBackend.js').CameoBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultCameoBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
  }

  /**
   * Execute a Cameo list query (`Array<Cameo>`) with automatic caching in `STORES.CAMEOS`
   * @param {string} cacheKey
   * @param {Function} fetchRemote
   * @returns {Promise<Array<Cameo>>}
   */
  async _executeCameoListQuery(cacheKey, fetchRemote) {
    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote,
      saveLocal: async (freshList) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, items: freshList });
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        return cached?.items ? cached.items.map((item) => new Cameo(item)) : null;
      }
    });
  }

  /**
   * Helper algorithm to inspect guest stars array and classify cameos
   * @param {Array<Object>} [guestStars=[]]
   * @param {number} [minPopularity=12]
   * @returns {Array<Cameo>}
   */
  extractCameosFromGuestStars(guestStars = [], minPopularity = 12) {
    return this.backend.extractCameosFromGuestStars(guestStars, minPopularity);
  }

  /**
   * Discover TV series known for frequent cameos (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getCameoHeavySeries(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('cameo_heavy_series', {
      page: params.page ?? 1,
      sortBy: params.sortBy ?? 'popularity.desc',
      language: lang
    });

    return this._executePaginatedQuery(queryKey, () => this.backend.getCameoHeavySeries(params), Series);
  }

  /**
   * Discover movies known for frequent cameos (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getCameoHeavyMovies(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('cameo_heavy_movies', {
      page: params.page ?? 1,
      sortBy: params.sortBy ?? 'popularity.desc',
      language: lang
    });

    return this._executePaginatedQuery(queryKey, () => this.backend.getCameoHeavyMovies(params), Movie);
  }

  /**
   * Get movie cameos by analyzing cast credits and billing order (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.movieId]
   * @param {number} [params.minPopularity=8]
   * @param {string} [params.language]
   * @returns {Promise<{ movie: Movie, cameos: Array<Cameo>, allCast: Array<Cameo> }>}
   */
  async getMovieCameos(params = {}) {
    const { movieId, minPopularity = 8, language } = params;
    if (!movieId) throw new Error('movieId is required');

    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('movie_cameos', {
      movieId: Number(movieId),
      minPopularity,
      language: lang
    });

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getMovieCameos(params),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
        if (freshData.movie?.id) {
          await this.storage.put(STORES.MOVIES, {
            cacheKey: `movie:${Number(freshData.movie.id)}:${lang}`,
            id: Number(freshData.movie.id),
            language: lang,
            isComplete: true,
            data: freshData.movie
          });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        if (!cached?.data) return null;
        return {
          movie: new Movie(cached.data.movie),
          cameos: (cached.data.cameos || []).map((c) => new Cameo(c)),
          allCast: (cached.data.allCast || []).map((c) => new Cameo(c))
        };
      }
    });
  }

  /**
   * Get all career movie cameos for a given actor (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  /**
   * Fetch dynamic famous cameos from TMDb movies known for frequent cameos when curated registry is exhausted
   * @private
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=8]
   * @param {string} [params.language]
   * @param {Array<number>} [params.excludeMovieIds=[]]
   * @returns {Promise<Array<Cameo>>}
   */
  async _fetchDynamicFamousCameos({ page = 1, limit = 8, language, excludeMovieIds = [] } = {}) {
    try {
      const heavyMoviesRes = await this.getCameoHeavyMovies({
        page,
        sortBy: 'vote_count.desc',
        language
      });
      const movies = (heavyMoviesRes?.results || []).filter(
        (m) => !excludeMovieIds.includes(Number(m.id))
      );

      const dynamicCameos = [];
      for (const movie of movies) {
        if (dynamicCameos.length >= limit) break;
        try {
          const movieCameosRes = await this.getMovieCameos({
            movieId: movie.id,
            minPopularity: 8,
            language
          });
          const validCameos = movieCameosRes?.cameos || [];
          for (const c of validCameos) {
            if (dynamicCameos.length >= limit) break;
            const isDup = dynamicCameos.some(
              (dc) => Number(dc.id) === Number(c.id) && Number(dc.mediaId) === Number(movie.id)
            );
            if (!isDup) {
              dynamicCameos.push(
                new Cameo({
                  ...c,
                  mediaId: movie.id,
                  mediaType: 'movie',
                  mediaTitle: movie.title,
                  posterUrl: movie.posterUrl,
                  backdropUrl: movie.backdropUrl,
                  badge: c.cameoBadge || 'Cameo Celebre',
                  cameoBadge: c.cameoBadge || 'Cameo Celebre',
                  isCameoHighlight: true
                })
              );
            }
          }
        } catch {
          // Continua con il prossimo film in caso di errore su uno specifico
        }
      }
      return dynamicCameos;
    } catch (err) {
      console.warn('[CameoRepository] _fetchDynamicFamousCameos error:', err);
      return [];
    }
  }

  /**
   * Get legendary cinema cameos hydrated with live TMDb data with pagination support
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=8]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, totalPages: number, totalResults: number, results: Array<Cameo>, hasMore: boolean }>}
   */
  async getFamousCameos(params = {}) {
    const { page = 1, limit = 8, language } = params;
    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('famous_cinema_cameos', { language: lang, page, limit });

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: async () => {
        const totalResults = HISTORIC_FAMOUS_REGISTRY.length;
        const startIndex = (page - 1) * limit;

        if (startIndex < totalResults) {
          const selectedRegistry = HISTORIC_FAMOUS_REGISTRY.slice(startIndex, startIndex + limit);
          const hydrated = await Promise.all(
            selectedRegistry.map(async (entry) => {
              try {
                const details = await this.getMovieCameos({ movieId: entry.movieId, language: lang });
                const castList = details?.allCast || details?.cameos || [];
                const match = castList.find(
                  (c) => Number(c.id) === Number(entry.personId) || c.name === entry.name
                );

                return new Cameo({
                  ...(match || {}),
                  id: entry.personId,
                  name: match?.name || entry.name,
                  character: match?.character || entry.character,
                  mediaId: entry.movieId,
                  mediaType: 'movie',
                  mediaTitle: details?.movie?.title || entry.name,
                  profileUrl: match?.profileUrl,
                  posterUrl: details?.movie?.posterUrl,
                  backdropUrl: details?.movie?.backdropUrl,
                  voteAverage: details?.movie?.voteAverage,
                  role: entry.role,
                  overview: entry.role,
                  badge: entry.badge,
                  cameoBadge: entry.badge,
                  isCameoHighlight: true
                });
              } catch (err) {
                console.warn(`[CameoRepository] Hydration failed for ${entry.name}:`, err);
                return new Cameo({
                  id: entry.personId,
                  name: entry.name,
                  character: entry.character,
                  mediaId: entry.movieId,
                  mediaType: 'movie',
                  role: entry.role,
                  overview: entry.role,
                  badge: entry.badge,
                  cameoBadge: entry.badge,
                  isCameoHighlight: true
                });
              }
            })
          );

          if (hydrated.length < limit) {
            const needed = limit - hydrated.length;
            const extra = await this._fetchDynamicFamousCameos({
              page: 1,
              limit: needed,
              language: lang,
              excludeMovieIds: HISTORIC_FAMOUS_REGISTRY.map((r) => r.movieId)
            });
            hydrated.push(...extra);
          }

          return {
            page,
            totalPages: Math.max(Math.ceil(totalResults / limit) + 5, page + 1),
            totalResults: totalResults + 100,
            results: hydrated,
            hasMore: true
          };
        }

        const registryPages = Math.ceil(totalResults / limit);
        const dynamicPage = page - registryPages;
        const dynamicResults = await this._fetchDynamicFamousCameos({
          page: dynamicPage,
          limit,
          language: lang,
          excludeMovieIds: HISTORIC_FAMOUS_REGISTRY.map((r) => r.movieId)
        });

        return {
          page,
          totalPages: page + 5,
          totalResults: totalResults + 100,
          results: dynamicResults,
          hasMore: dynamicResults.length > 0
        };
      },
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        if (cached?.data?.results) {
          return {
            ...cached.data,
            results: cached.data.results.map((item) => new Cameo(item))
          };
        }
        if (cached?.items) {
          return {
            page,
            totalPages: Math.ceil(cached.items.length / limit),
            totalResults: cached.items.length,
            results: cached.items.map((item) => new Cameo(item)),
            hasMore: false
          };
        }
        const totalResults = HISTORIC_FAMOUS_REGISTRY.length;
        const totalPages = Math.ceil(totalResults / limit);
        const startIndex = (page - 1) * limit;
        const selectedRegistry = HISTORIC_FAMOUS_REGISTRY.slice(startIndex, startIndex + limit);

        return {
          page,
          totalPages: Math.max(totalPages, page + 1),
          totalResults: totalResults + 100,
          results: selectedRegistry.map((entry) => new Cameo({
            id: entry.personId,
            name: entry.name,
            character: entry.character,
            mediaId: entry.movieId,
            mediaType: 'movie',
            role: entry.role,
            overview: entry.role,
            badge: entry.badge,
            cameoBadge: entry.badge,
            isCameoHighlight: true
          })),
          hasMore: true
        };
      }
    });
  }

  getFamousCameosTotalCount() {
    return HISTORIC_FAMOUS_REGISTRY.length;
  }

  async getActorMovieCameos(params = {}) {
    const { personId, language } = params;
    if (!personId) throw new Error('personId is required');

    const cacheKey = this.buildCacheKey('actor_movie_cameos', {
      personId: Number(personId),
      language: this.normalizeLanguage(language)
    });

    return this._executeCameoListQuery(cacheKey, () => this.backend.getActorMovieCameos(params));
  }

  /**
   * Get episode cameos with full badge classifications (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number|string} [params.episodeNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ episode: Episode, cameos: Array<Cameo>, allGuestStars: Array<Cameo> }>}
   */
  async getEpisodeCameos(params = {}) {
    const { seriesId, seasonNumber, episodeNumber, minPopularity = 12, language } = params;
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('episode_cameos', {
      seriesId: Number(seriesId),
      seasonNumber: Number(seasonNumber),
      episodeNumber: Number(episodeNumber),
      minPopularity,
      language: lang
    });

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getEpisodeCameos(params),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
        if (freshData.episode) {
          await this.storage.put(STORES.EPISODES, {
            cacheKey: `episode:${Number(seriesId)}:${Number(seasonNumber)}:${Number(episodeNumber)}:${lang}`,
            seriesId: Number(seriesId),
            seasonNumber: Number(seasonNumber),
            episodeNumber: Number(episodeNumber),
            language: lang,
            data: freshData.episode
          });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        if (!cached?.data) return null;
        return {
          episode: new Episode(cached.data.episode),
          cameos: (cached.data.cameos || []).map((c) => new Cameo(c)),
          allGuestStars: (cached.data.allGuestStars || []).map((c) => new Cameo(c))
        };
      }
    });
  }

  /**
   * Get all cameos across episodes of a season (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ season: Season, episodesWithCameos: Array<Episode>, seasonCameos: Array<Cameo> }>}
   */
  async getSeasonCameos(params = {}) {
    const { seriesId, seasonNumber, minPopularity = 12, language } = params;
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('season_cameos', {
      seriesId: Number(seriesId),
      seasonNumber: Number(seasonNumber),
      minPopularity,
      language: lang
    });

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getSeasonCameos(params),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
        if (freshData.season) {
          await this.storage.put(STORES.SEASONS, {
            cacheKey: `season:${Number(seriesId)}:${Number(seasonNumber)}:${lang}`,
            seriesId: Number(seriesId),
            seasonNumber: Number(seasonNumber),
            language: lang,
            data: freshData.season
          });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        if (!cached?.data) return null;
        return {
          season: new Season(cached.data.season),
          episodesWithCameos: (cached.data.episodesWithCameos || []).map((ep) => new Episode(ep)),
          seasonCameos: (cached.data.seasonCameos || []).map((c) => new Cameo(c))
        };
      }
    });
  }

  /**
   * Detect VIP cameos at the series level (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number} [params.maxEpisodes=2]
   * @param {number} [params.minPopularity=10]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getSeriesVipCameos(params = {}) {
    const { seriesId, maxEpisodes = 2, minPopularity = 10, language } = params;
    if (!seriesId) throw new Error('seriesId is required');

    const cacheKey = this.buildCacheKey('series_vip_cameos', {
      seriesId: Number(seriesId),
      maxEpisodes,
      minPopularity,
      language: this.normalizeLanguage(language)
    });

    return this._executeCameoListQuery(cacheKey, () => this.backend.getSeriesVipCameos(params));
  }

  /**
   * Get all career TV cameos for a given actor (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorCareerCameos(params = {}) {
    const { personId, language } = params;
    if (!personId) throw new Error('personId is required');

    const cacheKey = this.buildCacheKey('actor_career_cameos', {
      personId: Number(personId),
      language: this.normalizeLanguage(language)
    });

    return this._executeCameoListQuery(cacheKey, () => this.backend.getActorCareerCameos(params));
  }
}

export const cameoRepository = new CameoRepository();
export default CameoRepository;
