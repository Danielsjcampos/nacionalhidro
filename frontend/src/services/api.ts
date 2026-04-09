import axios from 'axios';

// URL base do seu servidor
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL
});

// Interceptor de Requisição para injetar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Resposta para tratamento global de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 401 Unauthorized - Sessão Expirada ou Token Inválido
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // 500 Internal Server Error
      if (error.response.status === 500) {
        console.error('Erro crítico no servidor capturado pelo interceptor global:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
