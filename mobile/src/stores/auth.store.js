import { create } from 'zustand';
import { authApi } from '../lib/api.js';
import { storage } from '../lib/storage.js';

export const useAuthStore = create((set, get) => ({
  user:        null,
  token:       null,
  isLoading:   true,
  isLoggedIn:  false,

  // Restore session from AsyncStorage on app start
  async hydrate() {
    try {
      const { token, user } = await storage.getAuth();
      if (token && user) {
        set({ token, user, isLoggedIn: true });
      }
    } catch (_) {
      // Ignore storage errors on cold start
    } finally {
      set({ isLoading: false });
    }
  },

  async login(role, pin) {
    const { data } = await authApi.login(role, pin);
    await storage.saveAuth(data.token, data.user);
    set({ token: data.token, user: data.user, isLoggedIn: true });
    return data.user;
  },

  async logout() {
    await storage.clearAuth();
    set({ token: null, user: null, isLoggedIn: false });
  },

  async changePin(targetUserId, currentPin, newPin) {
    await authApi.changePin({ targetUserId, currentPin, newPin });
  },
}));
