import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { completeLogin, fetchSessionClaims, logout, startLogin } from "@/lib/blocks/auth";
import { isLoginConfigured } from "@/lib/blocks/config";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  claims: Record<string, unknown> | null;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STATUS_POLL_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoginConfigured()) {
      setStatus("unauthenticated");
      setClaims(null);
      return;
    }
    if (inFlight.current) return inFlight.current;
    const p = (async () => {
      try {
        const data = (await fetchSessionClaims()) as Record<string, unknown> | null;
        if (data) {
          setClaims(data);
          setStatus("authenticated");
        } else {
          setClaims(null);
          setStatus("unauthenticated");
        }
      } catch {
        setClaims(null);
        setStatus("unauthenticated");
      }
    })();
    inFlight.current = p;
    try {
      await p;
    } finally {
      inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, STATUS_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const login = useCallback(async (returnTo: string = "/") => {
    await startLogin(returnTo);
  }, []);

  const doLogout = useCallback(async () => {
    await logout();
    setClaims(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, claims, login, logout: doLogout, refresh }),
    [status, claims, login, doLogout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Re-export the callback helper for the CallbackPage.
export { completeLogin };

export function isJwtExpired(_token: unknown): boolean {
  // The default OIDC config uses cookie sessions — no locally readable token to check.
  return false;
}
