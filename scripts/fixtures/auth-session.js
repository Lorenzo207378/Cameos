// Only the lifecycle-test instance of AuthContext uses these controlled dependencies.
export const auth = { currentUser: null };
const listeners = new Set();
export const requests = { reads: [], updates: [], syncs: [] };
export let saves = 0;

function pending(kind, uid) {
  return new Promise((resolve, reject) => requests[kind].push({ uid, resolve, reject }));
}

export function onAuthStateChanged(_auth, callback) {
  listeners.add(callback);
  void callback(auth.currentUser);
  return () => listeners.delete(callback);
}

export function changeUser(uid) {
  auth.currentUser = uid ? { uid } : null;
  for (const callback of listeners) void callback(auth.currentUser);
}

export function subscriberCount() {
  return listeners.size;
}

export const userRepository = {
  getSessionUser: (uid) => pending('reads', uid),
  updateUser: (uid) => pending('updates', uid),
  syncPendingChanges: (uid) => pending('syncs', uid),
  clearSessionUser: async () => {},
  saveUser: async (user) => { saves += 1; return user; }
};
