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
  /** Present when authenticated (cookie session). Kept for call-site guards. */
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
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const LEGACY_TOKEN_KEY = "prysm_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const data = await api.me();
    setUser(data.user);
    setStats(data.stats);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    }

    let active = true;
    api
      .me()
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setStats(data.stats);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStats(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.login({ username, password });
    setUser(data.user);
    setLoading(false);
    try {
      const profile = await api.me();
      setStats(profile.stats);
    } catch {
      setStats(null);
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await api.register({ username, email, password });
      setUser(data.user);
      setLoading(false);
      try {
        const profile = await api.me();
        setStats(profile.stats);
      } catch {
        setStats(null);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout — clear local session anyway.
    }
    setUser(null);
    setStats(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      token: user ? "session" : null,
      user,
      stats,
      loading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, stats, loading, login, register, logout, refreshProfile],
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
