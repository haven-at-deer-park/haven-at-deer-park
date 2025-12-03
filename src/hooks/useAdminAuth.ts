import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  email: string;
}

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  // Check if admin is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('admin_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('admin-auth', {
          body: { action: 'verify', token }
        });

        if (error || !data?.valid) {
          sessionStorage.removeItem('admin_token');
          setIsAuthenticated(false);
          setAdmin(null);
        } else {
          setIsAuthenticated(true);
          setAdmin(data.payload);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        sessionStorage.removeItem('admin_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'login', email, password }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Login failed' };
      }

      sessionStorage.setItem('admin_token', data.token);
      setIsAuthenticated(true);
      setAdmin(data.admin);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setAdmin(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'change-password', token, password: newPassword }
      });

      if (error || !data?.success) {
        return { success: false, error: data?.error || 'Password change failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }, []);

  const getToken = useCallback(() => {
    return sessionStorage.getItem('admin_token');
  }, []);

  return {
    isAuthenticated,
    isLoading,
    admin,
    login,
    logout,
    changePassword,
    getToken
  };
}