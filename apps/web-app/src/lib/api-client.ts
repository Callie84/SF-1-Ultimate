import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// API Base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('sf1_access_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response.data, // ✅ Return only data, not full response
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('sf1_refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Call refresh endpoint
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        // Update tokens
        Cookies.set('sf1_access_token', data.accessToken);
        Cookies.set('sf1_refresh_token', data.refreshToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        Cookies.remove('sf1_access_token');
        Cookies.remove('sf1_refresh_token');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ✅ FIX: Export both 'api' and 'apiClient' for compatibility
export { api as apiClient };

export default api;