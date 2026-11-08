import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, tokenStore } from "../lib/api";

export interface User {
  id: number;
  email: string | null;
  mobile: string | null;
  full_name: string;
  role: "user" | "admin";
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: {
    email?: string;
    mobile?: string;
    password: string;
    full_name: string;
    disclaimer_version: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!tokenStore.access()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<User>("/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await api<{ access_token: string; refresh_token: string; user: User }>(
      "/auth/login",
      { method: "POST", body: { identifier, password } }
    );
    tokenStore.save(data.access_token, data.refresh_token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (payload: Parameters<AuthState["register"]>[0]) => {
      const data = await api<{ access_token: string; refresh_token: string; user: User }>(
        "/auth/register",
        { method: "POST", body: payload }
      );
      tokenStore.save(data.access_token, data.refresh_token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    const refresh = tokenStore.refresh();
    if (refresh) {
      try {
        await api("/auth/logout", { method: "POST", body: { refresh_token: refresh } });
      } catch {
        /* token may already be dead; clearing locally is what matters */
      }
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
