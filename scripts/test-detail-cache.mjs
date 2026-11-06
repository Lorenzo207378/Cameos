import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiService } from '../src/service/ApiService.js';
import { MovieBackend } from '../src/backend/movies/MovieBackend.js';
import { SeriesBackend } from '../src/backend/series/SeriesBackend.js';
import { PersonBackend } from '../src/backend/person/PersonBackend.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { PersonRepository } from '../src/repository/person/PersonRepository.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { Season } from '../src/models/Season.js';
import { Episode } from '../src/models/Episode.js';
import { Person } from '../src/models/Person.js';

const actor = {id:7,name:'Full credits',character:'Guest'};

test('explicit no-credits requests reach TMDB without falling back to default credits', async () => {
 const api = new ApiService({apiKey:'0'.repeat(32)});
 const urls=[];
 api._performFetch=async url=>{urls.push(new URL(url));return {ok:true,status:200,json:async()=>({id:1,name:'Media',title:'Media',credits:{cast:[]}})}};
 for(const [backend,method,params,flag] of [
  [new MovieBackend(api),'getMovieDetails',{movieId:1},'appendCredits'],
  [new SeriesBackend(api),'getSeriesDetails',{seriesId:1},'appendAggregateCredits'],
  [new SeriesBackend(api),'getSeasonDetails',{seriesId:1,seasonNumber:0},'appendAggregateCredits'],
  [new SeriesBackend(api),'getEpisodeDetails',{seriesId:1,seasonNumber:0,episodeNumber:1},'appendCredits'],
  [new PersonBackend(api),'getPersonProfile',{personId:1},'appendCredits']
 ]) {
  urls.length=0;
  await backend[method]({...params,[flag]:false});
  assert.equal(urls.length,method==='getPersonProfile'?1:2);
  const expected=['getMovieDetails','getSeriesDetails','getSeasonDetails'].includes(method)?'images':null;
  assert.ok(urls.every(u=>u.searchParams.get('append_to_response')===expected), method);
  urls.length=0;
  await backend[method](params);
  assert.ok(urls.every(u=>u.searchParams.get('append_to_response').includes('credits')));
 }
});

for(const kind of ['movie','series','season','episode','person']) {
 test(`${kind}: partial responses cannot replace full credits or masquerade as full records offline`, async()=>{
  const storage=new IndexedDBService();
  const method={movie:'getMovieDetails',series:'getSeriesDetails',season:'getSeasonDetails',episode:'getEpisodeDetails',person:'getPersonProfile'}[kind];
  const flag=['series','season'].includes(kind)?'appendAggregateCredits':'appendCredits';
  const model={movie:Movie,series:Series,season:Season,episode:Episode,person:Person}[kind];
  const params={movieId:1,seriesId:1,seasonNumber:0,episodeNumber:1,personId:1,language:'en-US'};
  let calls=0;
  const backend={ [method]:async p=>{
   calls++;
   const full=p[flag]!==false;
   return new model({id:1,...params,name:full?'Full':'Basic',title:full?'Full':'Basic',status:'Released',runtime:90,
    cast:full?[actor]:[],cameos:full?[{...actor,id:8}]:[],movie_credits:full?{cast:[actor],crew:[]}:null});
  }};
  const repo=kind==='movie'?new MovieRepository(backend,storage):kind==='person'?new PersonRepository(backend,storage):new SeriesRepository(backend,storage);
  const full=await repo[method](params);
  await repo[method]({...params,[flag]:false});
  const store={movie:STORES.MOVIES,series:STORES.SERIES,season:STORES.SEASONS,episode:STORES.EPISODES,person:STORES.PERSONS}[kind];
  const records=await storage.getAll(store);
  assert.equal(records.length,2);
  assert.equal(records.find(r=>r.cacheKey.endsWith(':basic')).isComplete,false);
  assert.equal(records.find(r=>!r.cacheKey.endsWith(':basic')).isComplete,true);
  repo.setOnlineOverride(false);
  const offline=await repo[method](params);
  if(kind==='person')assert.deepEqual(offline.movieCredits,full.movieCredits);
  else if(kind==='season')assert.equal(offline.cameos[0].name,'Full credits');
  else assert.equal(offline.cast[0].name,'Full credits');
  assert.equal(calls,2);
 });
}

test('episode TTL does not reuse basic details for a full request and season refresh cannot overwrite full episode cache',async()=>{
 let calls=0;
 const storage=new IndexedDBService();
 const repo=new SeriesRepository({
  getEpisodeDetails:async params=>{calls++;return new Episode({id:1,...params,runtime:45,cast:params.appendCredits===false?[]:[actor]})},
  getSeasonDetails:async params=>new Season({...params,episodes:[{id:1,episodeNumber:1,runtime:20}]})
 },storage);
 const params={seriesId:1,seasonNumber:0,episodeNumber:1,language:'en-US'};
 await repo.getEpisodeDetails({...params,appendCredits:false});
 assert.equal((await repo.getEpisodeDetails(params)).cast[0].name,'Full credits');
 assert.equal(calls,2);
 await repo.getSeasonDetails(params);
 const cached=await repo.getEpisodeDetails(params);
 assert.equal(cached.runtime,45);
 assert.equal(cached.cast[0].name,'Full credits');
 repo.setOnlineOverride(false);
 assert.equal((await repo.getEpisodeDetails(params)).runtime,45);
});

test('list completeness heuristics cannot overwrite detail credits',async()=>{
 const storage=new IndexedDBService();
 const repo=new MovieRepository({
  getMovieDetails:async()=>new Movie({id:1,title:'Full',status:'Released',runtime:90,cast:[actor]}),
  discoverMovies:async()=>({page:1,total_pages:1,results:[new Movie({id:1,title:'List',status:'Released',runtime:90})]})
 },storage);
 await repo.getMovieDetails({movieId:1,language:'en-US'});
 const list=await repo.discoverMovies({language:'en-US'});
 assert.equal(list.results[0].isComplete,true,'technical details alone are not a guarantee of credits');
 repo.setOnlineOverride(false);
 assert.equal((await repo.getMovieDetails({movieId:1,language:'en-US'})).cast[0].name,'Full credits');
});

for (const kind of ['movie', 'series']) {
 test(`${kind}: a delayed list write cannot replace details saved by a concurrent request`, async () => {
  const storage = new IndexedDBService();
  const Model = kind === 'movie' ? Movie : Series;
  const store = kind === 'movie' ? STORES.MOVIES : STORES.SERIES;
  const discover = kind === 'movie' ? 'discoverMovies' : 'discoverSeries';
  const details = kind === 'movie' ? 'getMovieDetails' : 'getSeriesDetails';
  const Repository = kind === 'movie' ? MovieRepository : SeriesRepository;
  const params = { movieId: 1, seriesId: 1, language: 'en-US' };
  let startWrite;
  let finishWrite;
  const started = new Promise(resolve => { startWrite = resolve; });
  const gate = new Promise(resolve => { finishWrite = resolve; });
  const originalPutMany = storage.putMany.bind(storage);
  storage.putMany = async (storeName, ...args) => {
   if (storeName === store) { startWrite(); await gate; }
   return originalPutMany(storeName, ...args);
  };
  const repo = new Repository({
   [discover]: async () => ({page:1,total_pages:1,results:[new Model({id:1,title:'List',name:'List'})]}),
   [details]: async () => new Model({id:1,title:'Full',name:'Full',cast:[actor]})
  }, storage);
  const listRequest = repo[discover](params);
  await started;
  await repo[details](params);
  finishWrite();
  await listRequest;
  repo.setOnlineOverride(false);
  const offline = await repo[details](params);
  assert.equal(offline.cast[0]?.name, 'Full credits');
  assert.equal((await storage.getAll(store))[0].isComplete, true);
 });

 test(`${kind}: offline details prefer complete credits over a list in the requested language`, async () => {
  const storage = new IndexedDBService();
  const Model = kind === 'movie' ? Movie : Series;
  const Repository = kind === 'movie' ? MovieRepository : SeriesRepository;
  const discover = kind === 'movie' ? 'discoverMovies' : 'discoverSeries';
  const details = kind === 'movie' ? 'getMovieDetails' : 'getSeriesDetails';
  const repo = new Repository({
   [discover]: async () => ({page:1,total_pages:1,results:[new Model({id:1,title:'List',name:'List'})]}),
   [details]: async () => new Model({id:1,title:'Full',name:'Full',cast:[actor]})
  }, storage);
  const params = {movieId:1,seriesId:1};
  await repo[details]({...params,language:'en-US'});
  await repo[discover]({language:'it-IT'});
  repo.setOnlineOverride(false);
  const offline = await repo[details]({...params,language:'it-IT'});
  assert.equal(offline.cast[0]?.name,'Full credits');
 });
}
