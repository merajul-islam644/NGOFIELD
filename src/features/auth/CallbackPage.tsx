import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, completeLogin } from "@/app/providers/AuthProvider";

export default function CallbackPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const result = await completeLogin(window.location.href);
      if (!result.ok) {
        setError(result.message ?? "Authentication failed.");
        return;
      }
      await refresh();
      navigate(result.returnTo, { replace: true });
    })();
  }, [refresh, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-md rounded-lg border border-border/60 bg-card p-6 text-sm">
        {error ? (
          <>
            <h1 className="text-base font-semibold text-destructive">Sign-in failed</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h1 className="text-base font-semibold">Completing sign-in…</h1>
            <p className="mt-2 text-muted-foreground">Hold on while we finish setting up your session.</p>
          </>
        )}
      </div>
    </div>
  );
}
