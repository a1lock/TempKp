import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', 
});

// подстановка токена в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api };