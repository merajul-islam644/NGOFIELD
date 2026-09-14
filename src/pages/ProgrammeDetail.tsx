import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  Briefcase,
  CheckCircle2,
  HeartPulse,
  ListChecks,
  School,
  Sparkles,
  ArrowRight,
  FolderOpenDot,
  Hourglass,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/domain/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { caseService, reportService } from "@/services/caseService";
import type { CaseRecord, Programme } from "@/types";
import { ProgrammeBadge, PriorityBadge, StatusBadge } from "@/components/domain/StatusBadge";
import { formatRelative } from "@/lib/utils";
import { useAuth } from "@/services/authService";
import { Alert } from "@/components/ui/alert";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Cell } from "recharts";
import { SensitiveField } from "@/components/domain/SensitiveField";

const PROGRAMME_META: Record<string, { name: Programme; icon: any; color: string; desc: string }> = {
  education: { name: "Education", icon: School, color: "#0ea5e9", desc: "Stipends, school supplies and tuition support for primary, secondary and higher-secondary students." },
  livelihood: { name: "Livelihood", icon: Briefcase, color: "#10b981", desc: "Income generation, enterprise grants and asset support for vulnerable households." },
  health: { name: "Health", icon: HeartPulse, color: "#8b5cf6", desc: "Medical referral, nutrition monitoring and physiotherapy for at-risk households." },
};

export default function ProgrammeDetailPage() {
  const { programmeSlug } = useParams<{ programmeSlug: string }>();
  const { user } = useAuth();
  const meta = programmeSlug ? PROGRAMME_META[programmeSlug] : null;
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [funnel, setFunnel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      caseService.list({ programme: meta?.name }),
      reportService.programmeFunnel(),
    ]).then(([cs, fs]) => {
      setCases(cs);
      setFunnel(fs.find((f) => f.programme === meta?.name) ?? null);
      setLoading(false);
    });
  }, [programmeSlug]);

  if (!meta) return <Alert variant="danger" title="Unknown programme">Programme not recognised.</Alert>;

  const Icon = meta.icon;
  const fieldOfficerScope = user?.role === "field_officer";
  const visibleCases = fieldOfficerScope ? cases.filter((c) => c.assignedOfficerId === user?.id) : cases;
  const recent = visibleCases.slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: meta.color }}
          >
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{meta.name} programme</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{meta.desc}</p>
          </div>
        </div>
        <ProgrammeBadge programme={meta.name} className="self-start sm:self-center" />
      </header>

      {funnel && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatsCard label="Requests" value={funnel.requests} icon={Sparkles} tone="default" hint="Total intake" />
          <StatsCard label="Reviewed" value={funnel.reviewed} icon={ListChecks} tone="info" hint="Coordinator queue" />
          <StatsCard label="Approved" value={funnel.approved} icon={CheckCircle2} tone="purple" hint="Active" />
          <StatsCard label="Active" value={funnel.active} icon={Activity} tone="info" hint="In progress" />
          <StatsCard label="Completed" value={funnel.completed} icon={CheckCircle2} tone="success" hint="Successful" />
          <StatsCard label="Outcomes" value={funnel.outcomes} icon={Sparkles} tone="success" hint="Tracked outcomes" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Programme funnel</CardTitle>
            <CardDescription>Conversion from intake to outcome</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading || !funnel ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel.funnel} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="label" type="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} width={80} />
                    <RTooltip cursor={{ fill: "hsl(var(--accent))" }} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {funnel.funnel.map((_: any, i: number) => (
                        <Cell key={i} fill={[meta.color, "#0ea5e9", "#6366f1", "#10b981", "#22c55e", "#f59e0b"][i] ?? meta.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health privacy notice</CardTitle>
            <CardDescription>Access-controlled view of health data.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <SensitiveField>
              <div className="space-y-2 text-sm">
                <p className="font-medium">Authorized content</p>
                <p className="text-muted-foreground">Detailed health notes for households in this programme are visible to Programme Coordinators and Regional Managers.</p>
              </div>
            </SensitiveField>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FolderOpenDot className="h-4 w-4" /> Recent cases</CardTitle>
            <CardDescription>Latest cases in this programme</CardDescription>
          </div>
          <Link to={`/cases?programme=${encodeURIComponent(meta.name)}`} className="text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recent.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No cases for this programme.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link to={`/cases/${c.id}`} className="flex items-start gap-4 py-3 transition-colors hover:bg-accent">
                    <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-muted">
                      <FolderOpenDot className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.householdName} <span className="text-muted-foreground">· {c.id}</span></p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.request}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={c.status} />
                      <p className="text-[11px] text-muted-foreground">{formatRelative(c.updatedAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
