import axios from 'axios';

// базовый url бэкенда
export const api = axios.create({
  baseURL: 'http://localhost:5000/api', 
});

// перехватчик для добавления токена авторизации
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});