import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AdminUser } from '../types';
import { adminApi } from '../services/adminApi';
import { ApiError } from '../services/api';

interface AuthState {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canEdit: boolean;
}
const Ctx = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.me().then(setAdmin).catch((e) => { if (!(e instanceof ApiError) || e.status !== 401) console.error(e); }).finally(() => setLoading(false));
    const onUnauthorized = () => setAdmin(null);
    window.addEventListener('admin:unauthorized', onUnauthorized);
    return () => window.removeEventListener('admin:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => setAdmin(await adminApi.login(email, password)), []);
  const logout = useCallback(async () => { try { await adminApi.logout(); } finally { setAdmin(null); } }, []);
  const value = useMemo(() => ({ admin, loading, login, logout, canEdit: admin?.role === 'owner' || admin?.role === 'admin' }), [admin, loading, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
};
