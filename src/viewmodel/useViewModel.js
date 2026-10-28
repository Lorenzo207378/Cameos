import { useState, useEffect, useSyncExternalStore, useMemo } from 'react';
import { SeriesViewModel } from './series/SeriesViewModel.js';
import { MovieViewModel } from './movies/MovieViewModel.js';
import { CameoViewModel } from './cameos/CameoViewModel.js';
import { PersonViewModel } from './person/PersonViewModel.js';
import { UserViewModel } from './user/UserViewModel.js';
import { HomeViewModel } from './home/HomeViewModel.js';
import { SocialViewModel } from './social/SocialViewModel.js';
import { NotificationViewModel } from './notifications/NotificationViewModel.js';
import { ReviewViewModel } from './reviews/ReviewViewModel.js';

/**
 * useViewModel
 * Hook custom generico per React 18/19 che collega un'istanza BaseViewModel al ciclo di rendering
 * di React tramite `useSyncExternalStore` con listener automatici di connettività online/offline.
 *
 * @param {Function} createViewModel
 * @param {Object} [options={}]
 * @param {string} [options.language]
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

  return useMemo(
    () => ({
      ...vm,
      ...state,
      state,
      viewModel: vm
    }),
    [vm, state]
  );
}

let sharedSeriesVM = null;
let sharedMovieVM = null;

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
}

export function useSeriesViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(
    () => (repository ? new SeriesViewModel(repository, { language }) : getSharedSeriesViewModel({ language })),
    { language }
  );
}

export function useMovieViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(
    () => (repository ? new MovieViewModel(repository, { language }) : getSharedMovieViewModel({ language })),
    { language }
  );
}

export function useCameoViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new CameoViewModel(repository, { language }), { language });
}

export function usePersonViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new PersonViewModel(repository, { language }), { language });
}

export function useHomeViewModel({ language = 'it-IT', autoLoad = false, timeWindow = 'month', repositories } = {}) {
  const bound = useViewModel(() => new HomeViewModel(repositories, { language }), { language });

  useEffect(() => {
    if (autoLoad) {
      bound.viewModel.loadHomeFeed({ timeWindow, language });
    }
  }, [autoLoad, timeWindow, language, bound.viewModel]);

  return bound;
}

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

export function useSocialViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new SocialViewModel(repository, { language }), { language });
}

export function useNotificationViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new NotificationViewModel(repository, { language }), { language });
}

export function useReviewViewModel({ language = 'it-IT', repository } = {}) {
  return useViewModel(() => new ReviewViewModel(repository, { language }), { language });
}

export default useViewModel;
