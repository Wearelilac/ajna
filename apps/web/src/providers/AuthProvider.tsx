/**
 * W1.1: Auth Provider
 * Demo mode auto-logs in as admin so the shareable prototype is usable immediately.
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { isDemoMode } from '@/demo/config';
import { demoStore } from '@/demo/store';
import { DEMO_USER } from '@/demo/seed';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isDemo: boolean;
  resetDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const demo = isDemoMode();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (demo) {
        const demoUser = demoStore.getUser() || DEMO_USER;
        if (!demoStore.getUser()) {
          await demoStore.login(DEMO_USER.email, 'demo');
        }
        setUser(demoUser);
        return;
      }

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    if (demo) {
      const userData = await demoStore.login(email, password);
      setUser(userData);
      return;
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const userData = await response.json();
    setUser(userData);
  };

  const logout = async () => {
    if (demo) {
      await demoStore.logout();
      setUser(null);
      return;
    }

    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    setUser(null);
  };

  const resetDemo = () => {
    demoStore.reset();
    setUser(DEMO_USER);
    window.location.href = '/app';
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isLoading, isDemo: demo, resetDemo }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
