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
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.25),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.25),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">NGOField</p>
              <p className="text-xs text-slate-400">Beneficiary Request & Case Follow-up</p>
            </div>
          </div>

          <div className="max-w-md">
            <Badge variant="outline" className="mb-5 border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
              <Building2 className="mr-1 h-3 w-3" /> Operating in Kurigram · Gaibandha · Jamalpur · Cox's Bazar
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight">
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
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
              <Users className="mb-1 h-4 w-4 text-emerald-300" />
              <p className="font-medium text-slate-100">Households</p>
              <p className="text-slate-400">across 4 districts</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
              <Shield className="mb-1 h-4 w-4 text-violet-300" />
              <p className="font-medium text-slate-100">Privacy-first</p>
              <p className="text-slate-400">role-based access</p>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3">
              <Map className="mb-1 h-4 w-4 text-sky-300" />
              <p className="font-medium text-slate-100">3 programmes</p>
              <p className="text-slate-400">Education · Livelihood · Health</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right — single sign-in */}
      <div className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">NGOField</p>
              <p className="text-xs text-muted-foreground">Case Management</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your NGOField account to continue.
          </p>

          <Card className="mt-6 border-border/60">
            <CardContent className="space-y-4 pt-5">
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

              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={onSignIn}
                disabled={!configured || pending}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in with Blocks <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="text-[11px] text-muted-foreground">
                You will be redirected to the Blocks identity provider to authenticate.
              </p>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            By signing in you agree to NGOField's acceptable-use policy.
          </p>
        </div>
      </div>
    </div>
  );
}
