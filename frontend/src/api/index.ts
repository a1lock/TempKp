import axios from 'axios';

// базовый инстанс axios
export const api = axios.create({
  baseURL: 'http://localhost:5000/api', 
});

// автоматическое подкидывание токена в заголовки
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});