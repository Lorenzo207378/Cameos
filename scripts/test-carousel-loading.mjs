import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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
import { useMovieImagesReady } from '/src/utils/imageUtils.js';
import { useGoBack, useSingleLineFit } from '/src/utils/domUtils.js';
import CarouselHeading from '/src/components/CarouselHeading.jsx';
import SearchBar from '/src/components/navbar/SearchBar.jsx';
import MediaProvidersSection from '/src/components/media/MediaProvidersSection.jsx';
import PersonFimography from '/src/components/person/PersonFimography.jsx';
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
  const { AuthProvider, useAuth } = await import('/src/contexts/AuthContext.jsx?lifecycle-test');
  window.authMock = await import('/scripts/fixtures/auth-session.js');
  window.authMock.changeUser('A');
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
    return mounted ? h(AuthProvider, null, h(SessionState)) : null;
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
window.mountCameoCard = variant => {
  // The card receives the normalized object supplied by the ViewModel; it only presents its fields.
  const cameo = new Cameo({id:42,name:'Guest',character:'Self (uncredited)',role:'Brief appearance',
    mediaId:7,mediaType:'tv',mediaTitle:'Test Series'});
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(CameoCard,{cameo,variant}))));
};
window.mountSeason = (count, loading = false) => {
  const episodes = Array.from({length:count}, (_, i) => ({id:i+1,episodeNumber:i+1,name:'Episodio '+(i+1),
    overview:'Trama di prova per verificare la disposizione degli episodi.',airDate:'2026-01-01',voteAverage:8,runtime:45}));
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(DeviceProvider,null,
    h('main',{style:{padding:'0 20px'}},
      h(TVSeasonsSection,{series:{id:1,numberOfSeasons:1},currentSeason:{episodes},isLoadingEpisodes:loading,className:'mb-5'}),
      h(CastCarousel,{cast:[{id:1,name:'Attore'}],title:'Cast Principale'}))))));
};
window.seasonGeometry = () => {
  const area = document.querySelector('.tv-episodes-content-area');
  const track = document.querySelector('.tv-episodes-scroll-container');
  const cast = document.querySelector('.responsive-carousel');
  return {height:area.clientHeight,limit:parseFloat(getComputedStyle(area).maxHeight),
    gap:cast.getBoundingClientRect().top-area.getBoundingClientRect().bottom,
    unused:track ? area.getBoundingClientRect().bottom-Math.min(track.getBoundingClientRect().bottom,track.lastElementChild.getBoundingClientRect().bottom) : 0,
    scrollable:track ? track.scrollHeight>track.clientHeight : false};
};
window.mountSeriesDetail = async () => {
  const [{default:TVSeriesDetail},{getSharedSeriesViewModel},{cameoRepository},{AuthContext},{Series},{Season}] = await Promise.all([
    import('/src/pages/TVSeriesDetail.jsx'),import('/src/viewmodel/useViewModel.js'),
    import('/src/repository/cameos/CameoRepository.js'),import('/src/contexts/AuthContext.jsx'),
    import('/src/models/Series.js'),import('/src/models/Season.js')]);
  const vm = getSharedSeriesViewModel();
  const originalRepository = vm.repository;
  const originalCameos = cameoRepository.getSeriesVipCameos;
  vm.clearSelection();
  vm.repository = {
    getSeriesDetails:async () => new Series({id:987654321,name:'Serie di prova',numberOfSeasons:2,cast:[{id:1,name:'Attore'}]}),
    getSeasonDetails:async ({seriesId,seasonNumber}) => {
      await new Promise(resolve => setTimeout(resolve,100));
      return new Season({seriesId,seasonNumber,episodes:[{id:seasonNumber,episodeNumber:1,name:'Stagione '+seasonNumber,
        overview:'Episodio di prova',airDate:'2026-01-01',voteAverage:8}]});
    }
  };
  cameoRepository.getSeriesVipCameos = async () => [];
  window.restoreDetailRepositories = () => {
    vm.repository = originalRepository;
    cameoRepository.getSeriesVipCameos = originalCameos;
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
  const originalCameos = cameoRepository.getSeriesVipCameos;
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
  cameoRepository.getSeriesVipCameos = async () => [];
  window.restoreAppDetailRepositories = () => {
    vm.repository = originalRepository;
    cameoRepository.getSeriesVipCameos = originalCameos;
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
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,{initialEntries:['/category/action']},
    h(Routes,null,h(Route,{path:'/category/:category',element:h(Category)})))));
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
  root.render(h(StrictMode,{key:++generation},h(MemoryRouter,null,h(PersonFimography,{credits}))));
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
  resolveId(source, importer) {
    if (importer?.endsWith('/AuthContext.jsx?lifecycle-test')
      && ['firebase/auth', '../firebase.js', '../repository/index.js'].includes(source)) {
      return resolve(projectPath, 'scripts/fixtures/auth-session.js');
    }
  },
  configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (req.url !== harnessPath) return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(await vite.transformIndexHtml(harnessPath, html));
    });
  } })]
});
let chrome;
let socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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

  for (const width of [2048, 1024, 375]) {
    await viewport(width);
    for (const count of [8, 30]) {
      await evaluate(`window.mountSeason(${count})`);
      await until(`document.querySelectorAll('.tv-episode-card').length === ${count}`, 'Season episodes must render');
      await sleep(100);
      const geometry = await evaluate('window.seasonGeometry()');
      assert.ok(geometry.height <= geometry.limit, 'The episode list must respect its maximum height');
      assert.ok(geometry.unused <= 1, 'No reserved empty space may remain below a short season');
      assert.equal(geometry.gap, 48, 'The caller must control the margin between episodes and cast');
      assert.equal(geometry.scrollable, count === 30, 'Long seasons must retain internal scrolling');
      if (count === 8) {
        await evaluate(`document.querySelector('.tv-episode-collapse-btn').click()`);
        await sleep(300);
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
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".cameo-card-action").parentElement).justifyContent'),'flex-end');
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

  for (const kind of ['movie','tv']) {
    await evaluate('window.mountCategory('+JSON.stringify(kind)+')');
    await until('Boolean(document.querySelector(".media-category-page [role=alert]")) && !document.querySelector(".cameos-loading-screen")','A failed category must leave its loading screen and offer a retry');
    assert.equal(await evaluate('document.querySelector(".media-category-scroll-container button").textContent.trim()'),'Riprova');
    await evaluate('window.recoverCategory(); document.querySelector(".media-category-scroll-container button").click()');
    await until('document.querySelector(".media-category-grid .media-card-title")?.textContent === "Recovered"','Retry must recover the actual category page');
    assert.equal(await evaluate('Boolean(document.querySelector(".media-category-page [role=alert]"))'),false);
    console.log('PASS '+kind+' category leaves failed loading and recovers with an explicit retry');
  }

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
    const directorSnapshot = `(()=>{const track=document.querySelector('main section[aria-label="Registi"] .cast-carousel-track');if(!track)return null;const cards=[...track.children];const style=getComputedStyle(track);return {count:cards.length,available:track.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0),occupied:cards.at(-1).getBoundingClientRect().right-cards[0].getBoundingClientRect().left,scrollLeft:track.scrollLeft,ids:cards.map(card=>card.querySelector('a')?.getAttribute('href'))};})()`;
    await until(`(()=>{const state=${directorSnapshot};return state && state.occupied >= state.available-1;})()`, 'Live director carousel must fill the screenshot viewport');
    await sleep(500);
    const directors = await evaluate(directorSnapshot);
    assert.ok(directors.occupied >= directors.available - 1);
    assert.equal(directors.scrollLeft, 0);
    assert.equal(new Set(directors.ids).size, directors.ids.length);
    assert.equal(await evaluate(`document.querySelectorAll('main .cast-card-character, main .cast-card-roles-toggle').length`), 0);
    console.log('PASS live chris directors: ' + JSON.stringify({ ...directors, ids: undefined, personPages: [...personPages] }));

    await evaluate(`document.querySelector('main section[aria-label="Registi"] .carousel-navigation button:last-child').click()`);
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
    await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(2000)]);
  }
  await server.close();
  // Remove only the unique test profile created above, within the OS temporary directory.
  assert.equal(resolve(profile, '..'), resolve(tmpdir()));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
}
