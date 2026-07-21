"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, type User, type UserStats } from "@/lib/api";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  stats: UserStats | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "prysm_token";

function readStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(() => Boolean(readStoredToken()));

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const data = await api.me(token);
    setUser(data.user);
    setStats(data.stats);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    api
      .me(token)
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setStats(data.stats);
      })
      .catch(() => {
        if (!active) return;
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setStats(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.login({ username, password });
    window.localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setLoading(false);
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await api.register({ username, email, password });
      window.localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setLoading(false);
    },
    [],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setStats(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      stats,
      loading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [token, user, stats, loading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
