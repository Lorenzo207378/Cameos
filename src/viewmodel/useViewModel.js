import { useState, useEffect, useSyncExternalStore, useMemo } from 'react';
import { SeriesViewModel } from './series/SeriesViewModel.js';
import { MovieViewModel } from './movies/MovieViewModel.js';
import { CameoViewModel } from './cameos/CameoViewModel.js';
import { PersonViewModel } from './person/PersonViewModel.js';
import { SearchViewModel } from './search/SearchViewModel.js';
import { UserViewModel } from './user/UserViewModel.js';
import { SocialViewModel } from './social/SocialViewModel.js';
import { NotificationViewModel } from './notifications/NotificationViewModel.js';
import { ReviewViewModel } from './reviews/ReviewViewModel.js';

/**
 * useViewModel
 * Hook custom generico per React 18/19 che collega un'istanza BaseViewModel al ciclo di rendering
 * di React tramite `useSyncExternalStore` con listener automatici di connettività online/offline.
 *
 * @template {import('./BaseViewModel.js').BaseViewModel} T
 * @param {() => T} createViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language]
 * @returns {T & Record<string, any> & {state: T['state'], viewModel: T}}
 */
export function useViewModel(createViewModel, { language = undefined } = {}) {
  // The factory and its repository are initialization inputs; re-renders retain the instance.
  const [vm] = useState(createViewModel);

  const state = useSyncExternalStore(vm.subscribe, vm.getSnapshot, vm.getSnapshot);

  useEffect(() => {
    if (language) {
      vm.setLanguage(language);
    }
  }, [vm, language]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleOnline = () => vm.updateConnectivity(true);
    const handleOffline = () => vm.updateConnectivity(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [vm]);

  return useMemo(() => {
    const bound = Object.create(vm);
    Object.defineProperties(bound, {
      ...Object.getOwnPropertyDescriptors(state),
      state: { value: state, writable: true, enumerable: true, configurable: true },
      viewModel: { value: vm, writable: true, enumerable: true, configurable: true }
    });
    return bound;
  }, [vm, state]);
}

// Catalog and detail instances outlive sibling mounts so overview, preferences, and reviews share state.
let sharedSeriesVM = null;
let sharedMovieVM = null;
let sharedCatalogCameoVM = null;
let sharedReviewVM = null;

export function getSharedSeriesViewModel(options = {}) {
  if (!sharedSeriesVM) {
    sharedSeriesVM = new SeriesViewModel(undefined, options);
  }
  return sharedSeriesVM;
}

export function getSharedMovieViewModel(options = {}) {
  if (!sharedMovieVM) {
    sharedMovieVM = new MovieViewModel(undefined, options);
  }
  return sharedMovieVM;
}

export function resetSharedViewModels() {
  sharedSeriesVM = null;
  sharedMovieVM = null;
  sharedCatalogCameoVM = null;
  sharedReviewVM = null;
}

export function useSeriesViewModel({ language = 'it-IT', repository = undefined } = {}) {
  return useViewModel(
    () => (repository ? new SeriesViewModel(repository, { language }) : getSharedSeriesViewModel({ language })),
    { language }
  );
}

export function useMovieViewModel({ language = 'it-IT', repository = undefined } = {}) {
  return useViewModel(
    () => (repository ? new MovieViewModel(repository, { language }) : getSharedMovieViewModel({ language })),
    { language }
  );
}

export function useCameoViewModel({ language = 'it-IT', repository = undefined, shared = false } = {}) {
  return useViewModel(() => {
    if (!shared || repository) return new CameoViewModel(repository, { language });
    sharedCatalogCameoVM ||= new CameoViewModel(undefined, { language });
    return sharedCatalogCameoVM;
  }, { language });
}

export function usePersonViewModel({ language = 'it-IT', repository = undefined } = {}) {
  return useViewModel(() => new PersonViewModel(repository, { language }), { language });
}

export function useSearchViewModel({ query = '', filter = 'all', language = 'it-IT', repositories = undefined } = {}) {
  const bound = useViewModel(() => new SearchViewModel(repositories, { language }), { language });
  const { search } = bound;
  useEffect(() => { void search(query, filter, language); }, [query, filter, language, search]);
  return bound;
}

/**
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/user/UserRepository.js').UserRepository} [options.repository]
 * @param {import('../models/User.js').User|Object|null} [options.initialUser]
 */
export function useUserViewModel({ language = 'it-IT', repository = undefined, initialUser = undefined } = {}) {
  const bound = useViewModel(
    () => {
      const vm = new UserViewModel(repository, { language });
      if (initialUser) {
        vm.syncFromUser(initialUser);
      }
      return vm;
    },
    { language }
  );

  useEffect(() => {
    if (initialUser !== undefined && initialUser !== bound.viewModel.state.currentUser) {
      bound.viewModel.syncFromUser(initialUser);
    }
  }, [initialUser, bound.viewModel]);

  return bound;
}

/**
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/social/SocialRepository.js').SocialRepository} [options.repository]
 */
export function useSocialViewModel({ language = 'it-IT', repository = undefined } = {}) {
  return useViewModel(() => new SocialViewModel(repository, { language }), { language });
}

export function useNotificationViewModel({ language = 'it-IT', repository = undefined } = {}) {
  return useViewModel(() => new NotificationViewModel(repository, { language }), { language });
}

/**
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/reviews/ReviewRepository.js').ReviewRepository} [options.repository]
 */
export function useReviewViewModel({ language = 'it-IT', repository = undefined } = {}) {
  return useViewModel(() => {
    if (repository) return new ReviewViewModel(repository, { language });
    sharedReviewVM ||= new ReviewViewModel(undefined, { language });
    return sharedReviewVM;
  }, { language });
}

export default useViewModel;
