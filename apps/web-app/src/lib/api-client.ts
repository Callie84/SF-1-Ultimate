import axios, { AxiosError, InternalAxiosRequestConfig, AxiosInstance, AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// API Base URL - use empty string for same-origin requests
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Custom API client type that returns data directly
interface ApiClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token
axiosInstance.interceptors.request.use(
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
axiosInstance.interceptors.response.use(
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
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens but don't redirect (let pages handle auth errors)
        Cookies.remove('sf1_access_token');
        Cookies.remove('sf1_refresh_token');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Cast to ApiClient for proper typing (response interceptor returns data directly)
export const api = axiosInstance as unknown as ApiClient;
export const apiClient = api;

export default api;