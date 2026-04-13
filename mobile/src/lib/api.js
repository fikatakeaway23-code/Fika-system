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

// Handle token expiry globally
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['fika_token', 'fika_user']);
      // Navigation reset handled in auth store
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:     (role, pin)   => api.post('/auth/login',      { role, pin }),
  changePin: (data)        => api.post('/auth/change-pin', data),
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
