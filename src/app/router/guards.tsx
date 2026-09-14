import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

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
