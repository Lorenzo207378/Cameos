import assert from 'node:assert/strict';
import test from 'node:test';
import { SeriesBackend } from '../src/backend/series/SeriesBackend.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { IndexedDBService } from '../src/storage/IndexedDBService.js';

for (const returningAvailable of [true,false]) {
  test(`upcoming feed follows both sources' pagination; returning source available: ${returningAvailable}`, async () => {
    const pages = [];
    const backend = new SeriesBackend({
      getUpcomingSeries:async ({page}) => ({page,total_pages:1,total_results:1,
        results:page === 1 ? [{id:1,name:'Premiere',first_air_date:'2099-01-01'}] : []}),
      fetch:async (path,{page}) => {
        if (path === '/discover/tv') {
          if (!returningAvailable) throw new Error('Returning series unavailable');
          pages.push(page);
          return {page,total_pages:4,total_results:4,results:[{id:10+page,name:'Returning',first_air_date:'2000-01-01'}]};
        }
        return {first_air_date:'2000-01-01',status:'Returning Series',
          seasons:[{season_number:2,name:'Next season',air_date:'2099-02-01'}]};
      }
    });
    const vm = new SeriesViewModel(new SeriesRepository(backend,new IndexedDBService()));
    await vm.loadUpcomingSeries();
    assert.equal(vm.state.categoryPagination.upcoming.hasMore,returningAvailable);
    assert.deepEqual(vm.state.upcomingSeries.map(item => item.id),returningAvailable ? [1,11] : [1]);
    if (returningAvailable) {
      await vm.loadUpcomingSeries({append:true});
      assert.deepEqual(pages,[1,2]);
      assert.deepEqual(vm.state.upcomingSeries.map(item => item.id),[1,11,12]);
      assert.equal(vm.state.categoryPagination.upcoming.page,2);
      assert.equal(vm.state.categoryPagination.upcoming.hasMore,true);
    }
  });
}
