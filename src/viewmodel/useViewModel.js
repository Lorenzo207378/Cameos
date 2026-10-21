import { useState, useEffect, useSyncExternalStore } from 'react';
import { SeriesViewModel } from './series/SeriesViewModel.js';
import { MovieViewModel } from './movies/MovieViewModel.js';
import { CameoViewModel } from './cameos/CameoViewModel.js';
import { PersonViewModel } from './person/PersonViewModel.js';
import { UserViewModel } from './user/UserViewModel.js';
import { HomeViewModel } from './home/HomeViewModel.js';

/**
 * useViewModel
 * Generic React 18/19 Custom Hook binding a `BaseViewModel` instance to a React component
 * via `useSyncExternalStore` and lazy `useState` initialization, with automatic connectivity
 * listener and language synchronization.
 *
 * @template T
 * @param {Function} createViewModel - Factory creating the ViewModel instance once per component mount
 * @param {Object} [options={}]
 * @param {string} [options.language] - Active language ('it-IT' | 'en-US')
 * @returns {Object}
 */
export function useViewModel(createViewModel, { language } = {}) {
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

  return {
    ...vm,
    ...state,
    viewModel: vm
  };
}

/**
 * React Custom Hook for TV Series MVVM ViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/series/SeriesRepository.js').SeriesRepository} [options.repository]
 * @returns {Object}
 */
export function useSeriesViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new SeriesViewModel(repository, { language }), { language });
}

/**
 * React Custom Hook for Movies MVVM ViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/movies/MovieRepository.js').MovieRepository} [options.repository]
 * @returns {Object}
 */
export function useMovieViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new MovieViewModel(repository, { language }), { language });
}

/**
 * React Custom Hook for Cameos MVVM ViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/cameos/CameoRepository.js').CameoRepository} [options.repository]
 * @returns {Object}
 */
export function useCameoViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new CameoViewModel(repository, { language }), { language });
}

/**
 * React Custom Hook for Actor/Person MVVM ViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/person/PersonRepository.js').PersonRepository} [options.repository]
 * @returns {Object}
 */
export function usePersonViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new PersonViewModel(repository, { language }), { language });
}

/**
 * React Custom Hook for User Profile & Collections MVVM ViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {import('../repository/user/UserRepository.js').UserRepository} [options.repository]
 * @param {import('../models/User.js').User|null} [options.initialUser=null]
 * @returns {Object}
 */
export function useUserViewModel({ language = 'it-IT', repository, initialUser = null } = {}) {
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
 * React Custom Hook for Home Dashboard MVVM ViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language='it-IT']
 * @param {boolean} [options.autoLoad=false]
 * @param {string} [options.timeWindow='week']
 * @param {Object} [options.repositories]
 * @returns {Object}
 */
export function useHomeViewModel({ language = 'it-IT', autoLoad = false, timeWindow = 'week', repositories } = {}) {
  const bound = useViewModel(() => new HomeViewModel(repositories, { language }), { language });

  useEffect(() => {
    if (autoLoad) {
      bound.viewModel.loadHomeFeed({ timeWindow, language });
    }
  }, [autoLoad, timeWindow, language, bound.viewModel]);

  return bound;
}

export default useViewModel;
