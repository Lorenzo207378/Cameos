import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createServer } from 'vite';

// Run the actual React component in Chrome: DOM geometry and ResizeObserver cannot be checked with model mocks.
const projectPath = fileURLToPath(new URL('../', import.meta.url));
const harnessPath = '/Cameos/__test_carousel_loading';
const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body style="margin:0">
<div id="root"></div><script type="module">
import React, { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Carousel from '/src/components/Carousel.jsx';
import MediaCarousel from '/src/components/media/MediaCarousel.jsx';
import CastCarousel from '/src/components/media/CastCarousel.jsx';
import TVSeasonSelection from '/src/components/tv/TVSeasonSelection.jsx';
import TVSeasonsSection from '/src/components/tv/TVSeasonsSection.jsx';
import { DeviceProvider } from '/src/contexts/DeviceContext.jsx';
import '/src/css/common/elements.css';
import TrendingMediaCardSlider from '/src/components/media/TrendingMediaCardSlider.jsx';
import { Movie } from '/src/models/Movie.js';
import { Cameo } from '/src/models/Cameo.js';
import CameoCard from '/src/components/cameo/CameoCard.jsx';
import { LanguageProvider, useTranslation } from '/src/contexts/LanguageContext.jsx';
import { AuthContext } from '/src/contexts/AuthContext.jsx';
import { useMovieImagesReady } from '/src/utils/imageUtils.js';
import { useGoBack, useSingleLineFit } from '/src/utils/domUtils.js';
import CarouselHeading from '/src/components/CarouselHeading.jsx';
import SearchBar from '/src/components/navbar/SearchBar.jsx';
import MediaProvidersSection from '/src/components/media/MediaProvidersSection.jsx';
import PersonFilmography from '/src/components/person/PersonFilmography.jsx';
/** @type {(type: string|React.JSXElementConstructor<any>, props: Object|null, ...children: React.ReactNode[]) => React.ReactElement} */
const h = React.createElement;
const root = createRoot(document.getElementById('root'));
let generation = 0;
let stats = {calls:0,inFlight:0,maxInFlight:0};
window.mountBackNavigation = (index, fallback) => {
  const previousState = window.history.state;
  window.history.replaceState({...previousState,idx:index},'');
  window.restoreBackNavigation = () => window.history.replaceState(previousState,'');
  function BackNavigation() {
    const goBack = useGoBack(fallback);
    const {pathname} = useLocation();
    return h('button',{id:'go-back',onClick:goBack},pathname);
  }
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,
    {initialEntries:['/previous','/detail'],initialIndex:1},h(BackNavigation))));
};
window.mountSearchNavigation = origin => {
  const previousState = window.history.state;
  window.history.replaceState({...previousState,idx:origin.includes('/search') ? 0 : 1},'');
  window.restoreSearchNavigation = () => window.history.replaceState(previousState,'');
  function SearchNavigation() {
    const location = useLocation();
    const goBack = useGoBack('/Cameos/movies');
    window.navigateSearchFixture = useNavigate();
    return h(React.Fragment,null,h(SearchBar),
      h('button',{id:'search-back',onClick:goBack},'Back'),
      h('output',{id:'search-location'},location.pathname+location.search+location.hash));
  }
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,{initialEntries:[origin]},
    h(DeviceProvider,null,h(SearchNavigation)))));
};
window.mountProviders = async (empty = false) => {
  await import('bootstrap-icons/font/bootstrap-icons.css');
  const provider = {provider_id:1,provider_name:'Provider One'};
  const store = {provider_id:2,provider_name:'Amazon Video'};
  const excluded = {provider_id:3,provider_name:'Prime Video with Ads'};
  const data = empty ? {} : {flatrate:[provider,excluded],free:[provider,store,excluded],ads:[provider,store],rent:[provider],buy:[provider]};
  function ProvidersFixture() {
    const [open,setOpen] = useState(false);
    const [second,setSecond] = useState(false);
    const [mounted,setMounted] = useState(true);
    window.unmountProviders = () => setMounted(false);
    window.openSecondProviderModal = () => setSecond(true);
    window.closeFirstProviderModal = () => setOpen(false);
    const media = new Movie({ watchProviders: { IT: data } });
    return h(React.Fragment,null,
      h('button',{id:'open-providers',onClick:()=>setOpen(true)},'Providers'),
      h('div',{id:'inline-providers'},h(MediaProvidersSection,{media})),
      mounted && h(MediaProvidersSection,{media,isModal:true,isOpen:open,onClose:()=>setOpen(false)}),
      mounted && h(MediaProvidersSection,{media,isModal:true,isOpen:second,onClose:()=>setSecond(false)}));
  }
  root.render(h(StrictMode,{key:++generation},h(ProvidersFixture)));
};
window.mountSeasonTimerFixture = () => {
  function SeasonFixtureContainer() {
    const [mounted, setMounted] = useState(true);
    window.unmountSeasonFixture = () => setMounted(false);
    return mounted ? h(TVSeasonSelection, {
      seasonsCount: 30,
      selectedSeasonNumber: 1,
      onSelectSeason: () => {}
    }) : null;
  }
  root.render(h(StrictMode, { key: ++generation }, h(SeasonFixtureContainer)));
};
window.mountStrictModeLifecycleFixture = async () => {
  const { UserViewModel } = await import('/src/viewmodel/user/UserViewModel.js');
  const { useViewModel } = await import('/src/viewmodel/useViewModel.js');
  window.strictInstances = [];
  function StrictLifecycleComponent({ label }) {
    const bound = useViewModel(() => {
      const vm = new UserViewModel();
      vm.syncFromUser({ uid: 'user_strict_1', email: 'strict@test.app' });
      window.strictInstances.push(vm);
      return vm;
    });
    window.strictViewModel = bound.viewModel;
    return h('div', { id: 'strict-lifecycle-fixture' },
      h('span', { id: 'strict-label' }, label),
      h('span', { id: 'user-uid' }, bound.uid || 'none'),
      h('span', { id: 'user-loading' }, String(bound.loading)),
      h('button', {
        id: 'trigger-set-state',
        onClick: () => bound.setState({ loading: true })
      }, 'SetState')
    );
  }
  function StrictFixtureContainer() {
    const [mounted, setMounted] = useState(true);
    const [label, setLabel] = useState('initial');
    window.rerenderStrictFixture = () => setLabel('updated');
    window.unmountStrictFixture = () => setMounted(false);
    return mounted ? h(StrictLifecycleComponent, { label }) : null;
  }
  root.render(h(StrictMode, { key: ++generation }, h(StrictFixtureContainer)));
};
window.mountAuthLifecycleFixture = async () => {
  const [{ AuthProvider, useAuth }, { AuthRepository }, authMock] = await Promise.all([
    import('/src/contexts/AuthContext.jsx'),
    import('/src/repository/auth/AuthRepository.js'),
    import('/scripts/fixtures/auth-session.js')
  ]);
  window.authMock = authMock;
  window.authMock.changeUser('A');
  const authRepository = new AuthRepository(authMock.authBackend, authMock.userRepository);
  function SessionState() {
    const context = useAuth();
    window.updateAuthProfile = context.updateUserProfile;
    return h('output', { id: 'auth-state' }, JSON.stringify({
      uid: context.user?.uid || null, profile: context.userProfile, loading: context.loading
    }));
  }
  function SessionFixture() {
    const [mounted, setMounted] = useState(true);
    window.unmountAuthFixture = () => setMounted(false);
    return mounted ? h(AuthProvider, { repository: authRepository }, h(SessionState)) : null;
  }
  root.render(h(StrictMode, { key: ++generation }, h(SessionFixture)));
};
function Fixture(config) {
  const [fixtureStats] = useState(() => stats);
  const [items, setItems] = useState(() => Array.from({length:config.initial}, (_, id) => ({id:id+1,title:'Film '+(id+1),name:'Person '+(id+1),role:'Regia'})));
  const [loading, setLoading] = useState(Boolean(config.loading));
  const [hasMore, setHasMore] = useState(config.hasMore !== false);
  window.finishLoading = () => setLoading(false);
  const onLoadMore = async () => {
    fixtureStats.calls++;
    fixtureStats.inFlight++;
    fixtureStats.maxInFlight = Math.max(fixtureStats.maxInFlight, fixtureStats.inFlight);
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, config.delay || 50));
    if (!config.noProgress) setItems(previous => [...previous, ...Array.from({length:config.batch || 1}, (_, index) => ({id:previous.length+index+1,title:'Film '+(previous.length+index+1),name:'Person '+(previous.length+index+1),role:'Regia'}))]);
    if (fixtureStats.calls >= (config.maxLoads ?? Infinity)) setHasMore(false);
    fixtureStats.inFlight--;
    setLoading(false);
  };
  const shared = {onLoadMore,hasMore,isLoadingMore:loading};
  const carousel = config.media
    ? h(MediaCarousel, {...shared,title:'Film',items})
    : config.cast ? h(CastCarousel, {...shared,title:'Registi',cast:items,limit:items.length,showRoles:config.showRoles})
    : h(Carousel, {...shared,header:h('h2',null,'Film'),itemCount:items.length},
        ...items.map(item => h('div',{key:item.id,'data-id':item.id,style:{flex:'0 0 150px',width:150,height:60,scrollSnapAlign:'start',scrollMarginInlineStart:item.id === 1 ? '12px' : undefined}},item.title)),
        loading && h('div',{className:'carousel-loading',style:{flex:'0 0 150px'}},'Loading'));
  return h('div',{className:config.cast ? 'carousel-page-padding' : undefined,style:{padding:config.cast ? undefined : '0 20px','--media-card-width':'150px'}},carousel);
}
window.mountFixture = config => {
  stats = {calls:0,inFlight:0,maxInFlight:0};
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(Fixture,config))));
};
window.mountTouchWidget = kind => {
  const widget = kind === 'seasons'
    ? h(TVSeasonSelection,{seasonsCount:30,onSelectSeason:()=>{}})
    : h(TrendingMediaCardSlider,{items:[1,2,3].map(id=>new Movie({id,title:'Swipe Film '+id,release_date:'2020-01-01'}))});
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,widget)));
};
window.mountTrendingEdgeFixture = () => {
  window.trendingRetries = 0;
  function TrendingEdgeFixture() {
    const [items, setItems] = useState(() => [1,2,3,4,5].map(id => new Movie({
      id,
      title:'Trend '+id,
      overview:'Trama estesa per Trend '+id,
      release_date:'2020-01-01'
    })));
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    window.setTrendingItems = setItems;
    window.setTrendingError = setError;
    window.navigateTrendingTest = navigate;
    return h(DeviceProvider,null,h(Routes,null,
      h(Route,{path:'/',element:h(TrendingMediaCardSlider,{
        items,
        type:'movie',
        error,
        onRetry:() => {
          window.trendingRetries++;
          setError(null);
          setItems([new Movie({id:99,title:'Recovered Trend',overview:'Trama recuperata',release_date:'2020-01-01'})]);
        }
      })}),
      h(Route,{path:'/Cameos/movie/:id',element:h('div',{id:'trending-detail-route'},'Detail Route')})
    ));
  }
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,{initialEntries:['/']},h(TrendingEdgeFixture))));
};
window.mountMoviesRetryAndRevisit = async () => {
  const [{default:Movies},viewModels,{cameoRepository},{AuthContext}] = await Promise.all([
    import('/src/pages/Movies.jsx'),import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/cameos/CameoRepository.js'),import('/src/contexts/AuthContext.jsx')]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedMovieViewModel();
  let failWar = true;
  let failCameos = true;
  window.moviesEdgeStats = { cameoCalls: 0, warCalls: 0 };
  window.recoverMoviesSections = () => { failWar = false; failCameos = false; };
  const media = (prefix, id) => new Movie({id,titles:{it:prefix+' IT '+id,en:prefix+' EN '+id},release_date:'2099-01-01',status:'Planned'});
  vm.repository = {
    getTrendingMovies: async () => ({results:[1,2].map(id => new Movie({id,titles:{it:'Trend IT '+id,en:'Trend EN '+id},release_date:'2020-01-01'}))}),
    getUpcomingMovies: async ({page}) => ({results:Array.from({length:12},(_,i)=>media('Upcoming',page*100+i)),page,total_pages:2}),
    getMoviesByCategory: async (key,{page}) => {
      if (key === 'war') {
        window.moviesEdgeStats.warCalls++;
        if (failWar) throw new Error('War unavailable');
      }
      return {results:Array.from({length:12},(_,i)=>media(key,page*100+i)),page,total_pages:2};
    }
  };
  const originalCameos = cameoRepository.getFamousCameos;
  cameoRepository.getFamousCameos = async ({page}) => {
    window.moviesEdgeStats.cameoCalls++;
    if (failCameos) throw new Error('Cameos unavailable');
    return {
      page,totalPages:2,hasMore:page<2,
      results:[new Cameo({id:page,mediaId:500+page,mediaType:'movie',name:'Actor '+page,character:'Self',mediaTitle:'Film IT '+page,mediaTitles:{it:'Film IT '+page,en:'Movie EN '+page}})]
    };
  };
  function MoviesContainer() {
    const [mounted, setMounted] = useState(true);
    const { setLanguage } = useTranslation();
    window.toggleMoviesMount = setMounted;
    window.switchMoviesLanguage = setLanguage;
    return mounted ? h(Movies) : h('div',{id:'other-page'},'Detail');
  }
  window.restoreMoviesEdge = () => {
    cameoRepository.getFamousCameos = originalCameos;
    viewModels.resetSharedViewModels();
  };
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,
    h(LanguageProvider,{userProfile:{language:'it'}},
      h(AuthContext.Provider,{value:{user:null,userProfile:null}},
        h(DeviceProvider,null,h(MoviesContainer)))))));
};
window.mountSeriesRetryAndRevisit = async () => {
  const [{default:TVSeries},viewModels,{cameoRepository},{AuthContext},{Series}] = await Promise.all([
    import('/src/pages/TVSeries.jsx'),import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/cameos/CameoRepository.js'),import('/src/contexts/AuthContext.jsx'),
    import('/src/models/Series.js')]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedSeriesViewModel();
  let failSoap = true;
  let failCameos = true;
  window.seriesEdgeStats = { cameoCalls: 0, soapCalls: 0 };
  window.recoverSeriesSections = () => { failSoap = false; failCameos = false; };
  const item = (prefix, id) => new Series({id,names:{it:prefix+' IT '+id,en:prefix+' EN '+id},first_air_date:'2099-01-01',status:'Planned'});
  vm.repository = {
    getTrendingSeries: async () => ({results:[1,2].map(id => new Series({id,names:{it:'Serie Trend IT '+id,en:'Series Trend EN '+id},first_air_date:'2020-01-01'}))}),
    getUpcomingSeries: async ({page}) => ({results:Array.from({length:12},(_,i)=>item('Upcoming',page*100+i)),page,total_pages:2}),
    getSeriesByCategory: async (key,{page}) => {
      if (key === 'soap') {
        window.seriesEdgeStats.soapCalls++;
        if (failSoap) throw new Error('Soap unavailable');
      }
      return {results:Array.from({length:12},(_,i)=>item(key,page*100+i)),page,total_pages:2};
    }
  };
  const originalCameos = cameoRepository.getFamousCameos;
  cameoRepository.getFamousCameos = async ({page}) => {
    window.seriesEdgeStats.cameoCalls++;
    if (failCameos) throw new Error('Cameos unavailable');
    return {
      page,totalPages:2,hasMore:page<2,
      results:[new Cameo({id:page,mediaId:600+page,mediaType:'movie',name:'Actor '+page,character:'Self',mediaTitle:'Film IT '+page,mediaTitles:{it:'Film IT '+page,en:'Movie EN '+page}})]
    };
  };
  function SeriesContainer() {
    const [mounted, setMounted] = useState(true);
    const { setLanguage } = useTranslation();
    window.toggleSeriesMount = setMounted;
    window.switchSeriesLanguage = setLanguage;
    return mounted ? h(TVSeries) : h('div',{id:'other-page'},'Detail');
  }
  window.restoreSeriesEdge = () => {
    cameoRepository.getFamousCameos = originalCameos;
    viewModels.resetSharedViewModels();
  };
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,
    h(LanguageProvider,{userProfile:{language:'it'}},
      h(AuthContext.Provider,{value:{user:null,userProfile:null}},
        h(DeviceProvider,null,h(SeriesContainer)))))));
};
window.mountCameoCard = variant => {
  // The card receives the normalized object supplied by the ViewModel; it only presents its fields.
  const cameo = new Cameo({id:42,name:'Guest',character:'Self (uncredited)',role:'Brief appearance',
    mediaId:7,mediaType:'tv',mediaTitle:'Test Series'});
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(CameoCard,{cameo,variant}))));
};
window.mountSeason = (count, loading = false) => {
  const episodes = Array.from({length:count}, (_, i) => ({id:i+1,episodeNumber:i+1,name:'Episodio '+(i+1),
    overview:'Trama di prova per verificare la disposizione degli episodi.',airDate:'2026-01-01',voteAverage:8,runtime:45}));
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,
    h(AuthContext.Provider,{value:{user:null,userProfile:null,loading:false}},h(DeviceProvider,null,
      h('main',{style:{padding:'0 20px'}},
        h(TVSeasonsSection,{series:{id:1,numberOfSeasons:1},currentSeason:{episodes},isLoadingEpisodes:loading,className:'mb-5'}),
        h(CastCarousel,{cast:[{id:1,name:'Attore'}],title:'Cast Principale'})))))));
};
window.seasonGeometry = () => {
  const area = document.querySelector('.tv-episodes-content-area');
  const track = document.querySelector('.tv-episodes-scroll-container');
  const cast = document.querySelector('.responsive-carousel');
  const padBottom = track ? (parseFloat(getComputedStyle(track).paddingBottom) || 0) : 0;
  return {height:area.clientHeight,limit:parseFloat(getComputedStyle(area).maxHeight),
    gap:Math.round(cast.getBoundingClientRect().top-area.getBoundingClientRect().bottom),
    unused:track ? area.getBoundingClientRect().bottom-Math.min(track.getBoundingClientRect().bottom,track.lastElementChild.getBoundingClientRect().bottom+padBottom) : 0,
    scrollable:track ? track.scrollHeight>track.clientHeight : false};
};
window.mountMovieDetailEdge = async (mode = 'error', initialEntry = '/movie/777') => {
  const [
    { default: MovieDetail },
    viewModels,
    { cameoRepository },
    { reviewRepository },
    { AuthContext },
    { NetworkProvider },
    { MediaStats }
  ] = await Promise.all([
    import('/src/pages/MovieDetail.jsx'),
    import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/cameos/CameoRepository.js'),
    import('/src/repository/reviews/ReviewRepository.js'),
    import('/src/contexts/AuthContext.jsx'),
    import('/src/contexts/NetworkContext.jsx'),
    import('/src/models/MediaStats.js')
  ]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedMovieViewModel();
  const originalRepo = vm.repository;
  const originalCameos = cameoRepository.getMovieCameos;
  const originalStats = reviewRepository.getMediaStats;
  let currentMode = mode;
  window.movieDetailEdgeStats = { detailCalls: [], cameoCalls: [] };
  window.setMovieDetailMode = (nextMode) => { currentMode = nextMode; };

  const svgBg = (color) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18"><rect width="32" height="18" fill="' + color + '"/></svg>');
  const rawSerializedProviders = JSON.parse(JSON.stringify(new Movie({
    id: 777,
    watchProviders: { IT: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '' }] } }
  }).watchProviders));

  const buildMovie = () => new Movie({
    id: 777,
    titles: { it: 'Film Dettaglio IT', en: 'Detail Movie EN' },
    taglines: { it: 'Tagline IT', en: 'Tagline EN' },
    overviews: { it: 'Trama completa in italiano.', en: 'Full overview in English.' },
    release_date: '2024-05-10',
    runtime: 135,
    budget: 120_000_000,
    revenue: 0,
    status: 'Released',
    genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }],
    backdropUrl: { it: svgBg('#112233'), en: svgBg('#332211') },
    posterUrl: { it: svgBg('#223344'), en: svgBg('#443322') },
    watchProviders: rawSerializedProviders,
    cast: [
      { id: 1, name: 'Attore Principale', character: 'Himself', order: 0, popularity: 90 },
      { id: 2, name: 'Co-star 2', character: 'Role 2', order: 1, popularity: 50 },
      { id: 3, name: 'Co-star 3', character: 'Role 3', order: 2, popularity: 40 },
      { id: 4, name: 'Co-star 4', character: 'Role 4', order: 3, popularity: 35 },
      { id: 5, name: 'Co-star 5', character: 'Role 5', order: 4, popularity: 30 },
      { id: 6, name: 'Co-star 6', character: 'Role 6', order: 5, popularity: 25 },
      { id: 7, name: 'Co-star 7', character: 'Role 7', order: 6, popularity: 20 },
      { id: 8, name: 'Co-star 8', character: 'Role 8', order: 7, popularity: 15 },
      { id: 99, name: 'Star Cameo', character: 'Himself (uncredited)', order: 12, popularity: 28 }
    ],
    crew: [{ id: 20, name: 'Regista Test', job: 'Director', department: 'Directing' }]
  });

  vm.repository = {
    getMovieDetails: async (params) => {
      window.movieDetailEdgeStats.detailCalls.push(params);
      if (currentMode === 'error') throw new Error('Network offline');
      if (currentMode === 'not-found') return null;
      return buildMovie();
    }
  };
  cameoRepository.getMovieCameos = async (params) => {
    window.movieDetailEdgeStats.cameoCalls.push(params);
    return { movie: buildMovie(), cameos: [] };
  };
  reviewRepository.getMediaStats = async () => new MediaStats({ mediaType: 'movie', mediaId: 777 });

  function MovieDetailContainer() {
    const { setLanguage } = useTranslation();
    window.switchMovieDetailLanguage = setLanguage;
    return h(Routes, null, h(Route, { path: '/movie/:id', element: h(MovieDetail) }));
  }

  window.restoreMovieDetailEdge = () => {
    vm.repository = originalRepo;
    cameoRepository.getMovieCameos = originalCameos;
    reviewRepository.getMediaStats = originalStats;
    viewModels.resetSharedViewModels();
  };

  root.render(h(StrictMode, { key: ++generation }, h(MemoryRouter, { initialEntries: [initialEntry] },
    h(NetworkProvider, null,
      h(LanguageProvider, { userProfile: { language: 'it' } },
        h(AuthContext.Provider, { value: { user: null, userProfile: null, loading: false } },
          h(DeviceProvider, null, h(MovieDetailContainer))))))));
};
window.mountTrailerNetworkEdge = async () => {
  const [{ default: MediaTrailerCard }, { NetworkProvider }] = await Promise.all([
    import('/src/components/media/MediaTrailerCard.jsx'),
    import('/src/contexts/NetworkContext.jsx')
  ]);
  const media = new Movie({
    id: 888,
    titles: { it: 'Film Trailer', en: 'Trailer Movie' },
    videos: {
      it: [{ key: 'abc12345', site: 'YouTube', type: 'Trailer', official: true, name: 'Official Trailer' }]
    }
  });
  root.render(h(StrictMode, { key: ++generation },
    h(NetworkProvider, null,
      h(LanguageProvider, { userProfile: { language: 'it' } },
        h(DeviceProvider, null, h(MediaTrailerCard, { media }))))));
};
window.mountSeriesDetailEdge = async (mode = 'error', initialEntry = '/series/888') => {
  const [
    { default: TVSeriesDetail },
    viewModels,
    { cameoRepository },
    { reviewRepository },
    { AuthContext },
    { NetworkProvider },
    { Series },
    { Season },
    { Episode },
    { MediaStats }
  ] = await Promise.all([
    import('/src/pages/TVSeriesDetail.jsx'),
    import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/cameos/CameoRepository.js'),
    import('/src/repository/reviews/ReviewRepository.js'),
    import('/src/contexts/AuthContext.jsx'),
    import('/src/contexts/NetworkContext.jsx'),
    import('/src/models/Series.js'),
    import('/src/models/Season.js'),
    import('/src/models/Episode.js'),
    import('/src/models/MediaStats.js')
  ]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedSeriesViewModel();
  const originalRepo = vm.repository;
  const originalSeriesCameos = cameoRepository.getSeriesCameos;
  const originalStats = reviewRepository.getMediaStats;
  let currentMode = mode;
  window.seriesDetailEdgeStats = { detailCalls: [], seasonCalls: [], seriesCameoCalls: [], episodeCalls: [] };
  window.setSeriesDetailMode = (nextMode) => { currentMode = nextMode; };

  const svgBg = (color) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18"><rect width="32" height="18" fill="' + color + '"/></svg>');
  const buildSeries = () => new Series({
    id: 888,
    names: { it: 'Serie Dettaglio IT', en: 'Detail Series EN' },
    taglines: { it: 'Tagline Serie IT', en: 'Series Tagline EN' },
    overviews: { it: 'Trama serie in italiano.', en: 'Full series plot in English.' },
    first_air_date: '2022-03-15',
    last_air_date: '2025-06-20',
    status: 'Returning Series',
    numberOfSeasons: 3,
    numberOfEpisodes: 25,
    genres: [{ id: 18, name: 'Drama' }, { id: 10765, name: 'Sci-Fi & Fantasy' }],
    backdropUrl: { it: svgBg('#112233'), en: svgBg('#332211') },
    posterUrl: { it: svgBg('#223344'), en: svgBg('#443322') },
    aggregate_credits: {
      cast: [
        { id: 1, name: 'Regular Lead', total_episode_count: 50, popularity: 95, roles: [{ character: 'Hero' }] },
        { id: 77, name: 'Guest Star', total_episode_count: 1, popularity: 30, roles: [{ character: 'Himself (uncredited)' }] }
      ]
    },
    created_by: [{ id: 5, name: 'Creator Test' }]
  });

  vm.repository = {
    getSeriesDetails: async (params) => {
      window.seriesDetailEdgeStats.detailCalls.push(params);
      if (currentMode === 'error') throw new Error('Series network offline');
      if (currentMode === 'not-found') return null;
      return buildSeries();
    },
    getSeasonDetails: async (params) => {
      window.seriesDetailEdgeStats.seasonCalls.push(params);
      const seasonNum = Number(params.seasonNumber);
      const isMultiEpisodeSeason = seasonNum >= 2;
      if (isMultiEpisodeSeason) {
        await new Promise((resolve) => setTimeout(resolve, 140));
      }
      return new Season({
        seriesId: params.seriesId,
        seasonNumber: params.seasonNumber,
        videos: seasonNum === 2
          ? { it: [{ key: 's2trailer', site: 'YouTube', type: 'Trailer', official: true, name: 'Season 2 Trailer' }] }
          : {},
        episodes: isMultiEpisodeSeason
          ? Array.from({ length: 12 }, (_, idx) => ({
              id: seasonNum * 100 + idx + 1,
              episodeNumber: idx + 1,
              names: { it: 'Episodio S' + seasonNum + '-' + (idx + 1) + ' IT', en: 'Episode S' + seasonNum + '-' + (idx + 1) + ' EN' },
              overviews: { it: 'Trama S' + seasonNum + ' IT', en: 'Plot S' + seasonNum + ' EN' },
              airDate: '2024-01-01',
              voteAverage: 8.5,
              runtime: 48
            }))
          : [
              { id: 101, episodeNumber: 1, names: { it: 'Pilota IT', en: 'Pilot EN' }, overviews: { it: 'Trama pilota IT', en: 'Pilot plot EN' } }
            ]
      });
    },
    getEpisodeDetails: async (params) => {
      window.seriesDetailEdgeStats.episodeCalls.push(params);
      return new Episode({
        ...params,
        id: 101,
        names: { it: 'Pilota Arricchito IT', en: 'Enriched Pilot EN' },
        overviews: { it: 'Trama arricchita IT', en: 'Enriched plot EN' },
        airDate: '2022-03-15',
        voteAverage: 8.7,
        runtime: 52
      });
    }
  };
  cameoRepository.getSeriesCameos = async (params) => {
    window.seriesDetailEdgeStats.seriesCameoCalls.push(params);
    return [];
  };
  reviewRepository.getMediaStats = async () => new MediaStats({ mediaType: 'tv', mediaId: 888 });

  function SeriesDetailContainer() {
    const { setLanguage } = useTranslation();
    window.switchSeriesDetailLanguage = setLanguage;
    return h(Routes, null,
      h(Route, { path: '/series/:id', element: h(TVSeriesDetail) }),
      h(Route, { path: '/series/:id/season/:seasonNumber', element: h(TVSeriesDetail) })
    );
  }

  window.restoreSeriesDetailEdge = () => {
    vm.repository = originalRepo;
    cameoRepository.getSeriesCameos = originalSeriesCameos;
    reviewRepository.getMediaStats = originalStats;
    viewModels.resetSharedViewModels();
  };

  root.render(h(StrictMode, { key: ++generation }, h(MemoryRouter, { initialEntries: [initialEntry] },
    h(NetworkProvider, null,
      h(LanguageProvider, { userProfile: { language: 'it' } },
        h(AuthContext.Provider, { value: { user: null, userProfile: null, loading: false } },
          h(DeviceProvider, null, h(SeriesDetailContainer))))))));
};
window.mountEpisodeDetailEdge = async (mode = 'error', initialEntry = '/series/888/season/3/episode/16') => {
  const [
    { default: TVSeriesEpisodeDetail },
    viewModels,
    { reviewRepository },
    { AuthContext },
    { NetworkProvider },
    { Episode },
    { MediaStats }
  ] = await Promise.all([
    import('/src/pages/TVSeriesEpisodeDetail.jsx'),
    import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/reviews/ReviewRepository.js'),
    import('/src/contexts/AuthContext.jsx'),
    import('/src/contexts/NetworkContext.jsx'),
    import('/src/models/Episode.js'),
    import('/src/models/MediaStats.js')
  ]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedSeriesViewModel();
  const originalRepo = vm.repository;
  const originalStats = reviewRepository.getMediaStats;
  let currentMode = mode;
  window.episodeDetailEdgeStats = { episodeCalls: [] };
  window.setEpisodeDetailMode = (nextMode) => { currentMode = nextMode; };

  const svgStill = (color) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="18"><rect width="32" height="18" fill="' + color + '"/></svg>');
  const buildEpisode = (params) => new Episode({
    id: 901,
    seriesId: params.seriesId,
    seasonNumber: params.seasonNumber,
    episodeNumber: params.episodeNumber,
    names: { it: 'Episodio Dettaglio IT', en: 'Episode Detail EN' },
    overviews: { it: 'Trama completa episodio in italiano.', en: 'Complete episode plot in English.' },
    airDate: '2010-03-01',
    runtime: 75,
    voteAverage: 8.8,
    voteCount: 42,
    stillUrl: { it: svgStill('#112233'), en: svgStill('#332211') },
    cast: [{ id: 1, name: 'Regular Actor', character: 'Sheldon' }],
    crew: [
      { id: 10, name: 'Director Ep', job: 'Director', department: 'Directing' },
      { id: 20, name: 'Writer Ep', job: 'Teleplay', department: 'Writing' }
    ],
    cameos: [{ id: 7624, name: 'Stan Lee', character: 'Himself (uncredited)', isCameoHighlight: true }]
  });

  vm.repository = {
    getEpisodeDetails: async (params) => {
      window.episodeDetailEdgeStats.episodeCalls.push(params);
      if (currentMode === 'error') throw new Error('Episode network offline');
      if (currentMode === 'not-found') return null;
      return buildEpisode(params);
    }
  };
  reviewRepository.getMediaStats = async () => new MediaStats({ mediaType: 'episode', mediaId: 901 });

  function EpisodeDetailContainer() {
    const { setLanguage } = useTranslation();
    window.switchEpisodeDetailLanguage = setLanguage;
    return h(Routes, null,
      h(Route, { path: '/series/:id/season/:seasonNumber/episode/:episodeNumber', element: h(TVSeriesEpisodeDetail) })
    );
  }

  window.restoreEpisodeDetailEdge = () => {
    vm.repository = originalRepo;
    reviewRepository.getMediaStats = originalStats;
    viewModels.resetSharedViewModels();
  };

  root.render(h(StrictMode, { key: ++generation }, h(MemoryRouter, { initialEntries: [initialEntry] },
    h(NetworkProvider, null,
      h(LanguageProvider, { userProfile: { language: 'it' } },
        h(AuthContext.Provider, { value: { user: null, userProfile: null, loading: false } },
          h(DeviceProvider, null, h(EpisodeDetailContainer))))))));
};
window.mountSeriesDetail = async () => {
  const [{default:TVSeriesDetail},{getSharedSeriesViewModel},{cameoRepository},{AuthContext},{Series},{Season}] = await Promise.all([
    import('/src/pages/TVSeriesDetail.jsx'),import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/cameos/CameoRepository.js'),import('/src/contexts/AuthContext.jsx'),
    import('/src/models/Series.js'),import('/src/models/Season.js')]);
  const vm = getSharedSeriesViewModel();
  const originalRepository = vm.repository;
  const originalCameos = cameoRepository.getSeriesCameos;
  vm.clearSelection();
  vm.repository = {
    getSeriesDetails:async () => new Series({id:987654321,name:'Serie di prova',numberOfSeasons:2,cast:[{id:1,name:'Attore'}]}),
    getSeasonDetails:async ({seriesId,seasonNumber}) => {
      await new Promise(resolve => setTimeout(resolve,100));
      return new Season({seriesId,seasonNumber,episodes:[{id:seasonNumber,episodeNumber:1,name:'Stagione '+seasonNumber,
        overview:'Episodio di prova',airDate:'2026-01-01',voteAverage:8}]});
    }
  };
  cameoRepository.getSeriesCameos = async () => [];
  window.restoreDetailRepositories = () => {
    vm.repository = originalRepository;
    cameoRepository.getSeriesCameos = originalCameos;
    vm.clearSelection();
  };
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,{initialEntries:['/series/987654321']},
    h(AuthContext.Provider,{value:{user:null,userProfile:null}},h(DeviceProvider,null,
      h(Routes,null,h(Route,{path:'/series/:id',element:h(TVSeriesDetail)})))))));
};
window.mountAppDetail = async () => {
  const [{default:App},viewModels,{cameoRepository},{AuthContext},{Series},{Season},{Episode}] = await Promise.all([
    import('/src/App.jsx'),import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/cameos/CameoRepository.js'),import('/src/contexts/AuthContext.jsx'),
    import('/src/models/Series.js'),import('/src/models/Season.js'),import('/src/models/Episode.js')]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedSeriesViewModel();
  const originalRepository = vm.repository;
  const originalCameos = cameoRepository.getSeriesCameos;
  window.episodeRequested = false;
  window.failSeason = false;
  window.emptySeason = false;
  vm.repository = {
    getSeriesDetails:async ({seriesId}) => new Series({id:seriesId,name:'Serie '+seriesId,numberOfSeasons:2}),
    getSeasonDetails:async ({seriesId,seasonNumber}) => {
      await new Promise(resolve => setTimeout(resolve,100));
      if (window.failSeason) throw new Error('Season unavailable');
      return new Season({seriesId,seasonNumber,episodes:window.emptySeason ? [] : [{
        id:Number(seriesId)+Number(seasonNumber),episodeNumber:1,name:'Stagione '+seasonNumber,overview:'Trama di prova'}]});
    },
    getEpisodeDetails:async params => {
      window.episodeRequested = true;
      await new Promise(resolve => { window.finishEpisode = resolve; });
      return new Episode({...params,id:1,name:'Dettagli episodio',airDate:'2026-01-01',voteAverage:8,runtime:45});
    }
  };
  cameoRepository.getSeriesCameos = async () => [];
  window.restoreAppDetailRepositories = () => {
    vm.repository = originalRepository;
    cameoRepository.getSeriesCameos = originalCameos;
    viewModels.resetSharedViewModels();
  };
  function AppFixture() {
    window.navigateAppDetail = useNavigate();
    return h(App);
  }
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,{initialEntries:['/Cameos/series/987654321']},
    h(AuthContext.Provider,{value:{user:null,userProfile:null,loading:false}},
      h(DeviceProvider,null,h(AppFixture))))));
};
window.mountHome = async (kind, fail = false, blockedCategory = kind === 'movie' ? 'war' : 'soap') => {
  const [{default:Home},viewModels,{cameoRepository},{AuthContext},{Series}] = await Promise.all([
    kind === 'movie' ? import('/src/pages/Movies.jsx') : import('/src/pages/TVSeries.jsx'),
    import('/src/viewmodel/useViewModel.js'),import('/src/repository/cameos/CameoRepository.js'),
    import('/src/contexts/AuthContext.jsx'),import('/src/models/Series.js')]);
  await import('/src/index.css');
  document.body.classList.add('background-color');
  viewModels.resetSharedViewModels();
  const vm = kind === 'movie' ? viewModels.getSharedMovieViewModel() : viewModels.getSharedSeriesViewModel();
  const categoryGate = new Promise(resolve => { window.finishHomeCategory = resolve; });
  const cameoGate = new Promise(resolve => { window.finishHomeCameos = resolve; });
  const fillGate = new Promise(resolve => { window.finishHomeFill = resolve; });
  const imageGate = new Promise(resolve => { window.finishHomeImages = resolve; });
  const NativeImage = window.Image;
  window.Image = class extends NativeImage { decode() { window.homeStats.imageCalls++; return Promise.all([super.decode(),imageGate]); } };
  window.homeStats = {fillCalls:0,initialCalls:0,imageCalls:0};
  const media = id => kind === 'movie'
    ? new Movie({id,title:'Home Film '+id,release_date:'2099-01-01',status:'Planned'})
    : new Series({id,name:'Home Serie '+id,first_air_date:'2099-01-01'});
  const category = async (key,{page}) => {
    if (key === blockedCategory) {
      await categoryGate;
      if (fail) throw new Error('Category fixture unavailable');
    }
    return {results:Array.from({length:12},(_,index)=>media(page*100+index)),page,total_pages:20};
  };
  const upcoming = async ({page}) => {
    if (page > 2) {
      window.homeStats.fillCalls++;
      await fillGate;
      await new Promise(resolve => setTimeout(resolve,40));
    } else window.homeStats.initialCalls++;
    return {results:[media(page)],page,total_pages:30};
  };
  const trending = async () => ({results:[1,2,3].map(id=>kind === 'movie'
    ? new Movie({id,title:'Home Film '+id,release_date:'2020-01-01'})
    : new Series({id,name:'Home Serie '+id,first_air_date:'2020-01-01'}))});
  vm.repository = kind === 'movie'
    ? {getMoviesByCategory:category,getUpcomingMovies:upcoming,getTrendingMovies:trending}
    : {getSeriesByCategory:category,getUpcomingSeries:upcoming,getTrendingSeries:trending};
  const originalCameos = cameoRepository.getFamousCameos;
  cameoRepository.getFamousCameos = async ({page}) => {
    await cameoGate;
    if (fail) throw new Error('Cameo fixture unavailable');
    return {results:[],page,total_pages:2};
  };
  window.restoreHome = () => {
    document.body.classList.remove('background-color');
    window.Image = NativeImage;
    cameoRepository.getFamousCameos = originalCameos;
    viewModels.resetSharedViewModels();
  };
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,
    h(AuthContext.Provider,{value:{user:null,userProfile:null}},h(DeviceProvider,null,h(Home))))));
};
window.mountCategory = async kind => {
  const [{default:Category},viewModels,{Series}] = await Promise.all([
    kind === 'movie' ? import('/src/pages/MovieCategory.jsx') : import('/src/pages/TVSeriesCategory.jsx'),
    import('/src/viewmodel/useViewModel.js'),import('/src/models/Series.js')]);
  viewModels.resetSharedViewModels();
  const vm = kind === 'movie' ? viewModels.getSharedMovieViewModel() : viewModels.getSharedSeriesViewModel();
  let failing = true;
  window.recoverCategory = () => { failing = false; };
  vm.repository = {[kind === 'movie' ? 'getMoviesByCategory' : 'getSeriesByCategory']:async () => {
    if (failing) throw new Error('Category unavailable');
    return {page:1,total_pages:1,results:[kind === 'movie' ? new Movie({id:1,title:'Recovered'}) : new Series({id:1,name:'Recovered'})]};
  }};
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,{initialEntries:[kind === 'movie' ? '/category/action' : '/category/crime']},
    h(Routes,null,h(Route,{path:'/category/:category',element:h(Category)})))));
};
window.mountMovieCategoryEdge = async (mode = 'error-initial', initialEntry = '/movies/category/action') => {
  const [{ default: MovieCategory }, viewModels] = await Promise.all([
    import('/src/pages/MovieCategory.jsx'),
    import('/src/viewmodel/useViewModel.js')
  ]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedMovieViewModel();
  const originalRepo = vm.repository;
  let currentMode = mode;
  window.movieCategoryEdgeStats = { calls: [] };
  window.setMovieCategoryMode = (nextMode) => { currentMode = nextMode; };

  vm.repository = {
    getMoviesByCategory: async (categoryKey, params) => {
      window.movieCategoryEdgeStats.calls.push({ categoryKey, ...params });
      const page = params?.page || 1;
      if (currentMode === 'error-initial' && page === 1) {
        throw new Error('Initial category failure');
      }
      if (currentMode === 'empty-page1' && page === 1) {
        return { page: 1, total_pages: 2, results: [] };
      }
      if (currentMode === 'error-page3' && page === 3) {
        throw new Error('Append page 3 failure');
      }
      return {
        page,
        total_pages: 3,
        results: [
          new Movie({
            id: page * 100 + 1,
            titles: { it: 'Film ' + page + ' IT', en: 'Movie ' + page + ' EN' },
            release_date: '2024-01-01',
            vote_average: 7.5
          })
        ]
      };
    }
  };

  function MovieCategoryContainer() {
    const { setLanguage } = useTranslation();
    window.switchMovieCategoryLanguage = setLanguage;
    return h(Routes, null, h(Route, { path: '/movies/category/:category', element: h(MovieCategory) }));
  }

  window.restoreMovieCategoryEdge = () => {
    vm.repository = originalRepo;
    viewModels.resetSharedViewModels();
  };

  root.render(h(StrictMode, { key: ++generation }, h(MemoryRouter, { initialEntries: [initialEntry] },
    h(LanguageProvider, { userProfile: { language: 'it' } }, h(MovieCategoryContainer)))));
};
window.mountSeriesCategoryEdge = async (mode = 'error-initial', initialEntry = '/series/category/drama') => {
  const [{ default: TVSeriesCategory }, viewModels, { Series }] = await Promise.all([
    import('/src/pages/TVSeriesCategory.jsx'),
    import('/src/viewmodel/useViewModel.js'),
    import('/src/models/Series.js')
  ]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedSeriesViewModel();
  const originalRepo = vm.repository;
  let currentMode = mode;
  window.seriesCategoryEdgeStats = { calls: [] };
  window.setSeriesCategoryMode = (nextMode) => { currentMode = nextMode; };

  vm.repository = {
    getSeriesByCategory: async (categoryKey, params) => {
      window.seriesCategoryEdgeStats.calls.push({ categoryKey, ...params });
      const page = params?.page || 1;
      if (currentMode === 'error-initial' && page === 1) {
        throw new Error('Initial series category failure');
      }
      if (currentMode === 'empty-page1' && page === 1) {
        return { page: 1, total_pages: 2, results: [] };
      }
      if (currentMode === 'error-page3' && page === 3) {
        throw new Error('Append series page 3 failure');
      }
      return {
        page,
        total_pages: 3,
        results: [
          new Series({
            id: page * 100 + 1,
            names: { it: 'Serie ' + page + ' IT', en: 'Series ' + page + ' EN' },
            first_air_date: '2024-01-01',
            vote_average: 8.2
          })
        ]
      };
    }
  };

  function SeriesCategoryContainer() {
    const { setLanguage } = useTranslation();
    window.switchSeriesCategoryLanguage = setLanguage;
    return h(Routes, null, h(Route, { path: '/series/category/:category', element: h(TVSeriesCategory) }));
  }

  window.restoreSeriesCategoryEdge = () => {
    vm.repository = originalRepo;
    viewModels.resetSharedViewModels();
  };

  root.render(h(StrictMode, { key: ++generation }, h(MemoryRouter, { initialEntries: [initialEntry] },
    h(LanguageProvider, { userProfile: { language: 'it' } }, h(SeriesCategoryContainer)))));
};
window.mountSearchEdge = async (mode = 'ok', initialEntry = '/Cameos/search?q=dram&filter=all') => {
  const [{ default: Search }, viewModels, { Movie }, { Series }] = await Promise.all([
    import('/src/pages/Search.jsx'),
    import('/src/viewmodel/useViewModel.js'),
    import('/src/models/Movie.js'),
    import('/src/models/Series.js')
  ]);
  viewModels.resetSharedViewModels();
  const vm = viewModels.getSharedSearchViewModel();
  const originalMedia = vm.media;
  const originalPeople = vm.people;
  let currentMode = mode;
  window.searchEdgeStats = { calls: [], consoleErrors: [] };
  window.setSearchEdgeMode = (nextMode) => { currentMode = nextMode; };
  const originalConsoleError = console.error;
  console.error = (...args) => {
    window.searchEdgeStats.consoleErrors.push(args.map(String).join(' '));
    originalConsoleError(...args);
  };

  const movieRepo = {
    getGenres: async (params = {}) => {
      window.searchEdgeStats.calls.push({ kind: 'genres', type: 'movie', ...params });
      if (currentMode === 'genre-error') throw new Error('Genre list unavailable');
      return { genres: [{ id: 18, name: 'Dramma' }] };
    },
    searchMovies: async (params = {}) => {
      window.searchEdgeStats.calls.push({ kind: 'media', type: 'movie', ...params });
      const page = params.page || 1;
      if (currentMode === 'filtered-empty-batch' && page <= 3) {
        return { page, total_pages: 4, results: [] };
      }
      return {
        page,
        total_pages: currentMode === 'filtered-empty-batch' ? 4 : 2,
        results: Array.from({ length: 12 }, (_, idx) => new Movie({
          id: page * 100 + idx + 1,
          titles: { it: 'Film P' + page + '-' + (idx + 1) + ' IT', en: 'Movie P' + page + '-' + (idx + 1) + ' EN' },
          release_date: '2024-01-01',
          vote_average: 8.1
        }))
      };
    }
  };
  const seriesRepo = {
    getGenres: async (params = {}) => {
      window.searchEdgeStats.calls.push({ kind: 'genres', type: 'tv', ...params });
      if (currentMode === 'genre-error') throw new Error('Genre list unavailable');
      return { genres: [{ id: 18, name: 'Dramma' }] };
    },
    searchSeries: async (params = {}) => {
      window.searchEdgeStats.calls.push({ kind: 'media', type: 'tv', ...params });
      return { page: params.page || 1, total_pages: 1, results: [] };
    }
  };
  vm.media = [
    { type: 'movie', repository: movieRepo, search: (params) => movieRepo.searchMovies(params), titleKey: 'nav.movies' },
    { type: 'tv', repository: seriesRepo, search: (params) => seriesRepo.searchSeries(params), titleKey: 'nav.tvSeries' }
  ];
  vm.people = {
    searchPeople: async (params = {}) => {
      window.searchEdgeStats.calls.push({ kind: 'people', ...params });
      const page = params.page || 1;
      return {
        page,
        total_pages: 2,
        results: Array.from({ length: 12 }, (_, idx) => ({
          id: page * 100 + idx + 1,
          name: 'Actor P' + page + '-' + (idx + 1),
          knownForDepartment: 'Acting'
        }))
      };
    }
  };
  window.searchEdgeVm = vm;

  function SearchEdgeContainer() {
    const { setLanguage } = useTranslation();
    const navigate = useNavigate();
    window.switchSearchEdgeLanguage = setLanguage;
    window.navigateSearchEdge = navigate;
    return h(Routes, null,
      h(Route, { path: '/Cameos/search', element: h(Search) }),
      h(Route, { path: '/Cameos/movie/:id', element: h('div', { id: 'search-edge-detail' }, 'Detail') }));
  }

  window.restoreSearchEdge = () => {
    console.error = originalConsoleError;
    vm.media = originalMedia;
    vm.people = originalPeople;
    viewModels.resetSharedViewModels();
  };

  root.render(h(StrictMode, { key: ++generation }, h(MemoryRouter, { initialEntries: [initialEntry] },
    h(LanguageProvider, { userProfile: { language: 'it' } }, h(SearchEdgeContainer)))));
};
window.mountTranslatedCards = async () => {
  const {Series} = await import('/src/models/Series.js');
  const movie = new Movie({id:1,titles:{it:'Film italiano',en:'English film'}});
  const series = new Series({id:2,names:{it:'Serie italiana',en:'English series'}});
  function Cards() {
    const {setLanguage} = useTranslation();
    window.changeCardLanguage = setLanguage;
    return h('div',null,h(MediaCarousel,{title:'Film',items:[movie]}),
      h(MediaCarousel,{title:'Series',items:[series],type:'tv'}));
  }
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,
    h(LanguageProvider,{userProfile:{language:'it'}},h(Cards)))));
};
window.mountFilmography = () => {
  const credits = Array.from({length:30},(_,index) => ({id:index+1,title:'Credit '+(index+1),mediaType:'movie'}));
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(PersonFilmography,{credits}))));
};
window.mountSingleRowFilmography = () => {
  const acting = [
    { id: 99, name: 'Smallville', mediaType: 'tv', first_air_date: '2001-10-16', episode_count: 217, episodeCount: 217, character: 'Clark Kent' }
  ];
  const credits = [
    { id: 1, name: 'Smallville', mediaType: 'tv', first_air_date: '2001-10-16', episodeCount: 7, creditRoleKeys: ['detail.directing'] },
    {
      id: 2,
      name: 'Breaking Bad',
      mediaType: 'tv',
      first_air_date: '2008-01-20',
      creditRoleKeys: ['detail.directing', 'detail.writing'],
      creditRoleCounts: { 'detail.directing': 5, 'detail.writing': 13 }
    },
    ...Array.from({ length: 4 }, (_, index) => ({
      id: index + 3,
      title: 'Directed ' + (index + 3),
      mediaType: 'movie',
      creditRoleKeys: ['detail.directing', 'detail.writing']
    }))
  ];
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,
    h(LanguageProvider,{userProfile:{language:'it'}},
      h(React.Fragment,null,
        h(PersonFilmography,{credits:acting}),
        h(PersonFilmography,{credits:[]}),
        h(PersonFilmography,{credits,title:'Regia e Sceneggiatura',rows:1}))))));
};
window.mountImageReadiness = () => {
  const NativeImage = window.Image;
  const images = [];
  window.Image = class { constructor() { images.push(this); } decode() { return Promise.resolve(); } };
  window.completeDetailImage = () => images.at(-1).onload();
  window.captureDetailImage = () => { window.completeStaleDetailImage = images.at(-1).onload; };
  window.restoreImageConstructor = () => { window.Image = NativeImage; };
  function Readiness() {
    const [source,setSource] = useState('https://example.test/first.jpg');
    window.changeDetailImage = setSource;
    const ready = useMovieImagesReady('same-media-id',source);
    return h('span',{id:'detail-image-ready'},String(ready));
  }
  root.render(h(StrictMode,{key:++generation},h(Readiness)));
};
window.mountTextFit = () => {
  function Heading() {
    const textRef = useRef(null);
    const [width,setWidth] = useState(300);
    const [text,setText] = useState('Una selezione speciale di film');
    useSingleLineFit(textRef,textRef,[text]);
    window.resizeFit = setWidth;
    window.changeFitText = setText;
    return h('div',{id:'fit-container',style:{width}},
      h('h3',{ref:textRef,className:'text-single-line',id:'fit-heading',style:{fontSize:32}},text),
      h(CarouselHeading,{title:text,subtitle:text,titleLink:'/Cameos/movies/category/action'}));
  }
  document.documentElement.style.fontSize = '24px';
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(Heading))));
};
window.verifyNativeCache = async () => {
  const [{IndexedDBService,STORES},{MovieRepository},{SeriesRepository},{Series}] = await Promise.all([
    import('/src/storage/IndexedDBService.js'),import('/src/repository/movies/MovieRepository.js'),
    import('/src/repository/series/SeriesRepository.js'),import('/src/models/Series.js')]);
  const dbName = 'cameos-native-cache-test-'+Date.now();
  const listStorage = new IndexedDBService({dbName});
  const detailStorage = new IndexedDBService({dbName});
  const results = [];
  try {
    await Promise.all([listStorage.open(),detailStorage.open()]);
    for (const [Model,Repository,store,discover,details] of [
      [Movie,MovieRepository,STORES.MOVIES,'discoverMovies','getMovieDetails'],
      [Series,SeriesRepository,STORES.SERIES,'discoverSeries','getSeriesDetails']]) {
      let startWrite,finishWrite;
      const started = new Promise(resolve => { startWrite = resolve; });
      const gate = new Promise(resolve => { finishWrite = resolve; });
      const originalPutMany = listStorage.putMany.bind(listStorage);
      listStorage.putMany = async (storeName,...args) => {
        if (storeName === store) { startWrite(); await gate; }
        return originalPutMany(storeName,...args);
      };
      const backend = {
        [discover]:async () => ({page:1,total_pages:1,results:[new Model({id:1,title:'List',name:'List'})]}),
        [details]:async () => new Model({id:1,title:'Detail',name:'Detail',cast:[{id:42,name:'Retained credits'}]})
      };
      const listRepo = new Repository(backend,listStorage);
      const detailRepo = new Repository(backend,detailStorage);
      const params = {movieId:1,seriesId:1,language:'en-US'};
      const list = listRepo[discover](params);
      await started;
      await detailRepo[details](params);
      finishWrite();
      await list;
      listRepo.setOnlineOverride(false);
      const offline = await listRepo[details](params);
      results.push({native:listStorage.isNativeIndexedDB,name:offline.cast[0]?.name,
        complete:(await listStorage.getAll(store))[0].isComplete});
      listStorage.putMany = originalPutMany;
    }
    // Conditional writes still insert new records and refresh incomplete ones.
    const record = {cacheKey:'summary-test',id:2,isComplete:false,data:{title:'Old'}};
    const options = {shouldReplace:existing => !existing?.isComplete};
    await listStorage.putMany(STORES.MOVIES,[record],options);
    await detailStorage.putMany(STORES.MOVIES,[{...record,data:{title:'Updated'}}],options);
    let batchRejected = false;
    try {
      await listStorage.putMany(STORES.MOVIES,[{cacheKey:'aborted-batch',data:{}},{cacheKey:{invalid:true},data:{}}]);
    } catch { batchRejected = true; }
    return {results,refreshed:(await listStorage.get(STORES.MOVIES,record.cacheKey)).data.title,
      batchRejected,batchRolledBack:!(await listStorage.get(STORES.MOVIES,'aborted-batch'))};
  } finally {
    listStorage.close();
    detailStorage.close();
    await new Promise((resolve,reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  }
};
window.snapshot = () => {
  const track = document.querySelector('.carousel-track');
  const cards = [...(track?.children || [])].filter(child => !child.classList.contains('carousel-loading'));
  const style = track && getComputedStyle(track);
  return {...stats,count:cards.length,scrollLeft:track?.scrollLeft,
    available:track?.clientWidth-(parseFloat(style?.paddingLeft)||0)-(parseFloat(style?.paddingRight)||0),
    occupied:cards.length ? cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left : 0,
    labels:cards.map(card=>card.innerText),nextEnabled:!document.querySelector('.carousel-navigation button:last-child')?.disabled};
};
</script><style>.carousel-track:not(.media-carousel-track):not(.cast-carousel-track){gap:10px;padding:0 12px}</style></body></html>`;

const chromePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const profile = await mkdtemp(join(tmpdir(), 'cameos-carousel-test-'));
const server = await createServer({
  root: projectPath,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
  plugins: [/** @type {import('vite').Plugin} */ ({ name: 'carousel-test-harness', enforce: 'pre',
  configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== harnessPath) {
        next();
        return;
      }
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml(harnessPath, html));
    });
  } })]
});
let chrome;
let socket;
const sleep = ms => new Promise(resolve => { setTimeout(resolve, ms); });
try {
  await server.listen();
  const port = server.httpServer.address().port;
  chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let launchError;
  chrome.on('error', error => { launchError = error; });
  let debugPort;
  for (let i = 0; i < 100 && !debugPort; i++) {
    if (launchError) throw launchError;
    await sleep(50);
    try { debugPort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { /* Chrome is starting. */ }
  }
  assert.ok(debugPort, 'Chrome must expose a debugging port');
  /** @type {{type: string, url: string, webSocketDebuggerUrl: string}[]} */
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page' && target.url === 'about:blank').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timed out: ${method}`)); }, 10000);
    pending.set(id, message => { clearTimeout(timeout); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text + ': ' + response.exceptionDetails.exception?.description);
    return response.result.value;
  };
  const viewport = width => send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  const until = async (expression, message) => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await sleep(20); }
    assert.fail(`${message}: ${JSON.stringify(await evaluate('window.snapshot?.()'))}`);
  };
  const mount = async (width, config) => {
    await viewport(width);
    await evaluate(`window.mountFixture(${JSON.stringify(config)})`);
    await until(`window.snapshot().count === ${config.initial}`, 'Fixture must render its initial cards');
  };
  /** @returns {Promise<{calls: number, inFlight: number, maxInFlight: number, count: number, scrollLeft: number, available: number, occupied: number, labels: string[], nextEnabled: boolean}>} */
  const stable = async () => { await sleep(250); return evaluate('window.snapshot()'); };
  const next = () => evaluate(`document.querySelector('.carousel-navigation button:last-child').click()`);
  await send('Page.enable');
  await viewport(1500);
  await send('Page.navigate', { url: `http://127.0.0.1:${port}${harnessPath}` });
  await until(`typeof window.mountFixture === 'function'`, 'React harness must load');

  await mount(1600, { initial: 5, batch: 2, media: true });
  await until('window.snapshot().calls === 3 && window.snapshot().inFlight === 0', 'Sparse media carousel must fetch enough cards');
  let state = await stable();
  assert.equal(state.count, 11);
  assert.ok(state.occupied >= state.available);
  assert.equal(state.maxInFlight, 1, 'StrictMode and resize notifications must not duplicate requests');
  assert.equal(state.scrollLeft, 0, 'Automatic fill must preserve the scroll position');
  assert.deepEqual(state.labels.map(label => label.split('\n').find(line => line.startsWith('Film '))), Array.from({ length: 11 }, (_, i) => `Film ${i + 1}`));
  console.log('PASS sparse MediaCarousel fills available width and preserves order/position');

  await mount(2048, { initial: 1, batch: 1, cast: true, showRoles: false });
  await until('window.snapshot().occupied >= window.snapshot().available && window.snapshot().inFlight === 0', 'Sparse director results must fill the viewport even when each page adds only one person');
  state = await stable();
  assert.ok(state.calls > 3);
  assert.equal(state.maxInFlight, 1);
  assert.equal(state.scrollLeft, 0);
  assert.equal(await evaluate(`document.querySelectorAll('.cast-card-character, .cast-card-roles-toggle').length`), 0);
  assert.deepEqual(state.labels.map(label => label.split('\n')[0]), Array.from({ length: state.count }, (_, i) => `Person ${i + 1}`));
  console.log('PASS sparse director CastCarousel continues beyond three loads and preserves order');

  await next();
  await until('window.snapshot().scrollLeft >= window.snapshot().available * 0.75 && window.snapshot().inFlight === 0', 'The first next click must reach a full new viewport after sparse pagination');
  state = await stable();
  assert.equal(state.maxInFlight, 1);
  assert.ok(state.scrollLeft < state.available * 1.25, 'Loading more results must not advance multiple viewports');
  console.log('PASS first next click advances a full viewport with sparse director pages');

  await mount(1000, { initial: 7, batch: 10, delay: 100 });
  await stable();
  await next();
  await next();
  await until('window.snapshot().scrollLeft >= window.snapshot().available * 0.75 && window.snapshot().inFlight === 0', 'Repeated clicks while loading must keep the first destination');
  state = await stable();
  assert.equal(state.calls, 1);
  assert.ok(state.scrollLeft < state.available * 1.25);
  console.log('PASS repeated next clicks keep one pending destination and request');

  await mount(1000, { initial: 7, batch: 10, loading: true });
  assert.equal((await stable()).nextEnabled, true);
  await next();
  assert.equal((await stable()).calls, 0, 'Navigation must wait for the existing request');
  await evaluate('window.finishLoading()');
  await until('window.snapshot().scrollLeft >= window.snapshot().available * 0.75 && window.snapshot().inFlight === 0', 'Navigation must resume after the existing load');
  assert.equal((await stable()).calls, 1);
  console.log('PASS next click waits for an existing in-flight load');

  await mount(1000, { initial: 7, batch: 2, maxLoads: 1 });
  await stable();
  await next();
  await until('window.snapshot().scrollLeft > 100 && window.snapshot().inFlight === 0 && !window.snapshot().nextEnabled', 'An exhausted source must show its remaining tail');
  assert.equal((await stable()).calls, 1);
  console.log('PASS final partial viewport stops at the real end of the list');

  await mount(375, { initial: 5, cast: true, hasMore: false });
  await stable();
  assert.equal(await evaluate(`document.querySelectorAll('.cast-card-character').length`), 5, 'Cast credits retain their character captions by default');
  console.log('PASS character captions remain available outside search results');

  await mount(375, { initial: 5, batch: 2 });
  assert.equal((await stable()).calls, 0, 'Mobile overflow needs no automatic fetch');
  await viewport(1200);
  await until('window.snapshot().calls === 2 && window.snapshot().inFlight === 0', 'Widening must fill the new viewport');
  state = await stable();
  assert.ok(state.occupied >= state.available);
  await viewport(375);
  assert.equal((await stable()).calls, 2, 'Narrowing needs no new results');
  console.log('PASS mobile overflow and responsive resizing');

  await mount(2400, { initial: 1 });
  await until('window.snapshot().calls === 14 && window.snapshot().inFlight === 0', 'Automatic loading must fill the missing visible slots');
  state = await stable();
  assert.equal(state.calls, 14, 'Automatic loading must stop once the viewport is filled');
  assert.equal(state.count, 15);
  assert.ok(state.nextEnabled, 'The user can continue after automatic filling');
  await next();
  await until('window.snapshot().calls > 14 && window.snapshot().inFlight === 0', 'Manual navigation must remain available');
  console.log('PASS bounded viewport filling and manual continuation');

  await mount(1200, { initial: 2, noProgress: true });
  await until('window.snapshot().calls === 1 && window.snapshot().inFlight === 0', 'An empty or failed page must settle');
  state = await stable();
  assert.equal(state.calls, 1, 'No progress must not cause automatic retries');
  assert.equal(state.count, 2);
  await next();
  await until('window.snapshot().calls === 2 && window.snapshot().inFlight === 0', 'Manual retry must still work');
  assert.equal((await stable()).calls, 2);
  console.log('PASS no-progress guard and manual retry');

  await mount(1200, { initial: 2, hasMore: false });
  state = await stable();
  assert.equal(state.calls, 0);
  assert.equal(state.nextEnabled, false);
  await mount(1200, { initial: 2, batch: 1, maxLoads: 1 });
  await until('window.snapshot().calls === 1 && window.snapshot().inFlight === 0', 'The last page must load');
  state = await stable();
  assert.equal(state.calls, 1);
  assert.equal(state.nextEnabled, false);
  console.log('PASS exhausted pages stop automatic loading');

  await mount(1200, { initial: 2, batch: 10, loading: true });
  assert.equal((await stable()).calls, 0);
  await evaluate('window.finishLoading()');
  await until('window.snapshot().calls === 1 && window.snapshot().inFlight === 0', 'Fill must resume after an existing load');
  assert.equal((await stable()).calls, 1);
  await mount(374, { initial: 2 });
  state = await stable();
  assert.equal(state.occupied, state.available);
  assert.equal(state.calls, 0, 'An exactly filled row must not fetch more');
  console.log('PASS in-flight loading and exact fit');

  const swipe = (selector, from, to) => evaluate(`(()=>{const target=document.querySelector(${JSON.stringify(selector)});for(const [type,point] of [['touchstart',${JSON.stringify(from)}],['touchmove',${JSON.stringify(to)}],['touchend',null]]){const event=new Event(type,{bubbles:true});Object.defineProperty(event,'touches',{value:point?[{clientX:point[0],clientY:point[1]}]:[]});target.dispatchEvent(event);}})()`);
  await viewport(375);
  await evaluate(`window.mountTouchWidget('seasons')`);
  await until(`document.querySelector('.tv-season-selection-track')?.scrollWidth > document.querySelector('.tv-season-selection-track')?.clientWidth`, 'Season pills must render a scrollable track');
  await swipe('.tv-season-selection-viewport', [280,100], [50,102]);
  await until(`document.querySelector('.tv-season-selection-track').scrollLeft > 50`, 'Season navigation must preserve horizontal swipe behavior');
  console.log('PASS shared touch helpers preserve season navigation');

  await evaluate(`window.mountTouchWidget('trending')`);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Swipe Film 1'`, 'Trending slider must render');
  await swipe('.trending-carousel-wrapper', [280,100], [50,102]);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Swipe Film 2'`, 'A left swipe must show the next trending film');
  await swipe('.trending-carousel-wrapper', [50,100], [280,102]);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Swipe Film 1'`, 'A right swipe must show the previous trending film');
  await swipe('.trending-carousel-wrapper', [100,100], [102,280]);
  await sleep(100);
  assert.equal(await evaluate(`document.querySelector('.trending-card-active .trending-card-title').textContent`), 'Swipe Film 1');
  console.log('PASS shared touch helpers preserve trending swipe direction and ignore vertical gestures');

  await viewport(1280);
  await send('Page.bringToFront');
  await evaluate('window.mountTrendingEdgeFixture()');
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Trend 1'`, 'Trending edge fixture mounts');
  assert.equal(await evaluate(`Boolean(document.querySelector('.trending-card-front p'))`), false, 'Front face must display only badges, title and detail button without plot');
  assert.equal(await evaluate(`document.querySelector('.trending-card-active').classList.contains('is-flipped')`), false, 'Card must default to front face');
  await evaluate(`window.initialTrendingCard = document.querySelector('.trending-card-active'); document.querySelector('.trending-card-active .trending-card-detail-link').focus();`);
  await evaluate(`document.querySelectorAll('.trending-dots button')[4].click()`);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Trend 5'`, 'Selecting fifth trending slide updates card');
  assert.equal(await evaluate('document.querySelector(".trending-card-active") === window.initialTrendingCard'), true, 'Changing slide must not remount the active card DOM node');
  await evaluate(`document.querySelector('.trending-card-active .trending-card-detail-link').focus(); window.setTrendingItems(prev => prev.slice(0, 2));`);
  await until(`document.querySelectorAll('.trending-dots button').length === 2`, 'Shrinking trending list updates dots');
  assert.equal(await evaluate(`document.querySelector('.trending-card-active .trending-card-title').textContent`), 'Trend 1', 'safeCurrentIndex must clamp out-of-bounds index when items shrink');
  assert.equal(await evaluate(`document.querySelector('.trending-dots button.active')?.getAttribute('aria-current')`), 'true', 'Active dot must stay aligned with safeCurrentIndex');
  assert.equal(await evaluate(`document.activeElement === document.querySelector('.trending-card-active .trending-card-detail-link')`), true, 'Keyboard focus on detail link must be preserved across updates');
  // Leaving mouse hover while keyboard focus stays inside the slider must keep auto-rotation paused
  await evaluate(`(() => {
    window._origTrendingInterval = window.setInterval;
    window._trendingIntervals = 0;
    window.setInterval = (callback, delay, ...args) => {
      if (delay === 7000) window._trendingIntervals += 1;
      return window._origTrendingInterval(callback, delay, ...args);
    };
    const wrapper = document.querySelector('.trending-carousel-wrapper');
    wrapper.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  })()`);
  await sleep(30);
  await evaluate(`document.querySelector('.trending-carousel-wrapper').dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))`);
  await sleep(50);
  try {
    assert.equal(await evaluate('window._trendingIntervals'), 0, 'Mouse leave must not restart auto-rotation while keyboard focus stays inside the slider');
    await evaluate(`document.querySelector('.trending-card-active .trending-card-detail-link').blur()`);
    await until('window._trendingIntervals >= 1', 'Blurring focus after mouse leave must resume auto-rotation');

    // Flip card to back face: timer must pause even when unfocused & mouse out; back displays title + plot + text link on dark bg
    await evaluate(`window._trendingIntervals = 0; document.querySelector('.trending-card-front .trending-card-flip-trigger').click()`);
    await until(`document.querySelector('.trending-card-active').classList.contains('is-flipped')`, 'Clicking front card must flip to back face');
    assert.equal(await evaluate(`Boolean(document.querySelector('.trending-card-front[inert][aria-hidden=true]'))`), true, 'Flipped front face must be inert and hidden from assistive tech');
    assert.equal(await evaluate(`Boolean(document.querySelector('.trending-card-back[inert]'))`), false, 'Visible back face must be interactive');
    assert.equal(await evaluate(`document.querySelector('.trending-card-back-title').textContent.trim()`), 'Trend 1');
    assert.equal(await evaluate(`document.querySelector('.trending-card-back-overview').textContent.trim()`), 'Trama estesa per Trend 1');
    const backTypography = await evaluate(`(() => {
      const titleStyle = getComputedStyle(document.querySelector('.trending-card-back-title'));
      const plotStyle = getComputedStyle(document.querySelector('.trending-card-back-overview'));
      return { titleSize: titleStyle.fontSize, plotSize: plotStyle.fontSize, sameColor: titleStyle.color === plotStyle.color };
    })()`);
    assert.equal(backTypography.titleSize, backTypography.plotSize, 'Back title and overview must share the same font size');
    assert.equal(backTypography.sameColor, false, 'Back title must use a distinct color from overview text');
    assert.equal(await evaluate(`document.querySelector('.trending-card-back-link').getAttribute('href')`), '/Cameos/movie/1');
    await evaluate(`document.activeElement?.blur?.(); document.querySelector('.trending-carousel-wrapper').dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))`);
    await sleep(60);
    assert.equal(await evaluate('window._trendingIntervals'), 0, 'Flipped card must keep auto-rotation timer paused even after blur and mouse leave');

    // Clicking lateral card shifts current flipped card to lateral and resets to front when returning to Main
    await evaluate(`document.querySelector('.trending-card-right').click()`);
    await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Trend 2'`, 'Clicking right lateral card selects next slide');
    assert.equal(await evaluate(`document.querySelector('.trending-card-active').classList.contains('is-flipped')`), false, 'Newly selected slide must show front face');
    assert.equal(await evaluate(`document.querySelector('.trending-card-left .trending-side-title')?.textContent`), 'Trend 1', 'Previously flipped card becomes left lateral preview');
    await evaluate(`document.querySelector('.trending-card-left').click()`);
    await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Trend 1'`, 'Clicking left lateral brings Trend 1 back to Main');
    assert.equal(await evaluate(`document.querySelector('.trending-card-active').classList.contains('is-flipped')`), false, 'Returning previously flipped card to Main must display front face');

    // Navigating to detail from back face and returning back must always restore front face
    await evaluate(`document.querySelector('.trending-card-front .trending-card-flip-trigger').click()`);
    await until(`document.querySelector('.trending-card-active').classList.contains('is-flipped')`, 'Trend 1 flips to back before detail navigation');
    await evaluate(`document.querySelector('.trending-card-back-link').click()`);
    await until(`Boolean(document.querySelector('#trending-detail-route'))`, 'Back text button must navigate to media detail route');
    await evaluate(`window.navigateTrendingTest(-1)`);
    await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Trend 1'`, 'Navigating back remounts trending slider');
    assert.equal(await evaluate(`document.querySelector('.trending-card-active').classList.contains('is-flipped')`), false, 'Returning from another page must always show front face');
  } finally {
    await evaluate(`if (window._origTrendingInterval) { window.setInterval = window._origTrendingInterval; delete window._origTrendingInterval; }`);
  }
  await evaluate(`window.setTrendingItems([]); window.setTrendingError('Trending unavailable');`);
  await until(`Boolean(document.querySelector('.trending-carousel-wrapper [role=alert]')) && Boolean(document.querySelector('.trending-carousel-wrapper button'))`, 'Trending error state must expose retry button');
  await evaluate(`document.querySelector('.trending-carousel-wrapper button').click()`);
  await until(`document.querySelector('.trending-card-active .trending-card-title')?.textContent === 'Recovered Trend'`, 'Trending retry button must recover slider');
  assert.equal(await evaluate('window.trendingRetries'), 1);
  console.log('PASS TrendingMediaCardSlider preserves DOM node/focus, 3D flip behavior, timer pause, lateral/back reset and retry recovery');

  for (const width of [2048, 1024, 375]) {
    await viewport(width);
    for (const count of [8, 30]) {
      await evaluate(`window.mountSeason(${count})`);
      await until(`document.querySelectorAll('.tv-episode-card').length === ${count}`, 'Season episodes must render');
      assert.equal(
        await evaluate(`Boolean(document.querySelector('.tv-episode-card .tv-episode-preferences'))`),
        false,
        'Episode preferences must remain hidden while the episode is collapsed'
      );
      await sleep(100);
      const geometry = await evaluate('window.seasonGeometry()');
      assert.ok(geometry.height <= geometry.limit, 'The episode list must respect its maximum height');
      assert.ok(geometry.unused <= 1, 'No reserved empty space may remain below a short season');
      assert.equal(geometry.gap, 48, 'The caller must control the margin between episodes and cast');
      assert.equal(geometry.scrollable, count === 30, 'Long seasons must retain internal scrolling');
      if (count === 8) {
        await evaluate(`document.querySelector('.tv-episode-collapse-btn').click()`);
        await sleep(300);
        assert.equal(
          await evaluate(`Boolean(document.querySelector('.tv-episode-card .tv-episode-preferences'))`),
          true,
          'Episode preferences must appear when the episode is expanded'
        );
        assert.equal(
          await evaluate(`document.querySelectorAll('.tv-episode-card .tv-episode-preferences button').length`),
          3,
          'Expanded episode preferences must include watchlist, favorites, and watched controls'
        );
        const expanded = await evaluate('window.seasonGeometry()');
        assert.ok(expanded.unused <= 1, 'Expanding an episode must keep the section fitted to its content');
        assert.equal(expanded.gap, 48);
      } else {
        assert.ok(await evaluate(`(()=>{const track=document.querySelector('.tv-episodes-scroll-container');track.scrollTop=track.scrollHeight;return track.scrollTop>0;})()`), 'All episodes must remain reachable by scrolling');
      }
    }
    await evaluate('window.mountSeason(0, true)');
    await until(`Boolean(document.querySelector('.tv-episodes-loading-placeholder'))`, 'Season loading indicator must render');
    const loading = await evaluate('window.seasonGeometry()');
    assert.ok(loading.height >= 192 && loading.height < loading.limit, 'Loading must use a visible, compact placeholder');
    await evaluate('window.mountSeason(0)');
    await until(`Boolean(document.querySelector('.tv-episodes-content-area')) && !document.querySelector('.tv-episodes-loading-placeholder')`, 'An empty season must render');
    assert.ok((await evaluate('window.seasonGeometry()')).height < 100, 'An empty season must not reserve a full episode viewport');
    console.log('PASS season/cast spacing, expanded episodes, scrolling, loading and empty states at '+width+'px');
  }

  for (const width of [1024, 375]) {
    await viewport(width);
    await evaluate('window.mountSeriesDetail()');
    await until(`document.querySelector('.tv-episode-card h6')?.textContent === 'Stagione 1' && !document.querySelector('.tv-episodes-loading-placeholder')`, 'The actual series detail page must leave loading after season data arrives');
    assert.equal((await evaluate('window.seasonGeometry()')).gap, 48, 'The series detail page must supply its own margin');
    await evaluate(width < 768
      ? `document.querySelector('.season-dropdown-pill').click()`
      : `document.querySelectorAll('.tv-season-selection-track button')[1].click()`);
    if (width < 768) {
      await until(`document.querySelectorAll('.season-dropdown-item').length === 2`, 'The mobile season menu must open');
      await evaluate(`document.querySelectorAll('.season-dropdown-item')[1].click()`);
    }
    await until(`Boolean(document.querySelector('.tv-episodes-loading-placeholder'))`, 'Changing season must show the loading state');
    await until(`document.querySelector('.tv-episode-card h6')?.textContent === 'Stagione 2' && !document.querySelector('.tv-episodes-loading-placeholder')`, 'Changing season must finish loading and display the new episodes');
    await evaluate('window.restoreDetailRepositories()');
    console.log('PASS actual series detail page finishes initial loading and season changes at '+width+'px');
  }

  await viewport(1024);
  await evaluate('window.mountAppDetail()');
  await until('document.querySelector(".tv-episode-card h6")?.textContent === "Stagione 1" && !document.querySelector(".tv-episodes-loading-placeholder")','The actual application route must load its first season');
  await evaluate('window.savedEpisodeCard = document.querySelector(".tv-episode-card"); document.querySelector(".tv-episode-collapse-btn").click()');
  await until('window.episodeRequested','Expanding incomplete episode data must fetch details');
  assert.ok(await evaluate('window.savedEpisodeCard.isConnected && window.savedEpisodeCard.classList.contains("is-expanded") && !document.querySelector(".tv-episodes-loading-placeholder")'),'Loading episode details must keep the expanded card and season list mounted');
  await evaluate('window.finishEpisode()');
  await until('document.querySelector(".tv-episode-card .tv-episode-rating-pill")?.textContent.includes("8.0")','The expanded card must display its fetched details');
  await evaluate('document.querySelectorAll(".tv-season-selection-track button")[1].click()');
  await until('document.querySelector(".tv-episode-card h6")?.textContent === "Stagione 2"','The route must support selecting season two');
  await evaluate('window.navigateAppDetail("/Cameos/series/987654322")');
  await until('document.querySelector(".film-detail-title")?.textContent === "Serie 987654322" && document.querySelector(".tv-episode-card h6")?.textContent === "Stagione 1"','Changing series must reset its season selection and show only the new series data');
  await evaluate('window.failSeason = true; document.querySelectorAll(".tv-season-selection-track button")[1].click()');
  await until('Boolean(document.querySelector(".tv-seasons-section [role=alert]")) && !document.querySelector(".tv-episodes-loading-placeholder")','A failed season must leave loading and offer a retry');
  await evaluate('window.failSeason = false; document.querySelector(".tv-seasons-section [role=alert] button").click()');
  await until('document.querySelector(".tv-episode-card h6")?.textContent === "Stagione 2" && !document.querySelector(".tv-seasons-section [role=alert]")','Retry must restore the selected season');
  await evaluate('window.emptySeason = true; document.querySelectorAll(".tv-season-selection-track button")[0].click()');
  await until('!document.querySelector(".tv-episode-card") && !document.querySelector(".tv-episodes-loading-placeholder") && document.querySelector(".tv-episodes-content-area")?.textContent.includes("Nessun risultato")','An empty season must finish loading without showing stale episodes');
  await evaluate('window.episodeRequested = false; window.navigateAppDetail("/Cameos/series/987654322/season/2/episode/1")');
  await until('window.episodeRequested','The episode route must request its native episode model');
  await evaluate('window.finishEpisode()');
  await until('document.querySelector(".episode-detail-page h1")?.textContent === "Dettagli episodio" && Boolean(document.querySelector(".media-detail-card"))','The episode title and technical sheet must render through getName');
  await evaluate('window.restoreAppDetailRepositories()');
  console.log('PASS actual App route preserves expanded episodes, resets changed series, and handles failed/retried/empty seasons');
  console.log('PASS episode route and technical sheet use the native name getter');

  for (const variant of ['default','movie-detail']) {
    await evaluate('window.mountCameoCard('+JSON.stringify(variant)+')');
    await until('Boolean(document.querySelector(".cameo-card"))','Cameo card must render its supplied model');
    assert.equal(await evaluate('document.querySelector(".cameo-card h5").textContent'),'Guest');
    assert.equal(await evaluate('document.querySelector(".cameo-card p.text-warning").textContent'),'Self');
    assert.ok(await evaluate('Boolean(document.querySelector(".cameo-uncredited-pill"))'));
    assert.equal(await evaluate('document.querySelector(".cameo-card-action").getAttribute("href")'),'/Cameos/person/42');
    assert.equal(await evaluate('document.querySelector(".cameo-card-media-link")?.getAttribute("href") || null'),variant === 'default' ? '/Cameos/series/7' : null);
    if (variant === 'movie-detail') {
      const justify = await evaluate('getComputedStyle(document.querySelector(".cameo-card-action").parentElement).justifyContent');
      assert.ok(['flex-end', 'flow-end'].includes(justify), `Unexpected justifyContent: ${justify}`);
    }
  }
  console.log('PASS cameo cards present supplied fields, uncredited status, links and movie-detail actor action');

  const nativeCache = await evaluate('window.verifyNativeCache()');
  assert.deepEqual(nativeCache.results,[{native:true,name:'Retained credits',complete:true},{native:true,name:'Retained credits',complete:true}]);
  assert.equal(nativeCache.refreshed,'Updated');
  assert.equal(nativeCache.batchRejected,true);
  assert.equal(nativeCache.batchRolledBack,true,'A failed batch must not commit records queued before the error');
  console.log('PASS native IndexedDB preserves full movie/series details across concurrent connections and refreshes incomplete records');

  for (const [kind,width] of [['movie',393],['tv',393],['movie',1600],['tv',1600]]) {
    await viewport(width);
    await evaluate('window.mountHome('+JSON.stringify(kind)+')');
    await until('window.homeStats.initialCalls > 0 && Boolean(document.querySelector(".cameos-loading-screen"))', 'Home starts with the loading screen');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".main-page")).visibility'), 'hidden');
    assert.ok(await evaluate('Boolean(document.querySelector(".main-page[inert][aria-hidden=true]"))'), 'Preparing content is not interactive');
    await until('window.homeStats.fillCalls > 0', 'Visible sparse rows fill behind the loading screen');
    assert.ok(await evaluate('Boolean(document.querySelector(".cameos-loading-screen"))'), 'Visible holes keep the loader');
    await evaluate('window.finishHomeFill()');
    await until('window.homeStats.imageCalls > 0', 'Visible images are prepared before reveal');
    assert.ok(await evaluate('Boolean(document.querySelector(".cameos-loading-screen"))'), 'Visible image decoding keeps the loader');
    await evaluate('window.finishHomeImages()');
    await until('!document.querySelector(".cameos-loading-screen")', 'Ready viewport reveals without waiting for offscreen content');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".main-page")).visibility'), 'visible');
    assert.equal(await evaluate('Boolean(document.querySelector(".main-page[inert]"))'), false);
    assert.ok(await evaluate('Boolean(document.querySelector(".catalog-placeholder-track"))'), 'Offscreen category is still pending');
    assert.ok(await evaluate('Boolean(document.querySelector(".catalog-cameos-placeholder"))'), 'Offscreen cameos are still pending');
    if (process.env.CATALOG_SCREENSHOTS) {
      const shot = await send('Page.captureScreenshot', {format:'png'});
      const path = join(tmpdir(), 'cameos-catalog-'+kind+'-'+width+'.png');
      await writeFile(path, Buffer.from(shot.data, 'base64'));
      console.log('Screenshot: '+path);
    }
    await evaluate('window.finishHomeCategory()');
    await until('!document.querySelector(".catalog-placeholder-track")', 'Ready categories replace their placeholders independently');
    assert.ok(await evaluate('Boolean(document.querySelector(".catalog-cameos-placeholder"))'), 'Slow cameos do not hide ready categories');
    await evaluate('window.finishHomeCameos(); window.finishHomeFill(); window.finishHomeImages()');
    await until('!document.querySelector(".carousel-loading, .catalog-cameos-placeholder")', 'Empty cameos and automatic fill settle');
    await until('(()=>{const track=document.querySelector(".media-carousel-track");const cards=[...track.querySelectorAll(".media-carousel-item")];return cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left>=track.clientWidth-parseFloat(getComputedStyle(track).paddingLeft)-1;})()', 'Sparse rows still fill their viewport');
    await evaluate('document.querySelector(".media-carousel .carousel-navigation button:last-child").click()');
    await sleep(20);
    assert.equal(await evaluate('Boolean(document.querySelector(".cameos-loading-screen"))'), false);
    await evaluate('window.restoreHome()');
    console.log('PASS initial viewport loading screen: '+kind+' at '+width+'px, including visible images, fill and offscreen requests');
  }

  await viewport(393);
  await evaluate('window.mountHome("movie",false,"animation")');
  await until('window.homeStats.fillCalls > 0', 'Visible category fixture starts');
  await evaluate('window.finishHomeFill(); window.finishHomeImages()');
  await sleep(300);
  assert.ok(await evaluate('Boolean(document.querySelector(".cameos-loading-screen"))'), 'An initial visible category must finish before reveal');
  await evaluate('window.finishHomeCategory()');
  await until('!document.querySelector(".cameos-loading-screen")', 'Visible category completion reveals the page');
  await evaluate('window.finishHomeCameos(); window.restoreHome()');

  for (const kind of ['movie','tv']) {
    await evaluate('window.mountHome('+JSON.stringify(kind)+',true)');
    await until('window.homeStats.initialCalls > 0', 'Failure fixture starts');
    await evaluate('window.finishHomeCategory(); window.finishHomeCameos(); window.finishHomeFill(); window.finishHomeImages()');
    await until('document.querySelectorAll(".main-page [role=alert]").length >= 2', 'Failed category and cameo requests show local errors');
    assert.ok(await evaluate('Boolean(document.querySelector(".trending-card-active"))'), 'Other content survives section errors');
    await until('!document.querySelector(".cameos-loading-screen, .catalog-placeholder-track")', 'Errors settle without trapping the page behind the loader');
    await evaluate('window.restoreHome()');
    console.log('PASS independent '+kind+' catalog errors');
  }

  await viewport(1280);
  await evaluate('window.mountMoviesRetryAndRevisit()');
  await until('!document.querySelector(".cameos-loading-screen") && document.querySelectorAll(".main-page [role=alert] button").length === 2', 'Failed war category and famous cameos must both offer local retry buttons');
  await evaluate('window.recoverMoviesSections(); document.querySelectorAll(".main-page [role=alert] button").forEach(btn => btn.click())');
  await until('document.querySelectorAll(".main-page [role=alert]").length === 0 && document.querySelectorAll(".famous-cameos-section .cameo-card").length === 2', 'Retry buttons must recover failed category and famous cameos independently');
  assert.equal(await evaluate('document.querySelector(".famous-cameos-section .cameo-card-media-link")?.textContent'), 'Film IT 1');
  const cameoCallsAfterRecovery = await evaluate('window.moviesEdgeStats.cameoCalls');
  await evaluate('window.switchMoviesLanguage("en")');
  await until('document.querySelector(".famous-cameos-section .cameo-card-media-link")?.textContent === "Movie EN 1"', 'Language switch must translate cameo movie titles immediately without refetching');
  assert.equal(await evaluate('window.moviesEdgeStats.cameoCalls'), cameoCallsAfterRecovery, 'Language switch must not refetch historical famous cameos');
  await evaluate('window.toggleMoviesMount(false)');
  await until('Boolean(document.querySelector("#other-page"))', 'Navigating away unmounts Movies');
  await evaluate('window.toggleMoviesMount(true)');
  await until('!document.querySelector(".cameos-loading-screen") && document.querySelectorAll(".famous-cameos-section .cameo-card").length === 2', 'Returning to Movies remounts cleanly with retained data');
  assert.equal(await evaluate('window.moviesEdgeStats.cameoCalls'), cameoCallsAfterRecovery, 'Returning to Movies during navigation must never refetch famous cameos');
  await evaluate('window.switchMoviesLanguage("it")');
  await until('document.querySelector(".famous-cameos-section .cameo-card-media-link")?.textContent === "Film IT 1"', 'Restoring Italian language updates cameo movie titles immediately');
  await evaluate('window.restoreMoviesEdge()');
  console.log('PASS Movies.jsx section retry recovery, live bilingual cameo translation and zero-refetch navigation revisit');

  await evaluate('window.mountSeriesRetryAndRevisit()');
  await until('!document.querySelector(".cameos-loading-screen") && document.querySelectorAll(".main-page [role=alert] button").length === 2', 'Failed soap category and famous cameos on TVSeries must both offer local retry buttons');
  await evaluate('window.recoverSeriesSections(); document.querySelectorAll(".main-page [role=alert] button").forEach(btn => btn.click())');
  await until('document.querySelectorAll(".main-page [role=alert]").length === 0 && document.querySelectorAll(".famous-cameos-section .cameo-card").length === 2', 'Retry buttons on TVSeries must recover failed category and famous cameos independently');
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".media-carousel .media-carousel-title-link"), el => el.getAttribute("href").split("/").pop())'),
    ['upcoming','crime','drama','comedy','sciFiFantasy','animation','mystery','actionAdventure','family','kids','warPolitics','western','soap'],
    'TVSeries must render all 13 categories in exact visual order with kids between family and warPolitics'
  );
  const seriesCameoCalls = await evaluate('window.seriesEdgeStats.cameoCalls');
  await evaluate('window.switchSeriesLanguage("en")');
  await until('document.querySelector(".famous-cameos-section .cameo-card-media-link")?.textContent === "Movie EN 1"', 'TVSeries language switch must translate cameo titles without refetching');
  assert.equal(await evaluate('window.seriesEdgeStats.cameoCalls'), seriesCameoCalls);
  await evaluate('window.toggleSeriesMount(false)');
  await until('Boolean(document.querySelector("#other-page"))', 'Navigating away unmounts TVSeries');
  await evaluate('window.toggleSeriesMount(true)');
  await until('!document.querySelector(".cameos-loading-screen") && document.querySelectorAll(".famous-cameos-section .cameo-card").length === 2', 'Returning to TVSeries remounts cleanly with retained data');
  assert.equal(await evaluate('window.seriesEdgeStats.cameoCalls'), seriesCameoCalls, 'Returning to TVSeries during navigation must never refetch famous cameos');
  await evaluate('window.switchSeriesLanguage("it")');
  await until('document.querySelector(".famous-cameos-section .cameo-card-media-link")?.textContent === "Film IT 1"', 'Restoring Italian language on TVSeries updates cameo titles immediately');
  await evaluate('window.restoreSeriesEdge()');
  console.log('PASS TVSeries.jsx 13-category order with kids, section retry recovery, live bilingual cameo translation and zero-refetch revisit');

  await viewport(1280);
  await evaluate('window.mountMovieDetailEdge("error")');
  await until('Boolean(document.querySelector("[role=alert]")) && document.querySelectorAll("button").length >= 2', 'MovieDetail network error must render DetailNotFound alert with Retry button');
  assert.ok(!(await evaluate('document.body.textContent')).includes('Film non trovato'), 'Network error must not masquerade as Movie not found');
  await evaluate('window.setMovieDetailMode("ok"); [...document.querySelectorAll("button")].find(btn => btn.textContent.trim() === "Riprova").click()');
  await until('document.querySelector(".film-detail-title")?.textContent === "Film Dettaglio IT" && !document.querySelector(".cameos-loading-screen")', 'Clicking Retry on MovieDetail must recover full page');
  assert.equal(await evaluate('window.movieDetailEdgeStats.detailCalls.at(-1)?.force'), true, 'Retry must pass force:true to loadMovieDetails');
  assert.equal(await evaluate('window.movieDetailEdgeStats.cameoCalls.length'), 0, 'MovieDetail must derive cameos from loaded Movie with zero extra getMovieCameos requests');
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".cast-card:not(:has(.cast-card-uncredited-slot)) .cast-card-name"), el => el.textContent.trim())'),
    ['Attore Principale', 'Co-star 2', 'Co-star 3', 'Co-star 4', 'Co-star 5', 'Co-star 6', 'Co-star 7', 'Co-star 8'],
    'CastCarousel on MovieDetail must exclude actors already shown in CameoCarousel'
  );
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".cast-card:has(.cast-card-uncredited-slot) .cast-card-name"), el => el.textContent.trim())'),
    ['Star Cameo'],
    'CameoCarousel must show derived cameo and exclude top-8 main cast member even when playing Himself'
  );
  assert.ok(await evaluate('document.querySelector(".provider-name")?.textContent === "Netflix"'), 'Rehydrated IndexedDB watch providers must render cleanly without JSX model instantiation');
  const detailCallsBeforeSwitch = await evaluate('window.movieDetailEdgeStats.detailCalls.length');
  await evaluate('window.savedMovieDetailRoot = document.querySelector(".film-detail-page"); window.switchMovieDetailLanguage("en")');
  await until('document.querySelector(".film-detail-title")?.textContent === "Detail Movie EN"', 'Language switch on MovieDetail must translate live');
  assert.equal(await evaluate('window.savedMovieDetailRoot.isConnected && !document.querySelector(".cameos-loading-screen")'), true, 'Language switch must keep MovieDetail mounted without LoadingScreen');
  assert.equal(await evaluate('window.movieDetailEdgeStats.detailCalls.length'), detailCallsBeforeSwitch, 'Language switch must not refetch movie details');
  assert.equal(await evaluate('window.movieDetailEdgeStats.cameoCalls.length'), 0, 'Language switch must still perform zero getMovieCameos requests');
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".genre-pill"), el => el.textContent.trim())'),
    ['Action', 'Sci-Fi'],
    'MovieDetail genre pills must follow active langKey instead of localStorage'
  );
  assert.ok((await evaluate('document.querySelector(".media-detail-card")?.textContent')).includes('$120 Million'), 'Budget must translate live to EN');
  assert.ok((await evaluate('document.querySelector(".media-detail-card")?.textContent')).includes('Not disclosed'), 'Revenue must translate live to EN');
  assert.ok((await evaluate('document.querySelector(".media-detail-status-badge")?.textContent')).includes('Released'), 'Status label must translate live to EN');
  await evaluate('window.switchMovieDetailLanguage("it")');
  await until('document.querySelector(".film-detail-title")?.textContent === "Film Dettaglio IT"', 'Restoring Italian language updates MovieDetail immediately');
  await evaluate('window.restoreMovieDetailEdge()');
  await evaluate('window.mountMovieDetailEdge("not-found")');
  await until('document.body.textContent.includes("Film non trovato")', 'True missing movie must display Film non trovato');
  assert.equal(await evaluate('Boolean(document.querySelector("[role=alert]"))'), false, 'True not-found must not show error alert or retry button');
  await evaluate('window.restoreMovieDetailEdge()');
  await evaluate('window.mountMovieDetailEdge("ok", "/movie/abc")');
  await until('document.body.textContent.includes("Film non trovato") && !document.querySelector(".cameos-loading-screen")', 'Malformed non-numeric movie route must render Film non trovato instead of infinite LoadingScreen');
  assert.equal(await evaluate('window.movieDetailEdgeStats.detailCalls.length'), 0, 'Malformed non-numeric movie route must make zero repository calls');
  assert.equal(await evaluate('Boolean(document.querySelector("[role=alert]"))'), false, 'Malformed movie route must not show error alert');
  await evaluate('window.restoreMovieDetailEdge()');
  console.log('PASS MovieDetail.jsx error/retry recovery, true not-found, malformed route guard, zero-refetch live bilingual translation and rehydrated providers');

  await evaluate('window.setCameosOffline(false); window.mountTrailerNetworkEdge()');
  await until('Boolean(document.querySelector(".media-trailer-trigger"))', 'MediaTrailerCard trigger must render online');
  try {
    await evaluate('document.querySelector(".media-trailer-trigger").click()');
    await until('Boolean(document.querySelector("dialog:modal"))', 'Clicking trailer trigger online must open modal');
    await evaluate('window.setCameosOffline(true)');
    await until('!document.querySelector("dialog")', 'Going offline must close the open trailer modal');
    await evaluate('window.setCameosOffline(false)');
    await sleep(60);
    assert.equal(await evaluate('Boolean(document.querySelector("dialog"))'), false, 'Returning online must NOT reopen the trailer modal automatically');
    await evaluate('window.setCameosOffline(true)');
    await sleep(30);
    await evaluate('document.querySelector(".media-trailer-trigger").click()');
    await until('Boolean(document.querySelector(".media-trailer-offline-box[role=alert]"))', 'Clicking trailer trigger offline must show offline notice');
    await evaluate('window.setCameosOffline(false)');
    await until('!document.querySelector(".media-trailer-offline-box")', 'Returning online must hide offline notice');
    await evaluate('window.setCameosOffline(true)');
    await sleep(60);
    assert.equal(await evaluate('Boolean(document.querySelector(".media-trailer-offline-box"))'), false, 'Going offline again must NOT resurrect previous offline notice automatically');
  } finally {
    await evaluate('window.setCameosOffline(null)');
  }
  console.log('PASS MediaTrailerCard resets modal and offline notice across online/offline transitions');

  await viewport(1280);
  await evaluate('window.mountSeriesDetailEdge("error")');
  await until('Boolean(document.querySelector("[role=alert]")) && document.querySelectorAll("button").length >= 2', 'TVSeriesDetail network error must render DetailNotFound alert with Retry button even if season 1 resolves in parallel');
  assert.ok(!(await evaluate('document.body.textContent')).includes('Serie non trovata'), 'Network error must not masquerade as Series not found');
  await evaluate('window.setSeriesDetailMode("ok"); [...document.querySelectorAll("button")].find(btn => btn.textContent.trim() === "Riprova").click()');
  await until('document.querySelector(".film-detail-title")?.textContent === "Serie Dettaglio IT" && !document.querySelector(".cameos-loading-screen") && Boolean(document.querySelector(".tv-episode-card"))', 'Clicking Retry on TVSeriesDetail must recover full page and season episodes');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.detailCalls.at(-1)?.force'), true, 'Series retry must pass force:true');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.seasonCalls.at(-1)?.force'), true, 'Series retry must pass force:true to active season');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.seriesCameoCalls.length'), 0, 'TVSeriesDetail must derive cameos from loaded Series with zero extra getSeriesCameos requests');
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".cast-card:not(:has(.cast-card-uncredited-slot)) .cast-card-name"), el => el.textContent.trim())'),
    ['Regular Lead'],
    'CastCarousel on TVSeriesDetail must exclude actors already shown in CameoCarousel'
  );
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".cast-card:has(.cast-card-uncredited-slot) .cast-card-name"), el => el.textContent.trim())'),
    ['Guest Star'],
    'CameoCarousel on TVSeriesDetail must show derived cameo and exclude regular cast'
  );
  assert.equal(await evaluate('document.querySelector(".tv-season-trailer-label")?.textContent'), 'Stagione 1', 'Desktop season label must remain visible even when the season has no trailer');
  assert.ok((await evaluate('document.querySelector(".tv-episodes-container h5")?.textContent')).includes('1 Episodio'), 'Single-episode season must use singular Episodio label');
  assert.equal(await evaluate('document.querySelector(".tv-episode-card")?.hasAttribute("role")'), false, 'TVEpisodeCard outer container must not nest role=button around inner button and link');
  await evaluate('window.savedSeriesDetailRoot = document.querySelector(".tv-series-detail-page"); window.savedEpCard = document.querySelector(".tv-episode-card"); document.querySelector(".tv-episode-collapse-btn").click()');
  await until('document.querySelector(".tv-episode-card .tv-episode-title")?.textContent === "Pilota Arricchito IT" && document.querySelector(".tv-episode-card")?.classList.contains("is-expanded")', 'Expanding incomplete episode must display enriched localized title and details');
  const seriesCallsBeforeSwitch = await evaluate('window.seriesDetailEdgeStats.detailCalls.length');
  const seasonCallsBeforeSwitch = await evaluate('window.seriesDetailEdgeStats.seasonCalls.length');
  await evaluate('window.switchSeriesDetailLanguage("en")');
  await until('document.querySelector(".film-detail-title")?.textContent === "Detail Series EN"', 'Language switch on TVSeriesDetail must translate live');
  assert.equal(await evaluate('window.savedSeriesDetailRoot.isConnected && window.savedEpCard.isConnected && window.savedEpCard.classList.contains("is-expanded") && !document.querySelector(".cameos-loading-screen")'), true, 'Language switch must keep TVSeriesDetail and expanded episode card mounted without LoadingScreen');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.detailCalls.length'), seriesCallsBeforeSwitch, 'Language switch must not refetch series details');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.seasonCalls.length'), seasonCallsBeforeSwitch, 'Language switch must not refetch season details');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.seriesCameoCalls.length'), 0, 'Language switch must still perform zero getSeriesCameos requests');
  assert.equal(await evaluate('document.querySelector(".tv-episode-card .tv-episode-title")?.textContent'), 'Enriched Pilot EN', 'Enriched episode title must translate live to EN');
  assert.ok((await evaluate('document.querySelector(".tv-episodes-container h5")?.textContent')).includes('1 Episode'), 'Single-episode label must translate live to EN singular');
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".genre-pill"), el => el.textContent.trim())'),
    ['Drama', 'Sci-Fi & Fantasy'],
    'TVSeriesDetail genre pills must translate live to EN'
  );
  await evaluate('window.switchSeriesDetailLanguage("it")');
  await until('document.querySelector(".film-detail-title")?.textContent === "Serie Dettaglio IT"', 'Restoring Italian language updates TVSeriesDetail immediately');
  // Let the TVEpisodeCard grid-template-rows expand transition settle before snapshotting layout height.
  await sleep(350);
  const measureSeasonLayout = () => evaluate('(() => { const sec = document.querySelector(".tv-seasons-section").getBoundingClientRect(); const area = document.querySelector(".tv-episodes-content-area").getBoundingClientRect(); const cast = document.querySelector(".responsive-carousel").getBoundingClientRect(); return { areaHeight: Math.round(area.height), castOffset: Math.round(cast.top - sec.top) }; })()');
  const layoutBeforeS2 = await measureSeasonLayout();
  await evaluate('document.querySelectorAll(".tv-season-selection-track button")[1].click()');
  await until('Boolean(document.querySelector(".tv-episodes-loading-placeholder"))', 'Switching to season 2 must enter loading state');
  const layoutDuringS2 = await measureSeasonLayout();
  assert.ok(Math.abs(layoutDuringS2.areaHeight - layoutBeforeS2.areaHeight) <= 1, `Short-season switch loading must preserve content height (${layoutBeforeS2.areaHeight} -> ${layoutDuringS2.areaHeight})`);
  assert.ok(Math.abs(layoutDuringS2.castOffset - layoutBeforeS2.castOffset) <= 1, `Short-season switch loading must keep CastCarousel offset stable (${layoutBeforeS2.castOffset} -> ${layoutDuringS2.castOffset})`);
  await until('document.querySelectorAll(".tv-episode-card").length === 12 && !document.querySelector(".tv-episodes-loading-placeholder")', 'Season 2 episodes must finish loading');
  assert.equal(await evaluate('document.querySelector(".tv-season-trailer-label")?.textContent'), 'Stagione 2');
  assert.equal(await evaluate('document.querySelectorAll(".tv-season-selection-track button")[1].getAttribute("aria-pressed")'), 'true');
  const layoutBeforeS3 = await measureSeasonLayout();
  assert.ok(layoutBeforeS3.areaHeight > 500, `12-episode season must expand well above default loader height (got ${layoutBeforeS3.areaHeight})`);
  await evaluate('document.querySelector(".tv-episodes-scroll-container").scrollTop = 180; document.querySelectorAll(".tv-season-selection-track button")[2].click()');
  await until('Boolean(document.querySelector(".tv-episodes-loading-placeholder"))', 'Switching from tall season 2 to season 3 must enter loading state');
  const layoutDuringS3 = await measureSeasonLayout();
  assert.ok(Math.abs(layoutDuringS3.areaHeight - layoutBeforeS3.areaHeight) <= 1, `Tall-season switch loading must not collapse content area (${layoutBeforeS3.areaHeight} -> ${layoutDuringS3.areaHeight})`);
  assert.ok(Math.abs(layoutDuringS3.castOffset - layoutBeforeS3.castOffset) <= 1, `Tall-season switch loading must not jump CastCarousel upward (${layoutBeforeS3.castOffset} -> ${layoutDuringS3.castOffset})`);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".tv-episodes-scroll-container")).visibility'), 'hidden', 'Previous season container must remain invisible in layout during loading');
  assert.equal(await evaluate('Boolean(document.querySelector(".tv-episodes-scroll-container[inert][aria-hidden=true]"))'), true, 'Hidden previous season container must be inert and aria-hidden during loading');
  assert.equal(await evaluate('document.querySelector(".tv-season-trailer-label")?.textContent'), 'Stagione 3', 'Desktop season label must update and remain visible while loading');
  await until('document.querySelectorAll(".tv-episode-card").length === 12 && !document.querySelector(".tv-episodes-loading-placeholder") && document.querySelector(".tv-episode-card .tv-episode-title")?.textContent === "Episodio S3-1 IT"', 'Season 3 episodes must finish loading');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".tv-episodes-scroll-container")).visibility'), 'visible', 'Loaded season container must return visible');
  assert.equal(await evaluate('document.querySelector(".tv-episodes-scroll-container").scrollTop'), 0, 'Newly loaded season scroll container must reset scrollTop to 0');
  assert.equal(await evaluate('document.querySelector(".tv-season-trailer-label")?.textContent'), 'Stagione 3', 'Desktop season label must remain visible after loading a season without trailer');
  const layoutAfterS3 = await measureSeasonLayout();
  assert.ok(Math.abs(layoutAfterS3.castOffset - layoutBeforeS3.castOffset) <= 1, `Switching from trailer season 2 to no-trailer season 3 must keep CastCarousel offset stable (${layoutBeforeS3.castOffset} -> ${layoutAfterS3.castOffset})`);
  await evaluate('window.restoreSeriesDetailEdge()');
  await evaluate('window.mountSeriesDetailEdge("not-found")');
  await until('document.body.textContent.includes("Serie non trovata")', 'True missing series must display Serie non trovata');
  assert.equal(await evaluate('Boolean(document.querySelector("[role=alert]"))'), false, 'True not-found series must not show error alert or retry button');
  await evaluate('window.restoreSeriesDetailEdge()');
  await evaluate('window.mountSeriesDetailEdge("ok", "/series/888?season=99")');
  await until('document.querySelector(".film-detail-title")?.textContent === "Serie Dettaglio IT" && document.querySelector(".tv-episodes-container h5")?.textContent.includes("Stagione 1")', 'Out-of-bounds ?season=99 must clamp to Season 1');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.seasonCalls.every(c => Number(c.seasonNumber) === 1)'), true, 'Out-of-bounds ?season=99 must never request season 99 from repository');
  await evaluate('window.restoreSeriesDetailEdge()');
  await evaluate('window.mountSeriesDetailEdge("ok", "/series/abc")');
  await until('document.body.textContent.includes("Serie non trovata") && !document.querySelector(".cameos-loading-screen")', 'Malformed non-numeric series route must render Serie non trovata instead of infinite LoadingScreen');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.detailCalls.length'), 0, 'Malformed non-numeric series route must make zero series repository calls');
  assert.equal(await evaluate('window.seriesDetailEdgeStats.seasonCalls.length'), 0, 'Malformed non-numeric series route must make zero season repository calls');
  assert.equal(await evaluate('Boolean(document.querySelector("[role=alert]"))'), false, 'Malformed series route must not show error alert');
  await evaluate('window.restoreSeriesDetailEdge()');
  console.log('PASS TVSeriesDetail.jsx error/retry race safety, Option 1A series cameos, live bilingual translation, trailer label visibility, ?season clamping and malformed route guard');

  await viewport(1280);
  await evaluate('window.mountEpisodeDetailEdge("error")');
  await until('Boolean(document.querySelector("[role=alert]")) && document.querySelectorAll("button").length >= 2', 'TVSeriesEpisodeDetail network error must render DetailNotFound alert with Retry button');
  assert.ok(!(await evaluate('document.body.textContent')).includes('Episodio non trovato'), 'Network error must not masquerade as Episode not found');
  await evaluate('window.setEpisodeDetailMode("ok"); [...document.querySelectorAll("button")].find(btn => btn.textContent.trim() === "Riprova").click()');
  await until('document.querySelector(".episode-detail-page h1")?.textContent === "Episodio Dettaglio IT" && !document.querySelector(".cameos-loading-screen")', 'Clicking Retry on TVSeriesEpisodeDetail must recover episode page');
  assert.equal(await evaluate('window.episodeDetailEdgeStats.episodeCalls.at(-1)?.force'), true, 'Episode retry must pass force:true');
  assert.ok((await evaluate('document.querySelector(".crew-credits-title")?.closest("section")?.textContent || ""')).includes('Director Ep'), 'TVSeriesEpisodeDetail must render episode directors via CrewCredits');
  assert.ok((await evaluate('document.querySelector(".crew-credits-title")?.closest("section")?.textContent || ""')).includes('Writer Ep'), 'TVSeriesEpisodeDetail must render episode writers via CrewCredits');
  assert.equal(
    await evaluate('Array.from(document.querySelectorAll(".cast-card:not(:has(.cast-card-uncredited-slot)) .cast-card-name"), el => el.textContent.trim()).includes("Stan Lee")'),
    false,
    'CastCarousel on TVSeriesEpisodeDetail must exclude actors already shown in CameoCarousel'
  );
  assert.deepEqual(
    await evaluate('Array.from(document.querySelectorAll(".cast-card:has(.cast-card-uncredited-slot) .cast-card-name"), el => el.textContent.trim())'),
    ['Stan Lee'],
    'CameoCarousel on TVSeriesEpisodeDetail must display episode cameos'
  );
  await evaluate('window.savedEpisodeDetailRoot = document.querySelector(".episode-detail-page"); undefined');
  const episodeCallsBeforeSwitch = await evaluate('window.episodeDetailEdgeStats.episodeCalls.length');
  await evaluate('window.switchEpisodeDetailLanguage("en")');
  await until('document.querySelector(".episode-detail-page h1")?.textContent === "Episode Detail EN"', 'Language switch on TVSeriesEpisodeDetail must translate live');
  assert.equal(await evaluate('window.savedEpisodeDetailRoot.isConnected && !document.querySelector(".cameos-loading-screen")'), true, 'Language switch must keep TVSeriesEpisodeDetail mounted without LoadingScreen');
  assert.equal(await evaluate('window.episodeDetailEdgeStats.episodeCalls.length'), episodeCallsBeforeSwitch, 'Language switch must not refetch episode details');
  assert.ok((await evaluate('document.querySelector(".media-overview-card")?.textContent || ""')).includes('Season 3 • Episode 16'), 'MediaOverview episode badge must translate live to EN');
  assert.ok((await evaluate('document.querySelector(".media-overview-card .media-overview-rating-badge.is-tmdb")?.textContent || ""')).includes('42 votes'), 'MediaOverview TMDb episode rating pill must display and translate votes live to EN');
  assert.equal(await evaluate('Boolean(document.querySelector(".media-overview-card .media-overview-rating-badge.is-cameos"))'), true, 'MediaOverview episode must display Cameos rating pill');
  assert.equal((await evaluate('document.querySelector(".media-detail-card")?.textContent || ""')).includes('42 votes'), false, 'MediaDetail episode sheet must no longer duplicate rating row');
  await evaluate('window.switchEpisodeDetailLanguage("it")');
  await until('document.querySelector(".episode-detail-page h1")?.textContent === "Episodio Dettaglio IT"', 'Restoring Italian language updates TVSeriesEpisodeDetail immediately');
  await evaluate('window.restoreEpisodeDetailEdge()');
  await evaluate('window.mountEpisodeDetailEdge("not-found")');
  await until('document.body.textContent.includes("Episodio non trovato")', 'True missing episode must display Episodio non trovato');
  assert.equal(await evaluate('Boolean(document.querySelector("[role=alert]"))'), false, 'True not-found episode must not show error alert or retry button');
  await evaluate('window.restoreEpisodeDetailEdge()');
  await evaluate('window.mountEpisodeDetailEdge("ok", "/series/888/season/abc/episode/1")');
  await until('document.body.textContent.includes("Episodio non trovato") && !document.querySelector(".cameos-loading-screen")', 'Malformed non-numeric episode route must show Episodio non trovato instead of infinite LoadingScreen');
  assert.equal(await evaluate('window.episodeDetailEdgeStats.episodeCalls.length'), 0, 'Malformed non-numeric episode route must make zero repository calls');
  await evaluate('window.restoreEpisodeDetailEdge()');
  console.log('PASS TVSeriesEpisodeDetail.jsx error/retry recovery, CrewCredits, zero-refetch live bilingual translation, not-found and malformed route guard');

  for (const kind of ['movie','tv']) {
    await evaluate('window.mountCategory('+JSON.stringify(kind)+')');
    await until('Boolean(document.querySelector(".media-category-page [role=alert]")) && !document.querySelector(".cameos-loading-screen")','A failed category must leave its loading screen and offer a retry');
    assert.equal(await evaluate('document.querySelector(".media-category-scroll-container button").textContent.trim()'),'Riprova');
    await evaluate('window.recoverCategory(); document.querySelector(".media-category-scroll-container button").click()');
    await until('document.querySelector(".media-category-grid .media-card-title")?.textContent === "Recovered"','Retry must recover the actual category page');
    assert.equal(await evaluate('Boolean(document.querySelector(".media-category-page [role=alert]"))'),false);
    console.log('PASS '+kind+' category leaves failed loading and recovers with an explicit retry');
  }

  await viewport(1280);
  await evaluate('window.mountMovieCategoryEdge("error-initial")');
  await until('Boolean(document.querySelector(".media-category-page [role=alert]")) && !document.querySelector(".cameos-loading-screen")', 'MovieCategory initial error must display alert and Retry');
  await evaluate('window.setMovieCategoryMode("ok"); document.querySelector(".media-category-scroll-container button").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 1 && document.querySelector(".media-category-grid .media-card-title")?.textContent === "Film 1 IT"', 'MovieCategory Retry must recover page 1');
  assert.equal(await evaluate('window.movieCategoryEdgeStats.calls.at(-1)?.force'), true, 'MovieCategory initial Retry must pass force:true');
  assert.ok((await evaluate('document.querySelector(".count-pill")?.textContent || ""')).includes('1 Film'), 'MediaCategoryLayout must derive localized countLabel internally');
  await evaluate('document.querySelector(".load-more-btn").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 2', 'Load More must append page 2');
  const categoryCallsBeforeSwitch = await evaluate('window.movieCategoryEdgeStats.calls.length');
  await evaluate('window.switchMovieCategoryLanguage("en")');
  await until('document.querySelector(".category-title")?.textContent === "Action" && Array.from(document.querySelectorAll(".media-category-grid .media-card-title"), el => el.textContent).join("|") === "Movie 1 EN|Movie 2 EN"', 'Language switch on MovieCategory must translate live while keeping all loaded pages');
  assert.equal(await evaluate('window.movieCategoryEdgeStats.calls.length'), categoryCallsBeforeSwitch, 'Language switch on MovieCategory must trigger zero extra repository calls');
  assert.ok((await evaluate('document.querySelector(".count-pill")?.textContent || ""')).includes('2 Movies'), 'Derived countLabel must translate live to EN');
  await evaluate('window.switchMovieCategoryLanguage("it")');
  await until('document.querySelector(".category-title")?.textContent === "Azione"', 'Restoring Italian updates MovieCategory header immediately');
  await evaluate('window.setMovieCategoryMode("error-page3"); document.querySelector(".load-more-btn").click()');
  await until('Boolean(document.querySelector(".media-category-page [role=alert]")) && document.querySelectorAll(".media-category-grid .media-card-title").length === 2', 'Append error must show role=alert while keeping existing grid items visible');
  assert.equal(await evaluate('document.querySelector(".load-more-btn")?.textContent.trim()'), 'Riprova', 'Load More button must switch to Retry label on append error');
  await evaluate('window.setMovieCategoryMode("ok"); document.querySelector(".load-more-btn").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 3 && !document.querySelector(".media-category-page [role=alert]")', 'Retrying failed append must recover page 3 and clear alert');
  await evaluate('window.restoreMovieCategoryEdge()');
  await evaluate('window.mountMovieCategoryEdge("empty-page1")');
  await until('Boolean(document.querySelector(".load-more-btn")) && document.querySelectorAll(".media-category-grid .media-card-title").length === 0', 'Empty page 1 with hasMore=true must still expose Load More CTA');
  await evaluate('document.querySelector(".load-more-btn").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 1 && document.querySelector(".media-category-grid .media-card-title")?.textContent === "Film 2 IT"', 'Load More from empty filtered page 1 must load page 2');
  await evaluate('window.restoreMovieCategoryEdge()');
  await evaluate('window.mountMovieCategoryEdge("ok", "/movies/category/not-a-category")');
  await until('Boolean(document.querySelector(".film-detail-empty")) && !document.querySelector(".cameos-loading-screen")', 'Unknown movie category slug must immediately render DetailNotFound');
  assert.equal(await evaluate('window.movieCategoryEdgeStats.calls.length'), 0, 'Unknown movie category slug must trigger zero repository requests');
  assert.equal(await evaluate('Boolean(document.querySelector("[role=alert]"))'), false, 'Unknown movie category slug must not render an error alert');
  await evaluate('window.restoreMovieCategoryEdge()');
  console.log('PASS MovieCategory.jsx force retry, zero-refetch live language switch preserving pages, visible append error recovery, empty-page hasMore CTA and invalid category guard');

  await viewport(1280);
  await evaluate('window.mountSeriesCategoryEdge("error-initial")');
  await until('Boolean(document.querySelector(".media-category-page [role=alert]")) && !document.querySelector(".cameos-loading-screen")', 'TVSeriesCategory initial error must display alert and Retry');
  await evaluate('window.setSeriesCategoryMode("ok"); document.querySelector(".media-category-scroll-container button").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 1 && document.querySelector(".media-category-grid .media-card-title")?.textContent === "Serie 1 IT"', 'TVSeriesCategory Retry must recover page 1');
  assert.equal(await evaluate('window.seriesCategoryEdgeStats.calls.at(-1)?.force'), true, 'TVSeriesCategory initial Retry must pass force:true');
  assert.ok((await evaluate('document.querySelector(".count-pill")?.textContent || ""')).includes('1 Serie TV'), 'MediaCategoryLayout must derive localized TV countLabel internally');
  await evaluate('document.querySelector(".load-more-btn").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 2', 'TVSeriesCategory Load More must append page 2');
  const seriesCategoryCallsBeforeSwitch = await evaluate('window.seriesCategoryEdgeStats.calls.length');
  await evaluate('window.switchSeriesCategoryLanguage("en")');
  await until('document.querySelector(".category-title")?.textContent === "Drama" && Array.from(document.querySelectorAll(".media-category-grid .media-card-title"), el => el.textContent).join("|") === "Series 1 EN|Series 2 EN"', 'Language switch on TVSeriesCategory must translate live while keeping all loaded pages');
  assert.equal(await evaluate('window.seriesCategoryEdgeStats.calls.length'), seriesCategoryCallsBeforeSwitch, 'Language switch on TVSeriesCategory must trigger zero extra repository calls');
  assert.ok((await evaluate('document.querySelector(".count-pill")?.textContent || ""')).includes('2 TV Series'), 'Derived TV countLabel must translate live to EN');
  await evaluate('window.switchSeriesCategoryLanguage("it")');
  await until('document.querySelector(".category-title")?.textContent === "Dramma"', 'Restoring Italian updates TVSeriesCategory header immediately');
  await evaluate('window.setSeriesCategoryMode("error-page3"); document.querySelector(".load-more-btn").click()');
  await until('Boolean(document.querySelector(".media-category-page [role=alert]")) && document.querySelectorAll(".media-category-grid .media-card-title").length === 2', 'TVSeriesCategory append error must show role=alert while keeping existing grid items visible');
  assert.equal(await evaluate('document.querySelector(".load-more-btn")?.textContent.trim()'), 'Riprova', 'TVSeriesCategory Load More button must switch to Retry label on append error');
  await evaluate('window.setSeriesCategoryMode("ok"); document.querySelector(".load-more-btn").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 3 && !document.querySelector(".media-category-page [role=alert]")', 'Retrying failed TVSeriesCategory append must recover page 3 and clear alert');
  await evaluate('window.restoreSeriesCategoryEdge()');
  await evaluate('window.mountSeriesCategoryEdge("empty-page1")');
  await until('Boolean(document.querySelector(".load-more-btn")) && document.querySelectorAll(".media-category-grid .media-card-title").length === 0', 'Empty TVSeriesCategory page 1 with hasMore=true must still expose Load More CTA');
  await evaluate('document.querySelector(".load-more-btn").click()');
  await until('document.querySelectorAll(".media-category-grid .media-card-title").length === 1 && document.querySelector(".media-category-grid .media-card-title")?.textContent === "Serie 2 IT"', 'Load More from empty filtered TVSeriesCategory page 1 must load page 2');
  await evaluate('window.restoreSeriesCategoryEdge()');
  await evaluate('window.mountSeriesCategoryEdge("ok", "/series/category/action")');
  await until('Boolean(document.querySelector(".film-detail-empty")) && !document.querySelector(".cameos-loading-screen")', 'Unknown or movie-only series category slug must immediately render DetailNotFound');
  assert.equal(await evaluate('window.seriesCategoryEdgeStats.calls.length'), 0, 'Unknown series category slug must trigger zero repository requests');
  assert.equal(await evaluate('Boolean(document.querySelector("[role=alert]"))'), false, 'Unknown series category slug must not render an error alert');
  await evaluate('window.restoreSeriesCategoryEdge()');
  console.log('PASS TVSeriesCategory.jsx force retry, zero-refetch live language switch preserving pages, visible append error recovery, empty-page hasMore CTA and invalid category guard');

  await evaluate('window.mountSearchEdge("ok", "/Cameos/search")');
  await until('Boolean(document.querySelector(".search-page")) && !document.querySelector(".cameos-loading-screen")', 'Blank Search route must render prompt immediately without LoadingScreen');
  assert.equal(await evaluate('window.searchEdgeStats.calls.length'), 0, 'Blank Search route must trigger zero repository calls');
  assert.equal(await evaluate('Boolean(document.querySelector(".search-page-query"))'), false, 'Blank Search route must omit empty query paragraph');
  await evaluate('window.restoreSearchEdge()');

  await evaluate('window.mountSearchEdge("ok", "/Cameos/search?q=dram&filter=all")');
  await until('Boolean(document.querySelector("section:has(h3[title=\\"Film\\"]) .media-card-title")) && Boolean(document.querySelector("section:has(h3[title=\\"Attori\\"]) .cast-card-name"))', 'Search must render localized movie and actor carousels');
  assert.equal(await evaluate('document.querySelectorAll(".search-page section section").length'), 0, 'Search must not render nested <section> landmarks');
  assert.equal(await evaluate('document.querySelectorAll("section:has(h3[title=\\"Serie TV\\"])").length'), 0, 'Empty sections with hasMore=false must not render empty <section> boxes');
  await evaluate('window.searchEdgeVm.loadMore("movie")');
  await until('document.querySelectorAll("section:has(h3[title=\\"Film\\"]) .media-card-title").length === 24', 'Movie search loadMore must append page 2');
  const searchCallsBeforeLang = await evaluate('window.searchEdgeStats.calls.length');
  await evaluate('window.switchSearchEdgeLanguage("en")');
  await until('Boolean(document.querySelector("section:has(h3[title=\\"Movies\\"])")) && Boolean(document.querySelector("section:has(h3[title=\\"Actors\\"])"))', 'Language switch on Search must translate static section headings live');
  assert.equal(await evaluate('document.querySelectorAll("section:has(h3[title=\\"Movies\\"]) .media-card-title").length'), 24, 'Language switch must preserve all loaded pages in Search carousels');
  assert.equal(await evaluate('document.querySelector("section:has(h3[title=\\"Movies\\"]) .media-card-title")?.textContent'), 'Movie P1-1 EN', 'Bilingual movie cards must translate live on Search');
  assert.equal(await evaluate('window.searchEdgeStats.calls.length'), searchCallsBeforeLang, 'Language switch on Search must trigger zero extra repository calls');
  await evaluate('window.navigateSearchEdge("/Cameos/movie/101")');
  await until('Boolean(document.querySelector("#search-edge-detail"))', 'Navigating away from Search unmounts the page');
  await evaluate('window.navigateSearchEdge(-1)');
  await until('document.querySelectorAll("section:has(h3[title=\\"Movies\\"]) .media-card-title").length === 24 && !document.querySelector(".cameos-loading-screen")', 'Returning to Search must restore shared ViewModel state immediately with all pages preserved');
  assert.equal(await evaluate('window.searchEdgeStats.calls.length'), searchCallsBeforeLang, 'Returning from a detail page to the same Search must trigger zero extra repository calls');
  assert.equal(await evaluate('window.searchEdgeStats.consoleErrors.length'), 0, 'Search rendering must emit zero console errors or PropTypes warnings');
  await evaluate('window.restoreSearchEdge()');

  await evaluate('window.mountSearchEdge("filtered-empty-batch", "/Cameos/search?q=filtered&filter=title")');
  await until('Boolean(document.querySelector("section[aria-label=\\"Film\\"] button"))', 'Filtered empty batch with hasMore=true must render More Results button');
  assert.equal(await evaluate('document.querySelector(".search-page").textContent.includes("Nessun risultato")'), false, 'Filtered empty batch with hasMore=true must not display contradictory No Results message');
  await evaluate('document.querySelector("section[aria-label=\\"Film\\"] button").click()');
  await until('document.querySelectorAll("section:has(h3[title=\\"Film\\"]) .media-card-title").length === 12', 'Clicking More Results on filtered empty batch must load page 4');
  await evaluate('window.restoreSearchEdge()');

  await evaluate('window.mountSearchEdge("genre-error", "/Cameos/search?q=dram&filter=genre")');
  await until('Boolean(document.querySelector(".search-page [role=alert]"))', 'Genre registry error must display alert with Retry');
  assert.equal(await evaluate('window.searchEdgeStats.consoleErrors.length'), 0, 'genre-error sentinel must not trigger MediaCarousel PropTypes warning');
  assert.equal(await evaluate('document.querySelectorAll(".search-page section").length'), 0, 'genre-error sentinel must not leave an empty <section> in DOM');
  await evaluate('window.setSearchEdgeMode("ok"); document.querySelector(".search-page [role=alert] button").click()');
  await until('!document.querySelector(".search-page [role=alert]") && document.querySelectorAll("section:has(h3[title=\\"Dramma\\"]) .media-card-title").length === 12', 'Search Retry must recover failed genre section');
  assert.equal(await evaluate('window.searchEdgeStats.calls.at(-1)?.force'), true, 'Search Retry must forward force:true to repositories');
  await evaluate('window.restoreSearchEdge()');
  console.log('PASS Search.jsx shared ViewModel back-nav preservation, zero-refetch live language switch, empty-batch hasMore UX, genre-error sentinel cleanliness and force:true retry');

  await evaluate('window.mountTranslatedCards()');
  await until('document.querySelector(".media-card-title")?.textContent === "Film italiano"','Cards must start with the active Italian language');
  await evaluate('window.changeCardLanguage("en")');
  await until('Array.from(document.querySelectorAll(".media-card-title"),element=>element.textContent).join("|") === "English film|English series"','Both cards must update their titles from the supplied localized fields');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".media-card-poster img"),element=>element.alt)'),['English film','English series']);
  await evaluate('window.changeCardLanguage("it")');
  console.log('PASS movie and TV cards react to language changes using their supplied data');

  await viewport(1600);
  await evaluate('window.mountFilmography()');
  await until('document.querySelectorAll(".actor-filmography-item").length === 30','The full two-row filmography must mount');
  await sleep(100);
  await evaluate('document.querySelector(".actor-filmography .carousel-navigation button:last-child").click()');
  await until('(()=>{const track=document.querySelector(".actor-filmography-track");return track.scrollLeft >= track.scrollWidth-track.clientWidth-2;})()','Filmography navigation must reach the actual last column');
  console.log('PASS two-row filmography navigation reaches the last credit');

  await evaluate('window.mountSingleRowFilmography()');
  await until('document.querySelectorAll(".actor-filmography-track-single-row .actor-filmography-item").length === 6','Single-row creative filmography must mount');
  assert.equal(await evaluate('document.querySelectorAll(".actor-filmography").length'), 2, 'Empty filmography carousel must render nothing while acting and creative mount');
  assert.equal(await evaluate('document.querySelector(".actor-filmography-track .media-card-meta")?.textContent'), '2001', 'Acting TV filmography card must omit episode count');
  assert.equal(await evaluate('document.querySelectorAll(".actor-filmography h2")[1]?.textContent'), 'Regia e Sceneggiatura');
  assert.equal(await evaluate('document.querySelectorAll(".actor-filmography-track-single-row .media-card-meta")[0]?.textContent'), '2001 • 7 ep.');
  assert.equal(await evaluate('document.querySelectorAll(".actor-filmography-track-single-row .media-card-role")[0]?.textContent'), 'Regia');
  assert.equal(await evaluate('document.querySelectorAll(".actor-filmography-track-single-row .media-card-meta")[1]?.textContent'), '2008');
  assert.equal(await evaluate('document.querySelectorAll(".actor-filmography-track-single-row .media-card-role")[1]?.textContent'), 'Regia (5 ep.) / Sceneggiatura (13 ep.)');
  assert.equal(await evaluate('document.querySelectorAll(".actor-filmography-track-single-row .media-card-role")[2]?.textContent'), 'Regia / Sceneggiatura');
  assert.ok(await evaluate('(()=>{const items=[...document.querySelectorAll(".actor-filmography-track-single-row .actor-filmography-item")];const top=items[0].getBoundingClientRect().top;return items.every(el=>Math.abs(el.getBoundingClientRect().top-top)<=1);})()'), 'Single-row directing/writing carousel must place all cards on one horizontal row');
  console.log('PASS single-row directing/writing filmography layout, episode counts and role labels');

  await evaluate('window.mountImageReadiness()');
  await until('document.querySelector("#detail-image-ready")?.textContent === "false"','A new detail image must start pending');
  await evaluate('window.completeDetailImage()');
  await until('document.querySelector("#detail-image-ready")?.textContent === "true"','The decoded detail image must become ready');
  await evaluate('window.changeDetailImage("https://example.test/second.jpg")');
  await until('document.querySelector("#detail-image-ready")?.textContent === "false"','A changed URL must reset readiness for the same media ID');
  await evaluate('window.captureDetailImage(); window.changeDetailImage("https://example.test/latest.jpg")');
  await sleep(50);
  await evaluate('window.completeStaleDetailImage()');
  await sleep(50);
  assert.equal(await evaluate('document.querySelector("#detail-image-ready").textContent'),'false','A stale image callback must not reveal its replacement');
  await evaluate('window.completeDetailImage()');
  await until('document.querySelector("#detail-image-ready")?.textContent === "true"','Only the latest detail image may become ready');
  await evaluate('window.restoreImageConstructor()');
  console.log('PASS detail image readiness follows changed URLs and ignores stale completion');

  await evaluate('window.mountTextFit()');
  await until('Boolean(document.querySelector("#fit-heading")?.style.fontSize)','The heading must require fitting');
  await sleep(50);
  assert.ok(await evaluate('document.querySelector("#fit-heading").scrollWidth <= document.querySelector("#fit-container").clientWidth+1'),'Heading fit must remain correct with a non-default root font size');
  await evaluate('window.resizeFit(120); window.changeFitText("Un titolo molto lungo che supera anche lo spazio disponibile alla dimensione minima")');
  await until('parseFloat(getComputedStyle(document.querySelector("#fit-heading")).fontSize) === 16.5','Fitted text must respect the CSS minimum at a custom root size');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#fit-heading")).whiteSpace'),'nowrap');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#fit-heading")).textOverflow'),'ellipsis');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".carousel-heading p")).whiteSpace'),'nowrap');
  assert.ok(await evaluate('(()=>{const arrow=document.querySelector(".media-carousel-title-arrow").getBoundingClientRect();const link=document.querySelector(".media-carousel-title-link").getBoundingClientRect();return arrow.right <= link.right+1;})()'),'The navigation arrow must keep its space');
  await evaluate('window.resizeFit(900); window.changeFitText("Breve")');
  await until('parseFloat(getComputedStyle(document.querySelector("#fit-heading")).fontSize) === 32','Widening and changing text must restore the base font size');
  await evaluate('document.documentElement.style.removeProperty("font-size")');
  console.log('PASS single-line fitting respects custom root font sizes');

  await viewport(393);
  await evaluate('document.body.style.overflow="auto"; window.mountProviders()');
  await until('document.querySelectorAll("#inline-providers .provider-category-group").length === 4','All provider categories render inline');
  assert.equal(await evaluate('document.querySelectorAll("#inline-providers .provider-pill").length'),5,'Typed provider IDs preserve distinct providers and merge free/ad-supported duplicates');
  assert.deepEqual(await evaluate('[...document.querySelectorAll("#inline-providers .provider-name")].map(el=>el.textContent)'),
    ['Provider One','Provider One','Amazon Video Store','Provider One','Provider One']);
  const openProviders = async () => {
    await evaluate('document.querySelector("#open-providers").focus(); document.querySelector("#open-providers").click()');
    await until('Boolean(document.querySelector("dialog:modal"))','Provider dialog opens in the native top layer');
    assert.equal(await evaluate('document.body.style.overflow'),'hidden');
    assert.ok(await evaluate('document.querySelector("dialog").contains(document.activeElement)'),'Focus moves inside the dialog');
  };
  await openProviders();
  assert.equal(await evaluate('document.querySelectorAll("dialog:modal .provider-pill").length'),5,'Series getter provides filtered model instances to the modal');
  await evaluate('document.querySelector("dialog .provider-pill").click()');
  assert.ok(await evaluate('Boolean(document.querySelector("dialog:modal"))'),'Content clicks keep the modal open');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await until('!document.querySelector("dialog")','Escape closes the dialog');
  assert.equal(await evaluate('document.body.style.overflow'),'auto');
  assert.equal(await evaluate('document.activeElement.id'),'open-providers');
  await openProviders();
  if (process.env.CATALOG_SCREENSHOTS) {
    await sleep(300);
    const shot = await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(tmpdir(),'cameos-providers-modal.png'),Buffer.from(shot.data,'base64'));
  }
  await evaluate('document.querySelector("dialog").click()');
  await until('!document.querySelector("dialog")','Backdrop click closes the modal');
  await openProviders();
  await evaluate('window.openSecondProviderModal()');
  await until('document.querySelectorAll("dialog:modal").length === 2','Multiple dialogs can share scroll locking');
  await evaluate('window.closeFirstProviderModal()');
  await until('document.querySelectorAll("dialog:modal").length === 1','First dialog can close independently');
  assert.equal(await evaluate('document.body.style.overflow'),'hidden');
  await evaluate('window.unmountProviders()');
  await until('!document.querySelector("dialog")','Unmount removes open dialogs');
  assert.equal(await evaluate('document.body.style.overflow'),'auto');
  await evaluate('window.mountProviders(true)');
  await until('document.querySelector("#inline-providers")?.children.length === 0','Empty providers do not render an inline card');
  await openProviders();
  assert.equal(await evaluate('document.querySelectorAll("dialog .provider-pill").length'),0);
  assert.ok(await evaluate('document.querySelector(".media-providers-modal-body").textContent.trim().length > 0'),'Empty modal explains missing providers');
  await evaluate('document.querySelector("dialog .media-icon-button").click()');
  await until('!document.querySelector("dialog")','Close button closes the modal');
  await evaluate('document.body.style.removeProperty("overflow")');
  console.log('PASS provider categories, deduplication, empty state, modal focus, Escape, backdrop and scroll cleanup');

  for (const [index,fallback,expected] of [[1,'/Cameos/movies','/previous'],[0,'/Cameos/movies','/Cameos/movies'],[null,'/Cameos/series/42','/Cameos/series/42']]) {
    await evaluate('window.mountBackNavigation('+JSON.stringify(index)+','+JSON.stringify(fallback)+')');
    await until('document.querySelector("#go-back")?.textContent === "/detail"','Back navigation must mount at its detail route');
    await evaluate('document.querySelector("#go-back").click()');
    await until('document.querySelector("#go-back")?.textContent === '+JSON.stringify(expected),'Back navigation must use app history or its route fallback');
    await evaluate('window.restoreBackNavigation()');
  }
  console.log('PASS shared back navigation handles app history and direct-entry fallbacks');

  for (const origin of ['/Cameos/movie/42?credits=cast#cast', '/Cameos/series/7', '/Cameos/search/']) {
    await evaluate('window.mountSearchNavigation('+JSON.stringify(origin)+')');
    await until('document.querySelector("#search-location")?.textContent === '+JSON.stringify(origin),'Search navigation fixture mounts');
    for (const query of ['first', 'second', 'third']) {
      await evaluate('(()=>{const input=document.querySelector("input[name=q]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,'+JSON.stringify(query)+');input.dispatchEvent(new Event("input",{bubbles:true}));})()');
      await evaluate('document.querySelector("form[role=search]").requestSubmit()');
      await until('document.querySelector("#search-location").textContent.includes('+JSON.stringify('q='+query)+')','The submitted query reaches the search route');
    }
    await evaluate('document.querySelector("#search-back").click()');
    const expected = origin.includes('/search') ? '/Cameos/movies' : origin;
    await until('document.querySelector("#search-location").textContent === '+JSON.stringify(expected),'Consecutive searches return directly to the full origin URL or direct-entry fallback');
    await evaluate('window.restoreSearchNavigation()');
  }
  console.log('PASS repeated navbar searches preserve the originating movie/series and direct-entry fallback');


  await mount(1000,{initial:20,hasMore:false});
  await until('!document.querySelector(".carousel-navigation button:last-child").disabled','Carousel navigation must finish its initial geometry before keyboard input');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await evaluate('document.querySelector(".carousel-navigation button:last-child").focus()');
  assert.ok(await evaluate('document.activeElement.matches(":focus-visible")'),'Keyboard focus must remain visible');
  assert.ok(await evaluate('getComputedStyle(document.activeElement).outlineStyle !== "none" && parseFloat(getComputedStyle(document.activeElement).outlineWidth) > 0'),'Keyboard focus must have a visible outline');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  assert.ok(await evaluate('document.activeElement === document.querySelector(".carousel-navigation button:last-child")'),'Keyboard activation must preserve focus: '+JSON.stringify(await evaluate('({active:document.activeElement.outerHTML.slice(0,300),buttons:[...document.querySelectorAll(".carousel-navigation button")].map(button=>({disabled:button.disabled,html:button.outerHTML.slice(0,180)}))})')));
  const buttonPoint = await evaluate('(()=>{const rect=document.querySelector(".carousel-navigation button:last-child").getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};})()');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...buttonPoint});
  assert.ok(await evaluate('document.querySelector(".carousel-navigation button:last-child").matches(":active")'),'Pointer press must use the native active state');
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...buttonPoint});
  assert.equal(await evaluate('document.querySelector(".carousel-navigation button:last-child").matches(":active")'),false,'Pointer release must clear active without JS attributes');
  console.log('PASS native carousel button states and visible keyboard focus');

  // StrictMode: TVSeasonSelection timer cleanup on unmount
  await viewport(500);
  await evaluate('window.mountSeasonTimerFixture()');
  const seasonNext = 'document.querySelector(".tv-season-selection-container > button:last-child")';
  await until(`${seasonNext} && !${seasonNext}.disabled`, 'Season navigation must have an enabled scroll button');
  await evaluate(`(() => {
    const originalSet = window.setTimeout;
    const originalClear = window.clearTimeout;
    const pending = new Set();
    const counts = window.seasonTimerAudit = { scheduled: 0, cancelled: 0, fired: 0 };
    window.setTimeout = (callback, delay, ...args) => {
      if (delay !== 350) return originalSet(callback, delay, ...args);
      counts.scheduled++;
      const id = originalSet(() => { pending.delete(id); counts.fired++; callback(...args); }, delay);
      pending.add(id);
      return id;
    };
    window.clearTimeout = id => {
      if (pending.delete(id)) counts.cancelled++;
      originalClear(id);
    };
    window.restoreSeasonTimers = () => { window.setTimeout = originalSet; window.clearTimeout = originalClear; };
  })()`);
  try {
    await evaluate(`${seasonNext}.click(); ${seasonNext}.click()`);
    assert.deepEqual(await evaluate('window.seasonTimerAudit'), { scheduled: 2, cancelled: 1, fired: 0 });
    await evaluate('window.unmountSeasonFixture()');
    await until('!document.querySelector(".tv-season-selection-container") && window.seasonTimerAudit.cancelled === 2',
      'Unmount must cancel the timer actually started by scrolling');
    await sleep(400);
    assert.deepEqual(await evaluate('window.seasonTimerAudit'), { scheduled: 2, cancelled: 2, fired: 0 });
  } finally {
    await evaluate('window.restoreSeasonTimers()');
  }
  console.log('PASS StrictMode: season scrolling schedules, replaces and cancels real timers on unmount');

  // StrictMode: exercise the actual hook rather than duplicating its binding implementation.
  await evaluate('window.mountStrictModeLifecycleFixture()');
  await until('document.querySelector("#user-uid")?.textContent === "user_strict_1"', 'useViewModel evaluates prototype getter in StrictMode');
  const constructionCount = await evaluate('window.strictInstances.length');
  assert.equal(constructionCount, 2, 'StrictMode must exercise the lazy initializer twice');
  await evaluate('window.initialStrictVm = window.strictViewModel; window.rerenderStrictFixture()');
  await until('document.querySelector("#strict-label")?.textContent === "updated"', 'The mounted hook must handle a parent update');
  assert.equal(await evaluate('window.strictInstances.length'), constructionCount, 'Re-render must retain the instance');
  assert.ok(await evaluate('window.strictViewModel === window.initialStrictVm'));
  assert.equal(await evaluate('window.strictInstances.reduce((count, vm) => count + vm._listeners.size, 0)'), 1);
  await evaluate('document.querySelector("#trigger-set-state").click()');
  await until('document.querySelector("#user-loading")?.textContent === "true"', 'bound.setState updates original instance in StrictMode');
  await evaluate('window.dispatchEvent(new Event("offline"))');
  assert.equal(await evaluate('window.strictViewModel.state.isOffline'), true);
  await evaluate('window.unmountStrictFixture()');
  await until('!document.querySelector("#strict-lifecycle-fixture") && window.strictViewModel._listeners.size === 0',
    'Unmount must unsubscribe the hook');
  await evaluate('window.dispatchEvent(new Event("online"))');
  assert.equal(await evaluate('window.strictViewModel.state.isOffline'), true, 'Unmount must remove connectivity listeners');
  console.log('PASS StrictMode: actual hook retains its instance, updates React and cleans up subscriptions/listeners');

  // Mount the real provider; only Firebase and repository I/O are controlled by the fixture.
  await evaluate('window.mountAuthLifecycleFixture()');
  const authState = 'JSON.parse(document.querySelector("#auth-state").textContent)';
  await until('window.authMock.requests.reads.length === 2', 'StrictMode must replay the authentication effect');
  assert.equal(await evaluate('window.authMock.subscriberCount()'), 1);
  await evaluate('window.authMock.requests.reads[1].resolve({uid:"A", username:"current"})');
  await until(`${authState}.profile?.username === "current" && !${authState}.loading`, 'Current session must load');
  await evaluate('window.authMock.requests.reads[0].resolve(null)');
  await sleep(50);
  assert.equal(await evaluate('window.authMock.saves'), 0, 'Cleaned-up effect must not save a late missing profile');
  assert.equal(await evaluate(`${authState}.profile.username`), 'current');

  await evaluate('window.pendingProfileUpdate = window.updateAuthProfile({language:"en-US"}); window.dispatchEvent(new Event("online"))');
  assert.equal(await evaluate('window.authMock.requests.updates.length'), 1);
  assert.equal(await evaluate('window.authMock.requests.syncs.length'), 1);
  await evaluate('window.authMock.changeUser(null)');
  await until(`${authState}.uid === null && ${authState}.profile === null`, 'Logout must clear the displayed profile');
  await evaluate('window.authMock.changeUser("A")');
  await until('window.authMock.requests.reads.length === 3', 'Same-account login starts a new session');
  await evaluate('window.authMock.requests.reads[2].resolve({uid:"A", username:"new session"})');
  await until(`${authState}.profile?.username === "new session"`, 'New session must display its own profile');
  await evaluate(`window.authMock.requests.updates[0].resolve({uid:"A", username:"stale update"});
    window.authMock.requests.syncs[0].resolve({uid:"A", username:"stale sync"}); window.pendingProfileUpdate`);
  await sleep(50);
  assert.equal(await evaluate(`${authState}.profile.username`), 'new session', 'Same UID must not allow results from the previous session');

  await evaluate('void (window.pendingProfileUpdate = window.updateAuthProfile({username:"saved"}))');
  await evaluate('window.authMock.requests.updates[1].resolve({uid:"A", username:"saved"}); window.pendingProfileUpdate');
  await until(`${authState}.profile?.username === "saved"`, 'Current-session edits must still update React');
  await evaluate('window.pendingProfileUpdate = window.updateAuthProfile({username:"late"}); window.unmountAuthFixture()');
  await until('!document.querySelector("#auth-state") && window.authMock.subscriberCount() === 0', 'Unmount must detach Firebase subscription');
  await evaluate('window.authMock.requests.updates[2].resolve({uid:"A", username:"late"}); window.pendingProfileUpdate');
  const syncCount = await evaluate('window.authMock.requests.syncs.length');
  await evaluate('window.dispatchEvent(new Event("online"))');
  assert.equal(await evaluate('window.authMock.requests.syncs.length'), syncCount, 'Unmount must remove the authentication online listener');
  console.log('PASS StrictMode: actual AuthProvider ignores obsolete effects/sessions and cleans up on unmount');

  if (process.argv.includes('--live')) {
    const moviePages = new Set();
    const personPages = new Set();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.method !== 'Network.requestWillBeSent') return;
      const url = new URL(message.params.request.url);
      if (url.hostname === 'api.themoviedb.org' && url.pathname === '/3/search/movie') moviePages.add(Number(url.searchParams.get('page')));
      if (url.hostname === 'api.themoviedb.org' && url.pathname === '/3/search/person') personPages.add(Number(url.searchParams.get('page')));
    });
    await send('Network.enable');
    await viewport(2048);
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/Cameos/search?q=transform&filter=title` });
    await until(`document.querySelectorAll('main .media-carousel:first-child .media-carousel-item').length > 5 && !document.querySelector('main .carousel-loading')`, 'Live search must load further filtered results');
    await sleep(500);
    const live = await evaluate(`(()=>{const track=document.querySelector('main .media-carousel-track');const cards=[...track.children];return {count:cards.length,available:track.clientWidth,occupied:cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left,scrollLeft:track.scrollLeft,ids:cards.map(card=>card.querySelector('a')?.getAttribute('href'))};})()`);
    assert.ok(live.occupied >= live.available - 1, 'The live carousel must fill the screenshot viewport');
    assert.equal(live.scrollLeft, 0);
    assert.equal(new Set(live.ids).size, live.ids.length);
    console.log('PASS live transform search: ' + JSON.stringify({ ...live, ids: undefined, moviePages: [...moviePages] }));

    await send('Page.navigate', { url: `http://127.0.0.1:${port}/Cameos/search?q=chris&filter=all` });
    const directorSnapshot = `(()=>{const track=document.querySelector('main section:has(h3[title="Registi"]) .cast-carousel-track');if(!track)return null;const cards=[...track.children];const style=getComputedStyle(track);return {count:cards.length,available:track.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0),occupied:cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left,scrollLeft:track.scrollLeft,ids:cards.map(card=>card.querySelector('a')?.getAttribute('href'))};})()`;
    await until(`(()=>{const state=${directorSnapshot};return state && state.occupied >= state.available-1;})()`, 'Live director carousel must fill the screenshot viewport');
    await sleep(500);
    const directors = await evaluate(directorSnapshot);
    assert.ok(directors.occupied >= directors.available - 1);
    assert.equal(directors.scrollLeft, 0);
    assert.equal(new Set(directors.ids).size, directors.ids.length);
    assert.equal(await evaluate(`document.querySelectorAll('main .cast-card-character, main .cast-card-roles-toggle').length`), 0);
    console.log('PASS live chris directors: ' + JSON.stringify({ ...directors, ids: undefined, personPages: [...personPages] }));

    await evaluate(`document.querySelector('main section:has(h3[title="Registi"]) .carousel-navigation button:last-child').click()`);
    await until(`(()=>{const state=${directorSnapshot};return state && state.scrollLeft >= state.available*0.75;})()`, 'The live director next click must reach the next viewport');
    await sleep(500);
    const nextDirectors = await evaluate(directorSnapshot);
    assert.ok(nextDirectors.scrollLeft < nextDirectors.available * 1.25);
    console.log('PASS live director first next click: ' + JSON.stringify({ count: nextDirectors.count, scrollLeft: nextDirectors.scrollLeft, available: nextDirectors.available }));
  }
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (chrome?.pid) {
    chrome.kill();
    await Promise.race([new Promise(resolve => { chrome.once('exit', resolve); }), sleep(2000)]);
  }
  await server.close();
  // Remove only the unique test profile created above, within the OS temporary directory.
  assert.equal(resolvePath(profile, '..'), resolvePath(tmpdir()));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
