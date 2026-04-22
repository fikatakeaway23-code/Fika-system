import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  TOKEN:        'fika_token',
  USER:         'fika_user',
  PENDING_SYNC: 'fika_pending_sync',
  DRAFT_SHIFT:  'fika_draft_shift',
  LAST_SYNC:    'fika_last_sync',
};

async function setSecureJson(key, value) {
  await SecureStore.setItemAsync(key, JSON.stringify(value));
}

async function getSecureJson(key) {
  const raw = await SecureStore.getItemAsync(key);
  return raw ? JSON.parse(raw) : null;
}

export const storage = {
  // Auth
  async saveAuth(token, user) {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.TOKEN, token),
      setSecureJson(KEYS.USER, user),
      AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]),
    ]);
  },

  async getAuth() {
    let [token, user] = await Promise.all([
      SecureStore.getItemAsync(KEYS.TOKEN),
      getSecureJson(KEYS.USER),
    ]);

    if (!token && !user) {
      const [[, legacyToken], [, legacyUserStr]] = await AsyncStorage.multiGet([KEYS.TOKEN, KEYS.USER]);
      if (legacyToken || legacyUserStr) {
        token = legacyToken ?? null;
        user = legacyUserStr ? JSON.parse(legacyUserStr) : null;
        if (token && user) {
          await storage.saveAuth(token, user);
        } else {
          await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
        }
      }
    }

    return { token, user };
  },

  async clearAuth() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.TOKEN),
      SecureStore.deleteItemAsync(KEYS.USER),
      AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]),
    ]);
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
