'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api-client';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('sf1_access_token');
      
      if (token) {
        try {
          await refreshUser();
        } catch (error) {
          console.error('Failed to refresh user:', error);
          Cookies.remove('sf1_access_token');
          Cookies.remove('sf1_refresh_token');
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const data = await apiClient.get('/auth/me');
      setUser(data);
    } catch (error) {
      throw error;
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      const data = await apiClient.post('/auth/login', credentials);

      // Store tokens (handle both nested and flat response formats)
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;

      Cookies.set('sf1_access_token', accessToken, { expires: 7 });
      Cookies.set('sf1_refresh_token', refreshToken, { expires: 30 });

      // Update user state
      setUser(data.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const authData = await apiClient.post('/auth/register', data);

      // Store tokens (handle both nested and flat response formats)
      const accessToken = authData.tokens?.accessToken || authData.accessToken;
      const refreshToken = authData.tokens?.refreshToken || authData.refreshToken;

      Cookies.set('sf1_access_token', accessToken, { expires: 7 });
      Cookies.set('sf1_refresh_token', refreshToken, { expires: 30 });

      // Update user state
      setUser(authData.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user state
      Cookies.remove('sf1_access_token');
      Cookies.remove('sf1_refresh_token');
      setUser(null);
      
      // Redirect to login
      router.push('/auth/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
