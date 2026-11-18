import { useEffect } from 'react';
import { useUserViewModel } from '../../viewmodel/index.js';

/**
 * Shared profile loader hook for own and visitor profile routes.
 * Initializes `UserViewModel`, loads the target user profile, and hydrates media lists.
 *
 * @param {Object} options
 * @param {string} [options.routeUid]
 * @param {Object|null} [options.user]
 * @param {Object|null} [options.userProfile]
 * @param {string} options.normalizedLang
 * @returns {{ isVisitor: boolean, targetUid: string|null, userVm: ReturnType<typeof useUserViewModel> }}
 */
export function useProfileLoader({
  routeUid = undefined,
  user = null,
  userProfile = null,
  normalizedLang
}) {
  const isVisitor = Boolean(routeUid && (!user?.uid || routeUid !== user.uid));
  const targetUid = isVisitor ? routeUid : (user?.uid || null);

  const userVm = useUserViewModel({
    language: normalizedLang,
    initialUser: isVisitor ? null : (userProfile || user)
  });
  const { loadUser, loadVisitorProfile, hydrateUserMediaLists } = userVm;

  useEffect(() => {
    if (!user?.uid || !targetUid) return undefined;
    let ignore = false;

    const loadPromise = isVisitor
      ? loadVisitorProfile(targetUid)
      : loadUser(targetUid);

    void loadPromise.then((loadedUser) => {
      if (!ignore && loadedUser) {
        void hydrateUserMediaLists({ language: normalizedLang });
      }
    });

    return () => {
      ignore = true;
    };
  }, [user?.uid, targetUid, isVisitor, normalizedLang, loadUser, loadVisitorProfile, hydrateUserMediaLists]);

  return { isVisitor, targetUid, userVm };
}
