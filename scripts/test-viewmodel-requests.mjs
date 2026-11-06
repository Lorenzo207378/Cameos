import assert from 'node:assert/strict';
import test from 'node:test';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';

function deferred() {
  let resolve;
  const promise = new Promise(yes => {resolve=yes;});
  return {promise,resolve};
}

for (const [kind,ViewModel,load,trending,upcoming] of [
  ['movie',MovieViewModel,'loadFilmsFeed','getTrendingMovies','getUpcomingMovies'],
  ['series',SeriesViewModel,'loadSeriesFeed','getTrendingSeries','getUpcomingSeries']
]) {
  test(`${kind}: an obsolete feed cannot mark the newer feed ready`,async () => {
    const old=deferred(),latest=deferred();
    let requests=0;
    const vm=new ViewModel({
      [trending]:() => ++requests === 1 ? old.promise : latest.promise,
      [upcoming]:async () => ({results:[],total_pages:1})
    });
    const a=vm[load]({categories:[]});
    const b=vm[load]({categories:[],force:true});
    old.resolve({results:[]});
    await a;
    assert.equal(vm.state.feedLoaded,false);
    assert.equal(vm.state.loading,true);
    latest.resolve({results:[]});
    await b;
    assert.equal(vm.state.feedLoaded,true);
    assert.equal(vm.state.loading,false);
  });
}

test('movie cameo selection follows the last requested movie, regardless of response order',async () => {
  const old=deferred(),latest=deferred();
  const vm=new CameoViewModel({getMovieCameos:({movieId}) => movieId === 1 ? old.promise : latest.promise});
  const a=vm.loadMovieCameos(1);
  const b=vm.loadMovieCameos(2);
  latest.resolve({movie:{id:2,cast:[]},cameos:[{id:20}]});
  await b;
  old.resolve({movie:{id:1,cast:[]},cameos:[{id:10}]});
  await a;
  assert.equal(vm.state.movieCameos.movie.id,2);
  assert.deepEqual(vm.state.movieCameos.cameos,[{id:20}]);
});

test('movie cameo batches retain every response even when only the latest selection is committed',async () => {
  const vm=new CameoViewModel({getMovieCameos:async ({movieId}) => ({movie:{id:movieId},cameos:[{id:movieId*10}]})});
  const results=await vm.loadMoviesCameos([1,2]);
  assert.deepEqual(results.map(item => item.movie.id),[1,2]);
  assert.deepEqual(vm.getCameosForMedia(1),[{id:10}]);
  assert.deepEqual(vm.getCameosForMedia(2),[{id:20}]);
});

test('changing series clears cameo results from the previous series while the new request runs',async () => {
  const latest=deferred();
  const vm=new CameoViewModel({getSeriesVipCameos:({seriesId}) => seriesId === 1 ? Promise.resolve([{id:10}]) : latest.promise});
  await vm.loadSeriesVipCameos(1);
  const pending=vm.loadSeriesVipCameos(2);
  assert.deepEqual(vm.state.seriesVipCameos,[]);
  latest.resolve([{id:20}]);
  await pending;
  assert.deepEqual(vm.state.seriesVipCameos,[{id:20}]);
});

test('combined actor pagination retains movie and TV cameos with the same numeric media ID',async () => {
  const cameo={id:42,mediaId:7,character:'Self'};
  const vm=new CameoViewModel({
    getActorMovieCameos:async () => [{...cameo,mediaType:'movie'}],
    getActorTVCameos:async () => [{...cameo,mediaType:'tv'}]
  });
  await vm.loadActorCameos({personId:42,limit:8});
  assert.deepEqual(vm.state.actorCameos.map(item => item.mediaType),['movie','tv']);
});

for (const [method,stateProp] of [
  ['loadActorMovieCameos','actorMovieCameos'],
  ['loadActorTVCameos','actorTVCameos'],
  ['loadActorCameos','actorCameos']
]) {
  for (const paginated of [false,true]) {
    test(`${method}: changing person ignores obsolete results; pagination: ${paginated}`,async () => {
      const old=deferred(),latest=deferred();
      const fetchActor=({personId}) => personId === 1 ? old.promise : latest.promise;
      const vm=new CameoViewModel({getActorMovieCameos:fetchActor,getActorTVCameos:fetchActor});
      const a=vm[method](paginated ? {personId:1,limit:1} : 1);
      const b=vm[method](paginated ? {personId:2,limit:1} : 2);
      latest.resolve([{id:2,mediaId:20}]);
      await b;
      old.resolve([{id:1,mediaId:10}]);
      await a;
      assert.deepEqual(vm.state[stateProp],[{id:2,mediaId:20}]);
    });
  }
}
