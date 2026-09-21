import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, TOKEN_STORAGE_KEY } from '../api/client';
import { CurrentUser } from '../api/types';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (tenantId: string, permission: string) => boolean;
  isTenantAdmin: (tenantId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get<CurrentUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, res.data.accessToken);
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }

  function hasPermission(tenantId: string, permission: string) {
    if (!user) return false;
    if (user.isSystemAdmin) return true;
    const membership = user.memberships.find((m) => m.tenantId === tenantId);
    if (!membership) return false;
    if (membership.role === 'TENANT_ADMIN') return true;
    return membership.permissions.includes(permission);
  }

  function isTenantAdmin(tenantId: string) {
    if (!user) return false;
    if (user.isSystemAdmin) return true;
    return user.memberships.some((m) => m.tenantId === tenantId && m.role === 'TENANT_ADMIN');
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, hasPermission, isTenantAdmin }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  return ctx;
}
