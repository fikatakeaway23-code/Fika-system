import axios from 'axios';

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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('fika_token');
      sessionStorage.removeItem('fika_user');
      window.location.href = '/staff/login';
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login:     (role, pin) => api.post('/auth/login', { role, pin }),
  changePin: (data)      => api.post('/auth/change-pin', data),
};

export const shiftApi = {
  getAll:    (params)  => api.get('/shifts',               { params }),
  getByDate: (date)    => api.get(`/shifts/date/${date}`),
  getById:   (id)      => api.get(`/shifts/${id}`),
  update:    (id, data)=> api.put(`/shifts/${id}`, data),
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
  getAll:   (params)   => api.get('/memberships',          { params }),
  getById:  (id)       => api.get(`/memberships/${id}`),
  create:   (data)     => api.post('/memberships', data),
  update:   (id, data) => api.put(`/memberships/${id}`, data),
  addDrink: (id, delta)=> api.post(`/memberships/${id}/drinks`, { delta }),
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
