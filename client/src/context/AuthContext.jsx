import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on mount using HTTP-only cookie
  const restoreSession = useCallback(async () => {
    try {
      const data = await authService.getMe();
      if (data?.success && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 401 Unauthorized or disconnected: user remains null
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /**
   * Log in user with credentials and set user state.
   */
  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    if (data?.success && data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || 'Login failed');
  };

  /**
   * Register user with name, email, password (always learner role).
   */
  const register = async (name, email, password) => {
    const data = await authService.register({ name, email, password });
    if (data?.success && data?.user) {
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || 'Registration failed');
  };

  /**
   * Log out user and clear state.
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout request warning:', err.message);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    restoreSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
