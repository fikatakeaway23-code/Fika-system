import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('fika_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Silent refresh interceptor — on 401, try refresh before clearing session
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const rToken = await AsyncStorage.getItem('fika_refresh_token');
      if (!rToken) {
        await AsyncStorage.multiRemove(['fika_token', 'fika_user', 'fika_refresh_token']);
        return Promise.reject(err);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: rToken });
        await AsyncStorage.multiSet([
          ['fika_token', data.token],
          ['fika_refresh_token', data.refreshToken],
        ]);
        refreshQueue.forEach((p) => p.resolve(data.token));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch {
        refreshQueue.forEach((p) => p.reject(err));
        refreshQueue = [];
        await AsyncStorage.multiRemove(['fika_token', 'fika_user', 'fika_refresh_token']);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadPhoto = async (uri) => {
  const formData = new FormData();
  // React Native fetch/axios requires name, type, and uri for file uploads
  formData.append('photo', {
    uri,
    name: `photo_${Date.now()}.jpg`,
    type: 'image/jpeg',
  });

  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:     (role, pin, pushToken) => api.post('/auth/login', { role, pin, pushToken }),
  changePin: (data)                 => api.post('/auth/change-pin', data),
  logout:    (refreshToken)         => api.post('/auth/logout',     { refreshToken }),
};

// ── Shifts ────────────────────────────────────────────────────────────────────
export const shiftApi = {
  create:    (data)        => api.post('/shifts',               data),
  getAll:    (params)      => api.get('/shifts',                { params }),
  getByDate: (date)        => api.get(`/shifts/date/${date}`),
  getById:   (id)          => api.get(`/shifts/${id}`),
  update:    (id, data)    => api.put(`/shifts/${id}`,          data),
  submit:    (id)          => api.post(`/shifts/${id}/submit`),
};

// ── Inventory / Waste / Espresso ──────────────────────────────────────────────
export const inventoryApi = {
  upsert:    (data)        => api.post('/inventory',            data),
  getByShift:(id)          => api.get(`/inventory/shift/${id}`),
};

// ── Finance ───────────────────────────────────────────────────────────────────
export const financeApi = {
  create:       (data)     => api.post('/finance',              data),
  getAll:       (params)   => api.get('/finance',               { params }),
  getByDate:    (date)     => api.get(`/finance/date/${date}`),
  getMonthly:   (m, y)     => api.get(`/finance/monthly/${m}/${y}`),
  getDiscrepancies: ()     => api.get('/finance/discrepancy'),
};

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expenseApi = {
  create:    (data)        => api.post('/expenses',             data),
  getAll:    (params)      => api.get('/expenses',              { params }),
  getMonthly:(m, y)        => api.get(`/expenses/monthly/${m}/${y}`),
  update:    (id, data)    => api.put(`/expenses/${id}`,        data),
  delete:    (id)          => api.delete(`/expenses/${id}`),
};

// ── Memberships ───────────────────────────────────────────────────────────────
export const membershipApi = {
  create:    (data)        => api.post('/memberships',          data),
  getAll:    (params)      => api.get('/memberships',           { params }),
  getById:   (id)          => api.get(`/memberships/${id}`),
  update:    (id, data)    => api.put(`/memberships/${id}`,     data),
  delete:    (id)          => api.delete(`/memberships/${id}`),
  addDrink:  (id, delta)   => api.post(`/memberships/${id}/drinks`, { delta }),
};

// ── HR ────────────────────────────────────────────────────────────────────────
export const hrApi = {
  create:    (data)        => api.post('/hr',                   data),
  getAll:    (params)      => api.get('/hr',                    { params }),
  getByStaff:(staffId)     => api.get(`/hr/staff/${staffId}`),
  update:    (id, data)    => api.put(`/hr/${id}`,              data),
};

// ── Notion ────────────────────────────────────────────────────────────────────
export const notionApi = {
  syncOne:   (type, id)    => api.post(`/notion/sync/${type}/${id}`),
  syncAll:   ()            => api.post('/notion/sync-all'),
  getStatus: ()            => api.get('/notion/status'),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  monthly:   (m, y)        => api.get(`/reports/monthly/${m}/${y}`),
  weekly:    ()            => api.get('/reports/weekly'),
  drinks:    (params)      => api.get('/reports/drinks',        { params }),
};
