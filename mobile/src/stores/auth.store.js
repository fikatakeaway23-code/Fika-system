import { create } from 'zustand';
import { authApi } from '../lib/api.js';
import { storage } from '../lib/storage.js';
import { registerForPushNotifications, scheduleShiftReminders } from '../lib/notifications.js';

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
    // Get push token before login so we can send it with the request
    let pushToken = null;
    try {
      pushToken = await registerForPushNotifications();
    } catch (_) {
      // Push registration is best-effort
    }

    const { data } = await authApi.login(role, pin, pushToken);
    await storage.saveAuth(data.token, data.user, data.refreshToken);
    set({ token: data.token, user: data.user, isLoggedIn: true });

    // Schedule local shift reminders based on role
    try {
      await scheduleShiftReminders(data.user.role);
    } catch (_) {
      // Non-critical
    }

    return data.user;
  },

  async logout() {
    const { refreshToken } = await storage.getAuth();
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {}); // best-effort
    }
    await storage.clearAuth();
    set({ token: null, user: null, isLoggedIn: false });
  },

  async changePin(targetUserId, currentPin, newPin) {
    await authApi.changePin({ targetUserId, currentPin, newPin });
  },
}));
