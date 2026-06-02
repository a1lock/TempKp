import axios from 'axios';

// единый экземпляр axios все запросы идут через него, токен подставляется автоматически
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

// при протухшем токене очищаем хранилище и редиректим на логин
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/');
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api };