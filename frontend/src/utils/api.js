import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  console.error('Response error:', error);
  if (error.code === 'ECONNREFUSED') {
    console.error('Backend server is not running on port 5001');
  }
  return Promise.reject(error);
});

export const auth = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  sendOTP: (email) => api.post('/auth/send-otp', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};

export const gd = {
  getAll: () => api.get('/gd'),
  create: (gdData) => api.post('/gd', gdData),
  join: (id) => api.post(`/gd/${id}/join`),
  leave: (id) => api.post(`/gd/${id}/leave`),
  end: (id) => api.patch(`/gd/${id}/end`),
};

export const admin = {
  getAllGDs: () => api.get('/admin/gds'),
  getAllUsers: () => api.get('/admin/users'),
  forceEndGD: (id) => api.patch(`/admin/gds/${id}/force-end`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;