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
import { blocksClient } from "@/lib/blocks/client";
import type { Role, User } from "@/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  /** True until `iam.me()` has resolved at least once for the current session.
   *  Route guards should treat this as "loading" so an admin changing a user's
   *  IAM role doesn't bounce the user off a now-permitted page in the brief
   *  window where the stale OIDC claim is still the only known role. */
  liveRolePending: boolean;
  user: User | null;
  claims: Record<string, unknown> | null;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const KNOWN_ROLES: readonly Role[] = ["field_officer", "programme_coordinator", "regional_manager"];

function pickRole(raw: unknown): Role | undefined {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate !== "string") return undefined;
  return KNOWN_ROLES.find((r) => r === candidate);
}

interface IamMeShape {
  itemId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Reads the live role from `iam.me()` so that an admin changing the user's
 * IAM role takes effect on next render without requiring an OIDC re-login.
 * Returns `null` if the call fails — the caller should fall back to the
 * OIDC claim role or to "field_officer".
 */
async function fetchLiveRole(): Promise<{ role: Role | null; record: IamMeShape | null }> {
  try {
    const res = (await blocksClient.iam.me()) as { data?: IamMeShape } | undefined;
    const data = res?.data ?? null;
    if (!data) return { role: null, record: null };
    const role = pickRole(data.roles);
    return { role: role ?? null, record: data };
  } catch {
    return { role: null, record: null };
  }
}

function nameFromIam(record: IamMeShape | null, fallbackEmail: string): string {
  if (record) {
    const full = [record.firstName, record.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  if (fallbackEmail) return fallbackEmail.split("@")[0];
  return "Signed-in user";
}

function claimsToUser(
  claims: Record<string, unknown>,
  liveRole: Role | null,
  liveRecord: IamMeShape | null,
): User | null {
  const claimRole = pickRole(claims["role"] ?? claims["roles"]);

  const name =
    (typeof claims["name"] === "string" && (claims["name"] as string)) ||
    nameFromIam(liveRecord, typeof claims["email"] === "string" ? (claims["email"] as string) : "");

  const email =
    (typeof claims["email"] === "string" && (claims["email"] as string)) ||
    (typeof liveRecord?.email === "string" ? (liveRecord.email as string) : "");

  const sub =
    typeof claims["sub"] === "string"
      ? (claims["sub"] as string)
      : typeof claims["id"] === "string"
        ? (claims["id"] as string)
        : (liveRecord?.itemId as string | undefined) ?? "";

  if (!sub && !email) return null;

  return {
    id: sub || email,
    name,
    email,
    role: liveRole ?? claimRole ?? "field_officer",
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STATUS_POLL_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [liveRole, setLiveRole] = useState<Role | null>(null);
  const [liveRecord, setLiveRecord] = useState<IamMeShape | null>(null);
  /** Tracks whether `iam.me()` has resolved for the *current* session at
   *  least once. Reset to false on logout so a fresh login doesn't pass
   *  guards on a stale role from the previous session. */
  const [liveRoleSettled, setLiveRoleSettled] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoginConfigured()) {
      setStatus("unauthenticated");
      setClaims(null);
      setLiveRole(null);
      setLiveRecord(null);
      setLiveRoleSettled(false);
      return;
    }
    if (inFlight.current) return inFlight.current;
    const p = (async () => {
      try {
        const data = (await fetchSessionClaims()) as Record<string, unknown> | null;
        if (data) {
          setClaims(data);
          setStatus("authenticated");
          // Pull the live role alongside the OIDC claim check. If iam.me()
          // fails (network blip, role-based 403), we keep showing the claim
          // role until the next refresh tick — never blank the UI. We only
          // flip `liveRoleSettled` on success so guards can wait for the
          // authoritative answer before deciding to redirect.
          const { role, record } = await fetchLiveRole();
          setLiveRole(role);
          setLiveRecord(record);
          if (role) setLiveRoleSettled(true);
        } else {
          setClaims(null);
          setLiveRole(null);
          setLiveRecord(null);
          setLiveRoleSettled(false);
          setStatus("unauthenticated");
        }
      } catch {
        setClaims(null);
        setLiveRole(null);
        setLiveRecord(null);
        setLiveRoleSettled(false);
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
    setLiveRole(null);
    setLiveRecord(null);
    setLiveRoleSettled(false);
    setStatus("unauthenticated");
  }, []);

  const user = useMemo<User | null>(() => {
    if (status !== "authenticated" || !claims) return null;
    return claimsToUser(claims, liveRole, liveRecord);
  }, [status, claims, liveRole, liveRecord]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      liveRolePending: !liveRoleSettled,
      user,
      claims,
      login,
      logout: doLogout,
      refresh,
    }),
    [status, liveRoleSettled, user, claims, login, doLogout, refresh],
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

/** Derived User from the IAM `me()` role and OIDC identity claims. */
export function useUser(): User | null {
  return useAuth().user;
}

export function isJwtExpired(_token: unknown): boolean {
  // The default OIDC config uses cookie sessions — no locally readable token to check.
  return false;
}
