import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN:         'fika_token',
  USER:          'fika_user',
  REFRESH_TOKEN: 'fika_refresh_token',
  PENDING_SYNC:  'fika_pending_sync',
  DRAFT_SHIFT:   'fika_draft_shift',
  LAST_SYNC:     'fika_last_sync',
};

export const storage = {
  // Auth
  async saveAuth(token, user, refreshToken) {
    const pairs = [
      [KEYS.TOKEN, token],
      [KEYS.USER,  JSON.stringify(user)],
    ];
    if (refreshToken) pairs.push([KEYS.REFRESH_TOKEN, refreshToken]);
    await AsyncStorage.multiSet(pairs);
  },

  async getAuth() {
    const [[, token], [, userStr], [, refreshToken]] = await AsyncStorage.multiGet([
      KEYS.TOKEN, KEYS.USER, KEYS.REFRESH_TOKEN,
    ]);
    return { token, user: userStr ? JSON.parse(userStr) : null, refreshToken };
  },

  async clearAuth() {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER, KEYS.REFRESH_TOKEN]);
  },

  // Draft shift (offline-first)
  async saveDraftShift(data) {
    await AsyncStorage.setItem(KEYS.DRAFT_SHIFT, JSON.stringify(data));
  },

  async getDraftShift() {
    const v = await AsyncStorage.getItem(KEYS.DRAFT_SHIFT);
    return v ? JSON.parse(v) : null;
  },

  async clearDraftShift() {
    await AsyncStorage.removeItem(KEYS.DRAFT_SHIFT);
  },

  // Pending sync queue (offline operations)
  async getPendingSync() {
    const v = await AsyncStorage.getItem(KEYS.PENDING_SYNC);
    return v ? JSON.parse(v) : [];
  },

  async addPendingSync(operation) {
    const queue = await storage.getPendingSync();
    queue.push({ ...operation, queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(queue));
  },

  async clearPendingSync() {
    await AsyncStorage.removeItem(KEYS.PENDING_SYNC);
  },

  async removeFromPendingSync(id) {
    const queue = await storage.getPendingSync();
    const updated = queue.filter((op) => op.id !== id);
    await AsyncStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(updated));
  },

  // Last sync timestamp
  async setLastSync(iso) {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, iso);
  },

  async getLastSync() {
    return AsyncStorage.getItem(KEYS.LAST_SYNC);
  },
};
