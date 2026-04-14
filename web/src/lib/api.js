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
