'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api-client';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types/auth';
import { trackRegistration } from '@/lib/analytics';

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

  // Auto-logout when no seedfinderpro tab is visible for 5 minutes.
  // Heartbeat: every 10s, visible tabs write a timestamp to localStorage.
  // When this tab hides, we wait 5min + 10s and check: if the timestamp
  // hasn't been updated in 5 minutes, no tab was visible → logout.
  useEffect(() => {
    const TIMEOUT = 5 * 60 * 1000;   // 5 minutes
    const HEARTBEAT = 10_000;         // 10 seconds
    const LS_KEY = 'sf1_last_active';

    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const updateHeartbeat = () => {
      if (!document.hidden && Cookies.get('sf1_access_token')) {
        localStorage.setItem(LS_KEY, Date.now().toString());
      }
    };

    const doLogout = () => {
      Cookies.remove('sf1_access_token');
      Cookies.remove('sf1_refresh_token');
      setUser(null);
      router.push('/auth/login');
    };

    const handleVisibilityChange = () => {
      if (!Cookies.get('sf1_access_token')) return;

      if (!document.hidden) {
        // Tab became visible → update heartbeat, cancel pending logout
        updateHeartbeat();
        if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
      } else {
        // Tab hidden → check after TIMEOUT+HEARTBEAT if any tab was active
        inactivityTimer = setTimeout(() => {
          const lastActive = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
          if (Date.now() - lastActive >= TIMEOUT) {
            doLogout();
          }
        }, TIMEOUT + HEARTBEAT);
      }
    };

    // Heartbeat while tab is visible
    heartbeat = setInterval(updateHeartbeat, HEARTBEAT);
    updateHeartbeat();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [router]);

  const refreshUser = async () => {
    try {
      const data = await apiClient.get('/api/auth/me');
      setUser(data);
    } catch (error) {
      throw error;
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      const data = await apiClient.post('/api/auth/login', credentials);

      // Store tokens (handle both nested and flat response formats)
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;

      Cookies.set('sf1_access_token', accessToken, { expires: 7 });
      Cookies.set('sf1_refresh_token', refreshToken, { expires: 30 });

      // Update user state — Redirect wird von der Login-Seite selbst gesteuert
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const authData = await apiClient.post('/api/auth/register', data);

      // Store tokens (handle both nested and flat response formats)
      const accessToken = authData.tokens?.accessToken || authData.accessToken;
      const refreshToken = authData.tokens?.refreshToken || authData.refreshToken;

      Cookies.set('sf1_access_token', accessToken, { expires: 7 });
      Cookies.set('sf1_refresh_token', refreshToken, { expires: 30 });

      // Update user state
      setUser(authData.user);

      // Analytics: Registrierung tracken
      trackRegistration();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and user state
      Cookies.remove('sf1_access_token');
      Cookies.remove('sf1_refresh_token');
      sessionStorage.removeItem('sf1_admin_unlocked');
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
