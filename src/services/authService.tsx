import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useAuth as useBlocksAuth } from "@/app/providers/AuthProvider";
import { DEMO_USERS } from "@/data/users";
import type { User, Role } from "@/types";

// Adapter: the app's pages consume `user.role`/`user.id`/etc. from a shape that
// predates Blocks. We derive a User from the IAM claims when authenticated,
// falling back to a deterministic demo user for offline exploration.

const STORAGE_KEY = "ngofield.session.v1";
const DEFAULT_USER: User = DEMO_USERS[0];

interface AuthContextValue {
  user: User;
  signIn: (userId: string) => void;
  signOut: () => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function claimsToUser(claims: Record<string, unknown>): User {
  // IAM returns OIDC claims; roles live in `role` (string or string[]). Map them
  // to the NGOField role vocabulary where possible.
  const roleRaw = claims["role"] ?? claims["roles"];
  const role = Array.isArray(roleRaw) ? roleRaw[0] : roleRaw;
  const claimRole = typeof role === "string" ? role : undefined;
  const matched: Role | undefined = (["field_officer", "programme_coordinator", "regional_manager"] as Role[]).find(
    (r) => r === claimRole,
  );

  const name =
    (typeof claims["name"] === "string" && (claims["name"] as string)) ||
    (typeof claims["preferred_username"] === "string" && (claims["preferred_username"] as string)) ||
    DEFAULT_USER.name;

  const email =
    (typeof claims["email"] === "string" && (claims["email"] as string)) ||
    DEFAULT_USER.email;

  const sub = typeof claims["sub"] === "string" ? (claims["sub"] as string) : DEFAULT_USER.id;

  return {
    ...DEFAULT_USER,
    id: sub,
    name,
    email,
    role: matched ?? DEFAULT_USER.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const blocks = useBlocksAuth();
  const [demoUser, setDemoUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as User;
    } catch {
      /* ignore */
    }
    return null;
  });

  useEffect(() => {
    if (demoUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
    else localStorage.removeItem(STORAGE_KEY);
  }, [demoUser]);

  // While Blocks is determining the session, fall back to the cached or default
  // demo user so the app can render. Once authenticated, replace with claims.
  const user: User = useMemo(() => {
    if (blocks.status === "authenticated" && blocks.claims) {
      return claimsToUser(blocks.claims);
    }
    return demoUser ?? DEFAULT_USER;
  }, [blocks.status, blocks.claims, demoUser]);

  const signIn = useCallback(
    (userId: string) => {
      // Demo sign-in: pick the named demo user and persist it locally. Real OIDC
      // sign-in goes through `useBlocksAuth().login()` in the LoginPage.
      const found = DEMO_USERS.find((u) => u.id === userId);
      if (found) setDemoUser(found);
    },
    [],
  );

  const signOut = useCallback(async () => {
    setDemoUser(null);
    if (blocks.status === "authenticated") {
      await blocks.logout();
    }
  }, [blocks]);

  const switchRole = useCallback((role: Role) => {
    const found = DEMO_USERS.find((u) => u.role === role);
    if (found) setDemoUser(found);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn, signOut, switchRole }),
    [user, signIn, signOut, switchRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const { user } = useAuth();
  return user;
}

export const ROLE_LABEL: Record<Role, string> = {
  field_officer: "Field Officer",
  programme_coordinator: "Programme Coordinator",
  regional_manager: "Regional Manager",
};
