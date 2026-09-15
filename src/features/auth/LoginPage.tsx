import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileSearch,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  AlertTriangle,
  Activity,
  GraduationCap,
  Stethoscope,
  BriefcaseBusiness,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
      setError(
        err instanceof Error ? err.message : "Unable to start authentication.",
      );

      setPending(false);
    }
  };

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/login/callback`
      : "/login/callback";

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf7] text-slate-900">
      {/* =========================================================
          COLORFUL BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[550px] w-[550px] rounded-full bg-fuchsia-300/25 blur-[110px]" />

        <div className="absolute right-[-180px] top-[-100px] h-[550px] w-[550px] rounded-full bg-cyan-300/25 blur-[120px]" />

        <div className="absolute bottom-[-220px] left-[15%] h-[550px] w-[550px] rounded-full bg-yellow-200/30 blur-[120px]" />

        <div className="absolute bottom-[-150px] right-[20%] h-[450px] w-[450px] rounded-full bg-emerald-300/20 blur-[110px]" />
      </div>

      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-6 lg:px-10">
          {/* Logo */}

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-orange-400 blur-md opacity-40" />

              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 shadow-lg">
                <HeartHandshake className="h-5 w-5 text-white" />
              </div>
            </div>

            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900">
                NGOField
              </div>

              <div className="text-[10px] font-medium text-slate-400">
                Beneficiary Case Management
              </div>
            </div>
          </div>

          {/* Header status */}

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-[10px] font-medium text-emerald-700 shadow-sm sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              System operational
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-medium text-white">
              <ShieldCheck className="h-3 w-3 text-cyan-300" />
              Secure
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN
      ========================================================= */}

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-[1500px] items-center gap-12 px-6 pb-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        {/* =======================================================
            LEFT CONTENT
        ======================================================= */}

        <section className="relative py-8 lg:py-12">
          {/* Eyebrow */}

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-700">
              Field operations platform
            </span>
          </div>

          {/* =====================================================
              ORIGINAL HERO CONTENT
          ===================================================== */}

          <h1 className="max-w-3xl text-5xl font-black leading-[1] tracking-[-0.055em] text-slate-950 sm:text-6xl xl:text-[72px]">
            A case file that
            <br />
            <span className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              follows the family
            </span>
            <br />
            <span className="text-slate-950">— not the officer.</span>
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
            Capture field requests, structure messy notes, understand the
            household history, and keep every follow-up connected — even when
            officers change areas.
          </p>

          {/* =====================================================
              ORIGINAL WORKFLOW
          ===================================================== */}

          <div className="mt-9">
            <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
              From field note to follow-up
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <WorkflowCard
                number="01"
                title="Capture"
                description="Record the request"
                icon={FileSearch}
                gradient="from-orange-400 to-pink-500"
              />

              <WorkflowCard
                number="02"
                title="Structure"
                description="AI organizes the note"
                icon={Sparkles}
                gradient="from-purple-500 to-fuchsia-500"
              />

              <WorkflowCard
                number="03"
                title="Review"
                description="Coordinator decides"
                icon={CheckCircle2}
                gradient="from-cyan-400 to-blue-500"
              />

              <WorkflowCard
                number="04"
                title="Follow up"
                description="Never lose the case"
                icon={Clock3}
                gradient="from-emerald-400 to-teal-500"
              />
            </div>
          </div>

          {/* =====================================================
              AI FIELD NOTE
          ===================================================== */}

          <div className="relative mt-8 max-w-[700px]">
            {/* Decorative yellow shape */}

            <div className="absolute -right-3 -top-3 h-10 w-10 rounded-xl bg-yellow-300 rotate-12 shadow-md" />

            <div className="relative overflow-hidden rounded-[24px] border border-white bg-white shadow-[0_25px_70px_-35px_rgba(91,33,182,0.35)]">
              {/* Color bar */}

              <div className="h-1.5 bg-gradient-to-r from-orange-400 via-fuchsia-500 to-cyan-400" />

              <div className="p-5 sm:p-6">
                {/* Header */}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-slate-800">
                        AI field-note assistant
                      </div>

                      <div className="text-[8px] text-slate-400">
                        Draft for coordinator review
                      </div>
                    </div>
                  </div>

                  <Badge className="border-0 bg-emerald-50 text-[8px] font-bold text-emerald-700 hover:bg-emerald-50">
                    STRUCTURED
                  </Badge>
                </div>

                {/* Note */}

                <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate-50 via-purple-50/50 to-fuchsia-50/40 p-4">
                  <p className="font-mono text-[10px] leading-5 text-slate-500">
                    “Rekha bibi husband sick 3 months income nai 2 child school
                    e jay na stipend lagbe urgent.”
                  </p>
                </div>

                {/* AI result */}

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <AIResult
                    label="Need"
                    value="Education support"
                    color="orange"
                  />

                  <AIResult label="Urgency" value="High" color="pink" />

                  <AIResult
                    label="Follow-up"
                    value="Coordinator review"
                    color="purple"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              PROGRAMMES
          ===================================================== */}

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Programme
              icon={GraduationCap}
              title="Education"
              className="bg-orange-50 text-orange-700 ring-orange-200"
            />

            <Programme
              icon={Stethoscope}
              title="Health"
              className="bg-cyan-50 text-cyan-700 ring-cyan-200"
            />

            <Programme
              icon={BriefcaseBusiness}
              title="Livelihood"
              className="bg-emerald-50 text-emerald-700 ring-emerald-200"
            />
          </div>

          {/* =====================================================
              ORIGINAL STATS
          ===================================================== */}

          <div className="mt-7 flex flex-wrap gap-3">
            <Stat value="360°" label="Household view" color="purple" />

            <Stat value="01" label="Shared case history" color="orange" />

            <Stat value="100%" label="Donor-safe reporting" color="cyan" />

            <Stat value="RBAC" label="Privacy-first" color="emerald" />
          </div>
        </section>

        {/* =======================================================
            RIGHT LOGIN
        ======================================================= */}

        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[430px]">
            {/* Color glow */}

            <div className="relative">
              <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-br from-fuchsia-300/30 via-purple-300/20 to-cyan-300/30 blur-2xl" />

              {/* Login card */}

              <div className="relative overflow-hidden rounded-[30px] border border-white bg-white/95 shadow-[0_35px_100px_-40px_rgba(76,29,149,0.45)] backdrop-blur-xl">
                {/* Gradient top */}

                <div className="h-2 bg-gradient-to-r from-orange-400 via-fuchsia-500 via-purple-500 to-cyan-400" />

                <div className="p-7 sm:p-9">
                  {/* Heading */}

                  <div className="mb-7">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 shadow-lg shadow-fuchsia-300/30">
                      <LockKeyhole className="h-6 w-6 text-white" />
                    </div>

                    <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950">
                      Welcome back
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Sign in to continue to your secure NGOField workspace.
                    </p>
                  </div>

                  {/* =================================================
                      BLOCKS IDENTITY
                  ================================================= */}

                  <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-purple-50 p-4 ring-1 ring-slate-200/80">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                        <ShieldCheck className="h-5 w-5 text-purple-600" />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          Blocks Identity
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Secure single sign-on
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        READY
                      </div>
                    </div>
                  </div>

                  {/* Configuration warning */}

                  {!configured && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-amber-900">
                            Sign-in is not configured.
                          </p>

                          <p className="mt-1 text-[10px] leading-5 text-amber-700">
                            Configure your Blocks OIDC client before signing in.
                          </p>

                          <code className="mt-3 block break-all rounded-lg bg-white/70 p-2 font-mono text-[8px] text-amber-800">
                            {callbackUrl}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error */}

                  {error && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  {/* =================================================
                      SIGN IN BUTTON
                  ================================================= */}

                  <Button
                    type="button"
                    size="lg"
                    className="group mt-6 h-14 w-full rounded-2xl border-0 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-sm font-bold text-white shadow-lg shadow-fuchsia-300/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-fuchsia-300/40"
                    onClick={onSignIn}
                    disabled={!configured || pending}
                  >
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Sign in with Blocks
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  {/* =================================================
                      TRUST SIGNALS
                  ================================================= */}

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <div className="grid grid-cols-3 gap-2">
                      <TrustItem icon={ShieldCheck} label="Protected" />

                      <TrustItem icon={Users} label="Role-based" />

                      <TrustItem icon={Activity} label="Audit logged" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =====================================================
                ROLE CARDS
            ===================================================== */}

            <div className="mt-6">
              <div className="mb-3 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Access based on your role
              </div>

              <div className="grid grid-cols-3 gap-2">
                <RoleCard
                  title="Field officer"
                  subtitle="Capture"
                  icon={MapPin}
                  gradient="from-orange-400 to-pink-500"
                />

                <RoleCard
                  title="Coordinator"
                  subtitle="Review"
                  icon={CheckCircle2}
                  gradient="from-purple-500 to-fuchsia-500"
                />

                <RoleCard
                  title="Manager"
                  subtitle="Monitor"
                  icon={Activity}
                  gradient="from-cyan-400 to-blue-500"
                />
              </div>
            </div>

            {/* =====================================================
                FOOTER
            ===================================================== */}

            <div className="mt-7 text-center">
              <div className="flex items-center justify-center gap-2 text-[9px] text-slate-400">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Beneficiary information is protected through role-based access
                and audit logging.
              </div>

              <p className="mt-3 text-[9px] text-slate-300">
                NGOField · Beneficiary Case Management
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =============================================================
   WORKFLOW CARD
============================================================= */

function WorkflowCard({
  number,
  title,
  description,
  icon: Icon,
  gradient,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className="group rounded-2xl border border-white bg-white/80 p-3 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
      >
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[8px] font-bold text-slate-300">{number}</span>

        <span className="text-[10px] font-bold text-slate-800">{title}</span>
      </div>

      <p className="mt-1 text-[8px] leading-4 text-slate-400">{description}</p>
    </div>
  );
}

/* =============================================================
   AI RESULT
============================================================= */

function AIResult({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "orange" | "pink" | "purple";
}) {
  const styles = {
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    pink: "bg-pink-50 text-pink-700 ring-pink-100",
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
  };

  return (
    <div className={`rounded-xl p-3 ring-1 ${styles[color]}`}>
      <div className="text-[8px] font-bold uppercase tracking-wider opacity-60">
        {label}
      </div>

      <div className="mt-1 text-[10px] font-bold">{value}</div>
    </div>
  );
}

/* =============================================================
   PROGRAMME
============================================================= */

function Programme({
  icon: Icon,
  title,
  className,
}: {
  icon: React.ElementType;
  title: string;
  className: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-[9px] font-bold ring-1 ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {title}
    </div>
  );
}

/* =============================================================
   STAT
============================================================= */

function Stat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: "purple" | "orange" | "cyan" | "emerald";
}) {
  const styles = {
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${styles[color]}`}>
      <div className="text-sm font-black">{value}</div>

      <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wider opacity-60">
        {label}
      </div>
    </div>
  );
}

/* =============================================================
   TRUST ITEM
============================================================= */

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-3">
      <Icon className="h-3.5 w-3.5 text-emerald-500" />

      <span className="text-[8px] font-bold text-slate-500">{label}</span>
    </div>
  );
}

/* =============================================================
   ROLE CARD
============================================================= */

function RoleCard({
  title,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className="group rounded-2xl border border-white bg-white/80 p-3 text-center shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg">
      <div
        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
      >
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>

      <p className="mt-2 text-[9px] font-bold text-slate-700">{title}</p>

      <p className="mt-0.5 text-[8px] text-slate-400">{subtitle}</p>
    </div>
  );
}

// import { useState } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import {
//   Sparkles,
//   CheckCircle2,
//   Loader2,
//   Building2,
//   ArrowRight,
//   Shield,
//   Users,
//   PenLine,
//   ShieldCheck,
//   RefreshCw,
//   Quote,
//   GraduationCap,
//   Stethoscope,
//   HandHeart,
//   BarChart3,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { useAuth } from "@/app/providers/AuthProvider";
// import { isLoginConfigured } from "@/lib/blocks/config";

// // 4-step workflow — the case-management journey from a field visit to a
// // closed-out follow-up. Each step is the user's actual role and outcome, so
// // officers, coordinators, and donors all see themselves in the diagram.
// const WORKFLOW = [
//   {
//     icon: PenLine,
//     title: "Capture",
//     body:
//       "Officer types a half-page Banglish note on a phone. No forms, no offline sync issues.",
//   },
//   {
//     icon: Sparkles,
//     title: "Structure",
//     body:
//       "Claude drafts programme, urgency, household context, and proposed stipend in seconds.",
//   },
//   {
//     icon: ShieldCheck,
//     title: "Review",
//     body:
//       "Coordinator approves or adjusts. Duplicate-risk is auto-flagged against 12-month history.",
//   },
//   {
//     icon: RefreshCw,
//     title: "Follow up",
//     body:
//       "Household profile, schedule, and donor-safe report stay in sync across officer transfers.",
//   },
// ];

// // Realistic sample — what an actual field note looks like and what the AI
// // drafts from it. Replaces abstract value-prop bullets with a tangible
// // before/after, which is the strongest sales argument for this audience.
// const SAMPLE = {
//   input:
//     "Father sick 3 mas, income nai. Two school-age children dropped out of Char Bagua primary. Wife does day labour when she can.",
//   programme: "Livelihood",
//   urgency: "High",
//   stipend: "BDT 5,000",
//   summary:
//     "Four-member household in Char Bagua has lost primary income after the father fell ill three months ago. Two school-age children have dropped out of primary. The family needs urgent livelihood support and education re-enrolment before the next school term.",
// };

// // Three programmes we operate — keeps the scope concrete so a first-time
// // visitor can place themselves in the workflow.
// const PROGRAMMES = [
//   {
//     icon: GraduationCap,
//     name: "Education",
//     body: "Stipends, re-enrolment, supplies.",
//     tone: "emerald" as const,
//   },
//   {
//     icon: Stethoscope,
//     name: "Health",
//     body: "UHC referral, MAM/SAM, therapy.",
//     tone: "sky" as const,
//   },
//   {
//     icon: HandHeart,
//     name: "Livelihood",
//     body: "Income grants, assets, VGD cards.",
//     tone: "violet" as const,
//   },
// ];

// // What this app replaces on the inside side. Refined from the previous
// // generic copy into outcome-oriented labels.
// const STATS = [
//   {
//     icon: Users,
//     label: "Household 360°",
//     sub: "every visit, every programme",
//     accent: "emerald" as const,
//   },
//   {
//     icon: Shield,
//     label: "Privacy-first",
//     sub: "role-based, audit-logged",
//     accent: "violet" as const,
//   },
//   {
//     icon: BarChart3,
//     label: "Donor-safe",
//     sub: "pre-anonymised aggregate reports",
//     accent: "sky" as const,
//   },
// ];

// function toneClasses(accent: "emerald" | "violet" | "sky"): {
//   ring: string;
//   icon: string;
//   glow: string;
// } {
//   if (accent === "emerald")
//     return {
//       ring: "ring-emerald-400/40",
//       icon: "text-emerald-300",
//       glow: "shadow-[0_0_18px_-8px_rgba(16,185,129,0.7)]",
//     };
//   if (accent === "violet")
//     return {
//       ring: "ring-violet-400/40",
//       icon: "text-violet-300",
//       glow: "shadow-[0_0_18px_-8px_rgba(139,92,246,0.7)]",
//     };
//   return {
//     ring: "ring-sky-400/40",
//     icon: "text-sky-300",
//     glow: "shadow-[0_0_18px_-8px_rgba(56,189,248,0.7)]",
//   };
// }

// export default function LoginPage() {
//   const navigate = useNavigate();
//   const [params] = useSearchParams();
//   const returnTo = params.get("returnTo") ?? "/";
//   const { login, status } = useAuth();
//   const [pending, setPending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const configured = isLoginConfigured();

//   // If already authenticated, bounce back to the app.
//   if (status === "authenticated") {
//     navigate(returnTo, { replace: true });
//   }

//   const onSignIn = async () => {
//     if (!configured || pending) return;
//     setError(null);
//     setPending(true);
//     try {
//       await login(returnTo);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Could not start sign-in.");
//       setPending(false);
//     }
//   };

//   const callbackUrl =
//     typeof window !== "undefined"
//       ? `${window.location.origin}/login/callback`
//       : "/login/callback";

//   return (
//     <div className="grid min-h-screen w-full lg:grid-cols-2">
//       {/* Left — branding */}
//       <div className="relative hidden overflow-hidden bg-slate-950 text-slate-100 lg:block">
//         {/* base radial wash */}
//         <div
//           className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.28),transparent_55%)]"
//           aria-hidden
//         />
//         {/* faint perspective grid */}
//         <div
//           className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(148,163,184,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.7)_1px,transparent_1px)] [background-size:36px_36px]"
//           aria-hidden
//         />
//         {/* soft neon orbs */}
//         <div
//           className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl animate-pulse"
//           style={{ animationDuration: "6s" }}
//           aria-hidden
//         />
//         <div
//           className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl animate-pulse"
//           style={{ animationDuration: "9s" }}
//           aria-hidden
//         />
//         {/* top + bottom hairline glow */}
//         <div
//           className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
//           aria-hidden
//         />
//         <div
//           className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"
//           aria-hidden
//         />

//         <div className="relative flex h-full flex-col justify-between gap-8 p-12">
//           {/* Logo */}
//           <div className="flex items-center gap-3">
//             <div className="relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_0_24px_-2px_rgba(16,185,129,0.7),0_0_8px_-2px_rgba(45,212,191,0.9)] ring-1 ring-emerald-300/50">
//               <Sparkles className="h-5 w-5 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
//             </div>
//             <div>
//               <p className="text-sm font-semibold tracking-wide bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
//                 NGOField
//               </p>
//               <p className="text-xs text-slate-400">
//                 Beneficiary Request &amp; Case Follow-up
//               </p>
//             </div>
//           </div>

//           {/* Hero */}
//           <div className="max-w-md">
//             <Badge
//               variant="outline"
//               className="mb-5 border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-[0_0_18px_-4px_rgba(16,185,129,0.6)]"
//             >
//               <Building2 className="mr-1 h-3 w-3" /> Kurigram · Gaibandha ·
//               Jamalpur · Cox&apos;s Bazar
//             </Badge>
//             <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-slate-50 drop-shadow-[0_0_18px_rgba(16,185,129,0.18),0_0_4px_rgba(99,102,241,0.18)]">
//               A case file that follows the family — not the officer.
//             </h1>
//             <p className="mt-4 max-w-md text-balance text-slate-300">
//               NGOField is the unified case-management workspace for our four
//               operating districts. Field officers capture on the ground,
//               coordinators review with full household context, and donors see
//               aggregate impact — without losing the household&apos;s story when
//               an officer transfers, a programme closes, or a year passes.
//             </p>
//           </div>

//           {/* Workflow */}
//           <div className="max-w-md">
//             <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
//               How a field note becomes a case
//             </p>
//             <ol className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
//               {WORKFLOW.map((step, i) => (
//                 <li
//                   key={step.title}
//                   className="relative rounded-md border border-slate-800/80 bg-slate-900/40 p-3 ring-1 ring-inset ring-white/5"
//                 >
//                   <div className="mb-2 flex items-center gap-2">
//                     <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/10 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/40">
//                       {i + 1}
//                     </span>
//                     <step.icon className="h-3.5 w-3.5 text-slate-300" />
//                     <p className="text-xs font-semibold uppercase tracking-wider text-slate-100">
//                       {step.title}
//                     </p>
//                   </div>
//                   <p className="text-[11px] leading-relaxed text-slate-400">
//                     {step.body}
//                   </p>
//                 </li>
//               ))}
//             </ol>
//           </div>

//           {/* Live sample — Banglish in, AI out */}
//           <div className="max-w-md overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/60 shadow-[0_0_30px_-12px_rgba(16,185,129,0.55),0_0_18px_-10px_rgba(99,102,241,0.55)] ring-1 ring-inset ring-white/5">
//             <div className="flex items-center gap-2 border-b border-slate-800/80 bg-slate-950/60 px-3 py-2">
//               <Quote className="h-3 w-3 text-emerald-300" />
//               <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
//                 Field note → structured draft
//               </span>
//             </div>
//             <div className="space-y-2 p-3">
//               <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
//                 <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
//                   Input · officer&apos;s Banglish note
//                 </p>
//                 <p className="text-xs italic leading-relaxed text-slate-300">
//                   &ldquo;{SAMPLE.input}&rdquo;
//                 </p>
//               </div>
//               <div className="rounded-md border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 shadow-[0_0_18px_-10px_rgba(16,185,129,0.7)]">
//                 <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
//                   <Sparkles className="h-3 w-3" /> AI draft
//                 </p>
//                 <div className="mb-2 flex flex-wrap items-center gap-1.5">
//                   <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
//                     {SAMPLE.programme}
//                   </span>
//                   <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-400/30">
//                     {SAMPLE.urgency} urgency
//                   </span>
//                   <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-200 ring-1 ring-indigo-400/30">
//                     {SAMPLE.stipend}
//                   </span>
//                 </div>
//                 <p className="text-[11px] leading-relaxed text-emerald-50/90">
//                   {SAMPLE.summary}
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* Programmes strip + Stats */}
//           <div className="max-w-md space-y-3">
//             <div className="grid grid-cols-3 gap-2">
//               {PROGRAMMES.map((p) => (
//                 <div
//                   key={p.name}
//                   className={`flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-2 ring-1 ring-inset ring-white/5`}
//                 >
//                   <p.icon className={`h-3.5 w-3.5 shrink-0 ${toneClasses(p.tone).icon}`} />
//                   <div className="min-w-0">
//                     <p className="text-[11px] font-semibold text-slate-100">
//                       {p.name}
//                     </p>
//                     <p className="truncate text-[10px] text-slate-400">
//                       {p.body}
//                     </p>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
//               {STATS.map((s) => {
//                 const t = toneClasses(s.accent);
//                 return (
//                   <div
//                     key={s.label}
//                     className={`rounded-md border border-slate-800 bg-slate-900/40 p-3 ring-1 ring-inset ring-white/5 ${t.glow}`}
//                   >
//                     <s.icon
//                       className={`mb-1 h-4 w-4 ${t.icon} drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]`}
//                     />
//                     <p className="font-medium text-slate-100">{s.label}</p>
//                     <p className="text-slate-400">{s.sub}</p>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Right — single sign-in */}
//       <div className="relative flex items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-8">
//         {/* base radial wash (lighter, matches left panel palette) */}
//         <div
//           className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_55%)]"
//           aria-hidden
//         />
//         {/* faint grid (matches left panel) */}
//         <div
//           className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(99,102,241,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.7)_1px,transparent_1px)] [background-size:36px_36px]"
//           aria-hidden
//         />
//         {/* soft neon orbs (matches left panel) */}
//         <div
//           className="absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl animate-pulse"
//           style={{ animationDuration: "7s" }}
//           aria-hidden
//         />
//         <div
//           className="absolute -left-24 bottom-1/4 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl animate-pulse"
//           style={{ animationDuration: "10s" }}
//           aria-hidden
//         />
//         {/* top + bottom hairline glow (matches left panel) */}
//         <div
//           className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent"
//           aria-hidden
//         />
//         <div
//           className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
//           aria-hidden
//         />

//         <div className="relative w-full max-w-md">
//           <div className="mb-8 flex items-center gap-3 lg:hidden">
//             <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
//               <Sparkles className="h-5 w-5" />
//             </div>
//             <div>
//               <p className="text-sm font-semibold">NGOField</p>
//               <p className="text-xs text-muted-foreground">Case Management</p>
//             </div>
//           </div>

//           {/* Header */}
//           <div className="mb-7 space-y-2">
//             <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
//               <Shield className="h-3 w-3" />
//               Secure sign-in
//             </span>
//             <h2 className="text-3xl font-semibold tracking-tight">
//               Welcome back
//             </h2>
//             <p className="text-sm text-muted-foreground">
//               Sign in to continue to the NGOField case-management workspace
//               for our four operating districts.
//             </p>
//           </div>

//           {/* Sign-in card */}
//           <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur shadow-[0_0_48px_-16px_rgba(99,102,241,0.55),0_0_18px_-8px_rgba(16,185,129,0.45)]">
//             {/* Top accent line */}
//             <div
//               className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent"
//               aria-hidden
//             />

//             <CardContent className="space-y-5 p-6">
//               {!configured ? (
//                 <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
//                   <p className="font-semibold">Sign-in is not configured.</p>
//                   <p className="mt-1 text-amber-700/90 dark:text-amber-200/80">
//                     Set <code>VITE_BLOCKS_OIDC_CLIENT_ID</code> and{" "}
//                     <code>VITE_BLOCKS_OIDC_URL</code> in <code>.env</code>, then
//                     register the callback URL below on the OIDC client.
//                   </p>
//                   <p className="mt-2 break-all rounded bg-background/60 p-2 font-mono text-[11px] text-foreground">
//                     {callbackUrl}
//                   </p>
//                 </div>
//               ) : null}

//               {error ? (
//                 <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
//                   {error}
//                 </div>
//               ) : null}

//               {/* Provider identity */}
//               <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-gradient-to-br from-muted/50 to-muted/10 p-3">
//                 <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_18px_-2px_rgba(99,102,241,0.65)] ring-1 ring-indigo-300/40">
//                   <Sparkles className="h-5 w-5 drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]" />
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <p className="text-sm font-semibold leading-tight">
//                     Continue with Blocks
//                   </p>
//                   <p className="text-xs text-muted-foreground">
//                     Single sign-on · OIDC
//                   </p>
//                 </div>
//                 <Badge variant="success" className="shrink-0">
//                   <CheckCircle2 className="mr-1 h-3 w-3" /> Ready
//                 </Badge>
//               </div>

//               {/* CTA */}
//               <Button
//                 type="button"
//                 className="w-full shadow-[0_0_22px_-2px_rgba(99,102,241,0.55),0_0_10px_-2px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_0px_rgba(99,102,241,0.7),0_0_14px_0px_rgba(16,185,129,0.65)]"
//                 size="lg"
//                 onClick={onSignIn}
//                 disabled={!configured || pending}
//               >
//                 {pending ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : null}
//                 Sign in with Blocks <ArrowRight className="h-4 w-4" />
//               </Button>

//               {/* Trust signals */}
//               <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
//                 <span className="inline-flex items-center gap-1">
//                   <Shield className="h-3 w-3 text-emerald-500" /> Encrypted
//                 </span>
//                 <span aria-hidden>·</span>
//                 <span className="inline-flex items-center gap-1">
//                   <CheckCircle2 className="h-3 w-3 text-emerald-500" /> MFA-ready
//                 </span>
//                 <span aria-hidden>·</span>
//                 <span className="inline-flex items-center gap-1">
//                   <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Audit-logged
//                 </span>
//               </div>

//               <p className="text-center text-[11px] text-muted-foreground">
//                 You will be redirected to the Blocks identity provider to
//                 authenticate.
//               </p>
//             </CardContent>
//           </Card>

//           {/* Footer */}
//           <div className="mt-5 flex items-center justify-between text-[11px] text-muted-foreground">
//             <span>Need help signing in?</span>
//             <a
//               href="mailto:support@ngofield.app"
//               className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
//             >
//               Contact support <ArrowRight className="h-3 w-3" />
//             </a>
//           </div>

//           <p className="mt-4 text-center text-[11px] text-muted-foreground">
//             By signing in you agree to NGOField&apos;s acceptable-use policy.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
