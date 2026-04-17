import axios from 'axios';
import { getToken, clearToken } from './auth.js';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const memberApi = {
  login:          (email, password)              => api.post('/member/auth/login', { email, password }),
  changePassword: (currentPassword, newPassword) => api.patch('/member/auth/change-password', { currentPassword, newPassword }),
  getDashboard:   ()                             => api.get('/member/dashboard'),
  getUsage:       (params)                       => api.get('/member/usage', { params }),
  getUsageChart:  (params)                       => api.get('/member/usage/chart', { params }),
  getProfile:     ()                             => api.get('/member/profile'),
  submitTopUp:    (message)                      => api.post('/member/topup', { message }),
};
