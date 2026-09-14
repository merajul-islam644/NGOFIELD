import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import type { Role } from "@/types";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <LoadingScreen />;
  if (status === "unauthenticated") {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Gate a subtree to a list of allowed roles. Field officers hitting a
 * coordinator-only screen get bounced to the dashboard with no error flash —
 * the role chip + sidebar already explain why the link is missing.
 *
 * Waits for `liveRolePending` so an admin changing a user's IAM role doesn't
 * bounce the user off a now-permitted page in the brief window where the
 * stale OIDC claim is still the only known role.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: readonly Role[];
  children: ReactNode;
}) {
  const { status, liveRolePending, user } = useAuth();
  const location = useLocation();

  if (status === "loading" || liveRolePending) return <LoadingScreen />;
  if (status === "unauthenticated") {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
