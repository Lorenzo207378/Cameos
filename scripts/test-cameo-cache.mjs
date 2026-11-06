import assert from 'node:assert/strict';
import test from 'node:test';
import { CameoRepository } from '../src/repository/cameos/CameoRepository.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { Cameo } from '../src/models/Cameo.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { Season } from '../src/models/Season.js';
import { Episode } from '../src/models/Episode.js';

const params = {movieId:7,seriesId:7,seasonNumber:0,episodeNumber:1,personId:42,language:'en-US'};
const cameo = new Cameo({id:42,name:'Guest',character:'Self (uncredited)',mediaId:7,mediaType:'movie',mediaTitle:'Localized film'});
const episode = new Episode({...params,id:1,name:'Episode',cameos:[cameo],cast:[{id:42,name:'Guest'}]});
const season = new Season({...params,name:'Specials',episodes:[episode]});
const movie = new Movie({id:7,titles:{it:'Film',en:'Localized film'},cameos:[cameo]});
const series = new Series({id:7,name:'Series'});

const responses = {
  getCameoHeavyMovies:{page:1,total_pages:1,total_results:1,results:[movie]},
  getCameoHeavySeries:{page:1,total_pages:1,total_results:1,results:[series]},
  getMovieCameos:{movie,cameos:[cameo],allCast:[cameo]},
  getFamousCameos:{page:1,totalPages:2,totalResults:2,results:[cameo],hasMore:true},
  getEpisodeCameos:{episode,cameos:[cameo],allGuestStars:[cameo]},
  getSeasonCameos:{season,episodesWithCameos:[episode],seasonCameos:[cameo]},
  getActorMovieCameos:[cameo],
  getActorCareerCameos:[cameo],
  getSeriesVipCameos:[cameo]
};

for (const [method,response] of Object.entries(responses)) {
  test(`${method}: cached data retains the online models and pagination offline`, async () => {
    const storage = new IndexedDBService();
    let requests = 0;
    const repo = new CameoRepository({[method]:async () => { requests++; return response; }},storage);
    const fresh = await repo[method](params);
    repo.setOnlineOverride(false);
    const offline = await repo[method](params);
    assert.deepEqual(offline,fresh);
    assert.equal(requests,1);
    if (method === 'getEpisodeCameos' || method === 'getSeasonCameos' || method === 'getMovieCameos') {
      const store = method === 'getEpisodeCameos' ? STORES.EPISODES
        : method === 'getSeasonCameos' ? STORES.SEASONS : STORES.MOVIES;
      assert.equal((await storage.getAll(store))[0].isComplete,true);
    }
  });
}

test('cameo list caches retain exclusions and the actor TV alias delegates to career data', async () => {
  const excluded = new Cameo({...cameo,mediaId:8,genreIds:[99]});
  const repo = new CameoRepository({getActorCareerCameos:async () => [cameo,excluded]},new IndexedDBService());
  assert.deepEqual(await repo.getActorTVCameos(params),[cameo]);
  repo.setOnlineOverride(false);
  assert.deepEqual(await repo.getActorTVCameos(params),[cameo]);
});

test('famous cameo cache retains the legacy items format without claiming more pages', async () => {
  const storage = new IndexedDBService();
  const repo = new CameoRepository({},storage);
  const key = repo.buildCacheKey('famous_cinema_cameos',{language:'en-US',page:1,limit:8});
  await storage.put(STORES.CAMEOS,{cacheKey:key,items:[cameo]});
  repo.setOnlineOverride(false);
  const result = await repo.getFamousCameos({language:'en-US'});
  assert.deepEqual(result,{page:1,totalPages:1,totalResults:1,results:[cameo],hasMore:false});
});

test('classification and total count delegate without accessing storage', () => {
  const repo = new CameoRepository({
    extractCameosFromGuestStars:(stars,popularity) => ({stars,popularity}),
    getFamousCameosTotalCount:() => 24
  },new IndexedDBService());
  assert.deepEqual(repo.extractCameosFromGuestStars([cameo],12),{stars:[cameo],popularity:12});
  assert.equal(repo.getFamousCameosTotalCount(),24);
  assert.equal(new CameoRepository({}).getFamousCameosTotalCount(),1000);
});
