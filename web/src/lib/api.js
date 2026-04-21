import axios from 'axios';
import { getRefreshToken, setRefreshToken, clearSession } from './auth.js';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT stored in sessionStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('fika_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Silent refresh interceptor — on 401, try to refresh the token before redirecting
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const rToken = getRefreshToken();
      if (!rToken) {
        clearSession();
        window.location.href = '/staff/login';
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
        sessionStorage.setItem('fika_token', data.token);
        setRefreshToken(data.refreshToken);
        refreshQueue.forEach((p) => p.resolve(data.token));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch {
        refreshQueue.forEach((p) => p.reject(err));
        refreshQueue = [];
        clearSession();
        window.location.href = '/staff/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login:     (role, pin) => api.post('/auth/login', { role, pin }),
  changePin: (data)      => api.post('/auth/change-pin', data),
  refresh:   (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout:    (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const shiftApi = {
  getAll:    (params)  => api.get('/shifts',               { params }),
  getByDate: (date)    => api.get(`/shifts/date/${date}`),
  getById:   (id)      => api.get(`/shifts/${id}`),
  create:    (data)    => api.post('/shifts', data),
  update:    (id, data)=> api.put(`/shifts/${id}`, data),
  submit:    (id)      => api.post(`/shifts/${id}/submit`),
};

export const financeApi = {
  getAll:          (params)  => api.get('/finance',                   { params }),
  getByDate:       (date)    => api.get(`/finance/date/${date}`),
  getMonthly:      (m, y)    => api.get(`/finance/monthly/${m}/${y}`),
  getDiscrepancies: ()       => api.get('/finance/discrepancy'),
  create:          (data)    => api.post('/finance', data),
};

export const expenseApi = {
  getAll:    (params)  => api.get('/expenses',              { params }),
  getMonthly:(m, y)    => api.get(`/expenses/monthly/${m}/${y}`),
  create:    (data)    => api.post('/expenses', data),
  update:    (id, data)=> api.put(`/expenses/${id}`, data),
  delete:    (id)      => api.delete(`/expenses/${id}`),
};

export const membershipApi = {
  getAll:          (params)    => api.get('/memberships',                      { params }),
  getById:         (id)        => api.get(`/memberships/${id}`),
  create:          (data)      => api.post('/memberships', data),
  update:          (id, data)  => api.put(`/memberships/${id}`, data),
  addDrink:        (id, delta) => api.post(`/memberships/${id}/drinks`, { delta }), // legacy
  redeem:          (id, data)  => api.post(`/memberships/${id}/redeem`, data),
  getUsage:        (id, params)=> api.get(`/memberships/${id}/usage`,          { params }),
  getUsageSummary: (id, params)=> api.get(`/memberships/${id}/usage/summary`,  { params }),
  renew:           (id)        => api.post(`/memberships/${id}/renew`),
  createAccount:   (id, email) => api.post(`/memberships/${id}/member-account`, { email }),
  deleteAccount:   (id)        => api.delete(`/memberships/${id}/member-account`),
  getQr:           (id)        => api.get(`/memberships/${id}/qr`),
  getTopUpRequests: (status)   => api.get('/memberships/topup-requests', { params: status ? { status } : {} }),
  updateTopUpRequest: (requestId, status) => api.patch(`/memberships/topup-requests/${requestId}`, { status }),
};

export const hrApi = {
  getAll:    (params)  => api.get('/hr',               { params }),
  getByStaff:(staffId) => api.get(`/hr/staff/${staffId}`),
  create:    (data)    => api.post('/hr', data),
  update:    (id, data)=> api.put(`/hr/${id}`, data),
};

export const notionApi = {
  syncAll:   () => api.post('/notion/sync-all'),
  getStatus: () => api.get('/notion/status'),
};

export const reportApi = {
  monthly: (m, y) => api.get(`/reports/monthly/${m}/${y}`),
  weekly:  ()     => api.get('/reports/weekly'),
  drinks:  (p)    => api.get('/reports/drinks', { params: p }),
};

export const analyticsApi = {
  mrr:         ()       => api.get('/analytics/mrr'),
  renewals:    (days)   => api.get('/analytics/renewals', { params: { days } }),
  leaderboard: (m, y)   => api.get('/analytics/leaderboard', { params: { month: m, year: y } }),
};

export const menuApi = {
  getAll:   (params)   => api.get('/menu', { params }),
  create:   (data)     => api.post('/menu', data),
  update:   (id, data) => api.put(`/menu/${id}`, data),
  delete:   (id)       => api.delete(`/menu/${id}`),
  toggle:   (id)       => api.patch(`/menu/${id}/toggle`),
};

export const announcementApi = {
  getActive: ()        => api.get('/announcements'),
  getAll:    ()        => api.get('/announcements/all'),
  create:    (data)    => api.post('/announcements', data),
  update:    (id, data)=> api.put(`/announcements/${id}`, data),
  delete:    (id)      => api.delete(`/announcements/${id}`),
};

export const equipmentApi = {
  getAll:  (params)    => api.get('/equipment', { params }),
  create:  (data)      => api.post('/equipment', data),
  update:  (id, data)  => api.put(`/equipment/${id}`, data),
  delete:  (id)        => api.delete(`/equipment/${id}`),
};

export const targetApi = {
  getAll:     (params) => api.get('/targets', { params }),
  getProgress:()       => api.get('/targets/progress'),
  create:     (data)   => api.post('/targets', data),
  update:     (id, d)  => api.put(`/targets/${id}`, d),
  delete:     (id)     => api.delete(`/targets/${id}`),
};

export const supplierApi = {
  getAll:  (params)    => api.get('/suppliers', { params }),
  create:  (data)      => api.post('/suppliers', data),
  update:  (id, data)  => api.put(`/suppliers/${id}`, data),
  delete:  (id)        => api.delete(`/suppliers/${id}`),
};

export const stockApi = {
  getAll:     (params)    => api.get('/stock', { params }),
  getLowStock: ()         => api.get('/stock/low'),
  create:     (data)      => api.post('/stock', data),
  update:     (id, data)  => api.put(`/stock/${id}`, data),
  adjust:     (id, delta) => api.patch(`/stock/${id}/adjust`, { delta }),
  delete:     (id)        => api.delete(`/stock/${id}`),
};

export const wasteApi = {
  getAll:     (params) => api.get('/waste', { params }),
  getSummary: (params) => api.get('/waste/summary', { params }),
  create:     (data)   => api.post('/waste', data),
  delete:     (id)     => api.delete(`/waste/${id}`),
};

export const scheduleApi = {
  getAll:  (params) => api.get('/schedule', { params }),
  save:    (data)   => api.post('/schedule', data),
  delete:  (id)     => api.delete(`/schedule/${id}`),
};

export const attendanceApi = {
  checkIn:    ()       => api.post('/attendance/checkin'),
  getHistory: (params) => api.get('/attendance', { params }),
};

export const checklistApi = {
  save:       (data)   => api.post('/checklist', data),
  get:        (params) => api.get('/checklist',  { params }),
  getHistory: (params) => api.get('/checklist/history', { params }),
};
