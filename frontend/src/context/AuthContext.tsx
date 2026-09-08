import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from '@/api';
import type { User } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getUserInitial: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'ai_risk_platform_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Verify and sync session on mount
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const res = await authApi.getMe();
        if (isMounted && res.data) {
          setUser(res.data);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
        }
      } catch (err: any) {
        // If 401 or not authenticated, clear stored user and token
        if (isMounted) {
          if (err.response?.status === 401) {
            setUser(null);
            localStorage.removeItem(USER_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await authApi.login({ email, password });
      const userData = res.data?.user || res.data;
      const token = res.data?.access_token;
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      setUser(userData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      toast.success(res.data?.message || 'Login successful!');
      setIsAuthModalOpen(false);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid email or password';
      toast.error(msg);
      return false;
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<boolean> => {
    try {
      const res = await authApi.register({ email, password, name });
      const userData = res.data?.user || res.data;
      const token = res.data?.access_token;
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      setUser(userData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      toast.success(res.data?.message || 'Account created successfully!');
      setIsAuthModalOpen(false);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(msg);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      toast.info('Logged out successfully');
    }
  };

  const getUserInitial = (): string => {
    if (!user) return 'G';
    if (user.name && user.name.trim()) {
      return user.name.trim().charAt(0).toUpperCase();
    }
    if (user.email && user.email.trim()) {
      return user.email.trim().charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        getUserInitial,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
