import assert from 'node:assert/strict';
import test from 'node:test';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';

function fixture() {
    const calls = [];
    const movies = [
        { id: 1, mediaId: 10, mediaType: 'movie', popularity: 5 },
        { id: 2, mediaId: 20, mediaType: 'movie', popularity: 3 }
    ];
    const tv = [{ id: 3, mediaId: 30, mediaType: 'tv', popularity: 9 }];
    const vm = new CameoViewModel({
        async getActorMovieCameos(params) { calls.push(params); return movies; },
        async getActorTVCameos(params) { calls.push(params); return tv; },
        async getFamousCameos(params) {
            calls.push(params);
            return { results: [{ id: params.page }], totalPages: 3, hasMore: params.page < 3 };
        }
    });
    return { vm, calls, movies, tv };
}

test('actor loaders accept numeric IDs, string IDs and explicit language options', async () => {
    const { vm, calls, movies, tv } = fixture();
    assert.deepEqual(await vm.loadActorMovieCameos(42, 'en-US'), movies);
    assert.deepEqual(await vm.loadActorTVCameos('42', 'en-US'), tv);
    assert.deepEqual(await vm.loadActorCameos({ personId: 42, language: 'en-US' }), [tv[0], ...movies]);
    assert.ok(calls.every(call => String(call.personId) === '42' && call.language === 'en-US'));
    assert.deepEqual(vm.state.actorCareerCameos, tv);
});

test('actor pagination preserves first page, append and completion state', async () => {
    for (const [method, state] of [
        ['loadActorMovieCameos', 'actorMovieCameos'],
        ['loadActorTVCameos', 'actorTVCameos'],
        ['loadActorCameos', 'actorCameos']
    ]) {
        const { vm } = fixture();
        const all = await vm[method](42);
        assert.equal((await vm[method]({ personId: 42, page: 1, limit: 1 })).length, 1);
        for (let page = 2; page <= all.length; page++) {
            assert.equal((await vm[method]({ personId: 42, append: true, limit: 1 })).length, page);
        }
        assert.deepEqual(vm.state[state], all);
        assert.equal(vm.state[`${state}Pagination`].hasMore, false);
        assert.equal(vm.state[`${state}Pagination`].loadingMore, false);
    }
});

test('famous cameos keep numeric limits, page options and cached ID formats', async () => {
    const { vm, calls } = fixture();
    assert.equal((await vm.loadFamousCameos(16, 'en-US')).length, 2);
    assert.deepEqual(calls.map(call => call.page), [1, 2]);
    assert.ok(calls.every(call => call.language === 'en-US' && call.limit === 8));
    assert.equal((await vm.loadMoreFamousCameos()).length, 3);
    assert.equal(vm.state.famousCameosPagination.hasMore, false);
    for (const entry of [{ movie: { id: 42 } }, { movieId: 42 }, { id: 42 }]) {
        vm.setState({ moviesCameos: [{ ...entry, cameos: [{ id: 7 }] }] });
        assert.deepEqual(vm.getCameosForMedia('42'), [{ id: 7 }]);
    }
});

test('loadMoviesCameos delegates each movie fetch to loadMovieCameos without direct repository access', async () => {
    let repoCalls = 0;
    let singleMovieCalls = 0;
    const fakeRepo = {
        async getMovieCameos(params) {
            repoCalls++;
            return {
                movie: { id: params.movieId, title: `Movie ${params.movieId}` },
                cameos: [{ id: 100 + Number(params.movieId), name: 'Cameo' }]
            };
        }
    };

    const vm = new CameoViewModel(fakeRepo, { language: 'it-IT' });
    const originalLoadMovieCameos = vm.loadMovieCameos;
    vm.loadMovieCameos = async (movieId, minPopularity, language) => {
        singleMovieCalls++;
        return originalLoadMovieCameos(movieId, minPopularity, language);
    };

    const result = await vm.loadMoviesCameos([{ id: 10 }, { id: 20 }], 8, 'it-IT');
    assert.equal(singleMovieCalls, 2, 'Must invoke loadMovieCameos for each movie in list');
    assert.equal(repoCalls, 2, 'Repository calls occur only via loadMovieCameos');
    assert.equal(result.length, 2);
    assert.equal(result[0].cameos.length, 1);
    assert.deepEqual(vm.state.moviesCameos, result);
});
