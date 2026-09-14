import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Building2,
  ArrowRight,
  Shield,
  Users,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/providers/AuthProvider";
import { isLoginConfigured } from "@/lib/blocks/config";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") ?? "/";
  const { login, status } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isLoginConfigured();

  // If already authenticated, bounce back to the app.
  if (status === "authenticated") {
    navigate(returnTo, { replace: true });
  }

  const onSignIn = async () => {
    if (!configured || pending) return;
    setError(null);
    setPending(true);
    try {
      await login(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sign-in.");
      setPending(false);
    }
  };

  const callbackUrl =
    typeof window !== "undefined" ? `${window.location.origin}/login/callback` : "/login/callback";

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left — branding */}
      <div className="relative hidden overflow-hidden bg-slate-950 text-slate-100 lg:block">
        {/* base radial wash */}
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.28),transparent_55%)]"
          aria-hidden
        />
        {/* faint perspective grid */}
        <div
          className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(148,163,184,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.7)_1px,transparent_1px)] [background-size:36px_36px]"
          aria-hidden
        />
        {/* soft neon orbs */}
        <div
          className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl animate-pulse"
          style={{ animationDuration: "6s" }}
          aria-hidden
        />
        <div
          className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl animate-pulse"
          style={{ animationDuration: "9s" }}
          aria-hidden
        />
        {/* top + bottom hairline glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" aria-hidden />

        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_24px_-2px_rgba(16,185,129,0.7),0_0_8px_-2px_rgba(45,212,191,0.9)] ring-1 ring-emerald-300/50">
              <Sparkles className="h-5 w-5 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
                NGOField
              </p>
              <p className="text-xs text-slate-400">Beneficiary Request & Case Follow-up</p>
            </div>
          </div>

          <div className="max-w-md">
            <Badge
              variant="outline"
              className="mb-5 border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-[0_0_18px_-4px_rgba(16,185,129,0.6)]"
            >
              <Building2 className="mr-1 h-3 w-3" /> Operating in Kurigram · Gaibandha · Jamalpur · Cox's Bazar
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-slate-50 drop-shadow-[0_0_18px_rgba(16,185,129,0.18),0_0_4px_rgba(99,102,241,0.18)]">
              Cases no longer live in an officer's notebook.
            </h1>
            <p className="mt-4 max-w-md text-balance text-slate-300">
              A unified case-management platform that turns field notes into structured cases — with duplicate-risk detection, household history, follow-up tracking, officer transfer, and donor-safe reporting.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-slate-200">
              {[
                "AI-assisted intake from Banglish field notes",
                "Household 360° history preserved across officer changes",
                "Privacy-controlled access to sensitive information",
                "Aggregate-first donor reporting with full audit trail",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 shadow-[0_0_18px_-8px_rgba(16,185,129,0.7)]">
              <Users className="mb-1 h-4 w-4 text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
              <p className="font-medium text-slate-100">Households</p>
              <p className="text-slate-400">across 4 districts</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 shadow-[0_0_18px_-8px_rgba(139,92,246,0.7)]">
              <Shield className="mb-1 h-4 w-4 text-violet-300 drop-shadow-[0_0_6px_rgba(139,92,246,0.7)]" />
              <p className="font-medium text-slate-100">Privacy-first</p>
              <p className="text-slate-400">role-based access</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 shadow-[0_0_18px_-8px_rgba(56,189,248,0.7)]">
              <Map className="mb-1 h-4 w-4 text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]" />
              <p className="font-medium text-slate-100">3 programmes</p>
              <p className="text-slate-400">Education · Livelihood · Health</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right — single sign-in */}
      <div className="relative flex items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-8">
        {/* base radial wash (lighter, matches left panel palette) */}
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_55%)]"
          aria-hidden
        />
        {/* faint grid (matches left panel) */}
        <div
          className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(99,102,241,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.7)_1px,transparent_1px)] [background-size:36px_36px]"
          aria-hidden
        />
        {/* soft neon orbs (matches left panel) */}
        <div
          className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl animate-pulse"
          style={{ animationDuration: "7s" }}
          aria-hidden
        />
        <div
          className="absolute -left-24 bottom-1/4 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl animate-pulse"
          style={{ animationDuration: "10s" }}
          aria-hidden
        />
        {/* top + bottom hairline glow (matches left panel) */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
          aria-hidden
        />

        <div className="relative w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">NGOField</p>
              <p className="text-xs text-muted-foreground">Case Management</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-7 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Shield className="h-3 w-3" />
              Secure sign-in
            </span>
            <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use your NGOField account to continue to the case management workspace.
            </p>
          </div>

          {/* Sign-in card */}
          <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur shadow-[0_0_48px_-16px_rgba(99,102,241,0.55),0_0_18px_-8px_rgba(16,185,129,0.45)]">
            {/* Top accent line */}
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent"
              aria-hidden
            />

            <CardContent className="space-y-5 p-6">
              {!configured ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-semibold">Sign-in is not configured.</p>
                  <p className="mt-1 text-amber-700/90 dark:text-amber-200/80">
                    Set <code>VITE_BLOCKS_OIDC_CLIENT_ID</code> and <code>VITE_BLOCKS_OIDC_URL</code> in{" "}
                    <code>.env</code>, then register the callback URL below on the OIDC client.
                  </p>
                  <p className="mt-2 break-all rounded bg-background/60 p-2 font-mono text-[11px] text-foreground">
                    {callbackUrl}
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              ) : null}

              {/* Provider identity */}
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-gradient-to-br from-muted/50 to-muted/10 p-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_18px_-2px_rgba(99,102,241,0.65)] ring-1 ring-indigo-300/40">
                  <Sparkles className="h-5 w-5 drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">Continue with Blocks</p>
                  <p className="text-xs text-muted-foreground">Single sign-on · OIDC</p>
                </div>
                <Badge variant="success" className="shrink-0">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Ready
                </Badge>
              </div>

              {/* CTA */}
              <Button
                type="button"
                className="w-full shadow-[0_0_22px_-2px_rgba(99,102,241,0.55),0_0_10px_-2px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_0px_rgba(99,102,241,0.7),0_0_14px_0px_rgba(16,185,129,0.65)]"
                size="lg"
                onClick={onSignIn}
                disabled={!configured || pending}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in with Blocks <ArrowRight className="h-4 w-4" />
              </Button>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3 text-emerald-500" /> Encrypted
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> MFA-ready
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Audit-logged
                </span>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                You will be redirected to the Blocks identity provider to authenticate.
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Need help signing in?</span>
            <a
              href="mailto:support@ngofield.app"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Contact support <ArrowRight className="h-3 w-3" />
            </a>
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            By signing in you agree to NGOField's acceptable-use policy.
          </p>
        </div>
      </div>
    </div>
  );
}
