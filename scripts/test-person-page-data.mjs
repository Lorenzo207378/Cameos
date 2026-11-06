import test from 'node:test';
import assert from 'node:assert/strict';
import { PersonViewModel } from '../src/viewmodel/person/PersonViewModel.js';
import { Person } from '../src/models/Person.js';

test('person page data preserves explicit role choice, cameo exclusion and creative overlaps', () => {
 const vm = new PersonViewModel({});
 const profile = new Person({id:42,name:'Director',known_for_department:'Directing'});
 const credit={id:1,mediaType:'movie',title:'Film',job:'Director'};
 const cameo={id:42,mediaId:1,mediaType:'movie'};
 vm.setState({personProfile:profile,filmography:{profile,cast:[credit],crew:[credit]}});
 const creative=vm.getPersonPageData(42,[cameo],{language:'en'});
 assert.equal(creative.person,profile);
 assert.equal(creative.credits.length,1);
 assert.deepEqual(creative.credits[0].creditRoleKeys,['detail.directing']);
 assert.deepEqual(creative.cameos,[cameo]);
 assert.equal(creative.imageSources.length,3);
 assert.equal(vm.getPersonPageData('42',[cameo],{creditsMode:'cast'}).credits.length,0);
 assert.equal(vm.getPersonPageData(99,[],{}).person,null);
 assert.equal(vm.getPersonPageData(99,[],{}).credits.length,0);
});
