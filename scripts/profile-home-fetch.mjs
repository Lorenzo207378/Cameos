import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { ApiService } from '../src/service/ApiService.js';
import { MovieBackend } from '../src/backend/movies/MovieBackend.js';
import { SeriesBackend } from '../src/backend/series/SeriesBackend.js';
import { CameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { CameoRepository } from '../src/repository/cameos/CameoRepository.js';
import { IndexedDBService } from '../src/storage/IndexedDBService.js';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';

// Synthetic transport only: run the real scheduler, localization, backends, repositories and viewmodels.
// No credentials, environment files, remote requests, images or real IndexedDB timings are involved.
const latency = Number(process.argv[2] || 100);
if (!Number.isFinite(latency) || latency < 0) throw new Error('Latency must be a non-negative number of milliseconds');
for (const type of ['movie', 'tv']) {
  const api = new ApiService({apiKey: '0'.repeat(32)});
  const calls = [];
  let active = 0, peak = 0;
  const start = performance.now();
  api._performFetch = async (url) => {
    const u = new URL(url);
    calls.push({path:u.pathname.replace('/3',''), language:u.searchParams.get('language')});
    peak = Math.max(peak, ++active);
    await new Promise(r=>setTimeout(r,latency));
    active--;
    const page = Number(u.searchParams.get('page') || 1);
    const future = u.searchParams.has('primary_release_date.gte') && !u.searchParams.has('primary_release_date.lte') || u.searchParams.has('first_air_date.gte') && !u.searchParams.has('first_air_date.lte');
    const item = id => ({id,title:'Movie',name:'Series',overview:'Overview',release_date:future?'2099-01-01':'2020-01-01',first_air_date:future?'2099-01-01':'2020-01-01',vote_average:8});
    const match = u.pathname.match(/\/(movie|tv)\/(\d+)$/);
    const data = match ? {...item(Number(match[2])), status:'Planned',seasons:[{season_number:2,air_date:'2099-01-01'}],credits:{cast:[{id:1,name:'Guest 1',character:'Self',popularity:50,order:25},{id:2,name:'Guest 2',character:'Self',popularity:40,order:26}]}} : {page,total_pages:10,total_results:200,results:Array.from({length:20},(_,i)=>item(page*100+i))};
    return {ok:true,status:200,json:async()=>data};
  };
  const storage = new IndexedDBService();
  const repo = type==='movie'? new MovieRepository(new MovieBackend(api),storage):new SeriesRepository(new SeriesBackend(api),storage);
  const cameoRepo = new CameoRepository(new CameoBackend(api),storage);
  const vm = type==='movie'?new MovieViewModel(repo):new SeriesViewModel(repo);
  const load = ()=> type==='movie'?vm.loadFilmsFeed({initialPages:2}):vm.loadSeriesFeed({initialPages:2});
  let heroMs;
  const unsub = vm.subscribe(()=>{if(heroMs===undefined && (vm.state.trendingMovies?.length||vm.state.trendingSeries?.length))heroMs=Math.round(performance.now()-start)});
  const cameo = new CameoViewModel(cameoRepo);
  await Promise.all([load(),cameo.loadFamousCameos(16)]);
  unsub();
  assert.equal(vm.state.feedLoaded, true);
  assert.equal(vm.state.error, null);
  assert.equal(cameo.state.error, null);
  assert.equal(cameo.state.famousCameos.length, 16);
  assert.ok((vm.state.trendingMovies || vm.state.trendingSeries).length > 0);
  assert.ok((vm.state.upcomingMovies || vm.state.upcomingSeries).length > 0);
  const coldCalls = calls.length;
  const firstMs = Math.round(performance.now()-start);
  await load();
  const repeatSameVm = calls.length-coldCalls;
  const warmStart=performance.now();
  await new CameoViewModel(cameoRepo).loadFamousCameos(16);
  const reentryCalls=calls.length-coldCalls-repeatSameVm;
  console.log(JSON.stringify({type,latencyPerRequestMs:latency,initialCalls:coldCalls,peakConcurrency:peak,heroMs,allReadyMs:firstMs,repeatSameFeedVmCalls:repeatSameVm,cameosNewVmWithWarmCache:{calls:reentryCalls,ms:Math.round(performance.now()-warmStart)},initialByEndpoint:Object.fromEntries([...new Set(calls.slice(0,coldCalls).map(c=>c.path.replace(/\/\d+$/,'/:id')))].map(path=>[path,calls.slice(0,coldCalls).filter(c=>c.path.replace(/\/\d+$/,'/:id')===path).length]))}));
}
