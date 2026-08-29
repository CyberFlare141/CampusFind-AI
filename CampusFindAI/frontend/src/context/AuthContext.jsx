import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import {
  saveSession,
  clearSession,
  getToken,
  getCachedUser,
  setUnauthorizedHandler,
  isTokenExpired,
} from '../api/client';

const AuthContext = createContext(null);

const ROLES = {
  STUDENT: 'Student',
  SECURITY_OFFICER: 'SecurityOfficer',
  ADMINISTRATOR: 'Administrator',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Bootstrap from localStorage cache so a refresh keeps the user signed in.
    if (getToken() && !isTokenExpired()) {
      return getCachedUser();
    }
    if (getToken() && isTokenExpired()) {
      clearSession();
    }
    return null;
  });
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);

  // If any API call comes back 401, treat the session as dead.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setUser(null);
    });
  }, []);

  const handleAuthSuccess = useCallback((response) => {
    // AuthResponseDto: { token, expiresAt, user: { id, email, role } }
    saveSession({
      token: response.token,
      expiresAt: response.expiresAt,
      user: response.user,
    });
    setUser(response.user);
  }, []);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setAuthError(null);
      try {
        const response = await authApi.login({ email, password });
        handleAuthSuccess(response);
        return response.user;
      } catch (err) {
        setAuthError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [handleAuthSuccess]
  );

  const register = useCallback(
    async (email, password) => {
      setLoading(true);
      setAuthError(null);
      try {
        const response = await authApi.register({ email, password });
        handleAuthSuccess(response);
        return response.user;
      } catch (err) {
        setAuthError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [handleAuthSuccess]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const isOfficer = user?.role === ROLES.SECURITY_OFFICER || user?.role === ROLES.ADMINISTRATOR;

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isOfficer,
      loading,
      authError,
      login,
      register,
      logout,
      clearAuthError: () => setAuthError(null),
    }),
    [user, isOfficer, loading, authError, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { ROLES };
