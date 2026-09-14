import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  FileText,
  Home,
  Lock,
  MapPin,
  Phone,
  ShieldAlert,
  Users,
  History,
  HeartPulse,
  Briefcase,
  School,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { householdService } from "@/services/caseService";
import type { CaseRecord, FollowUp, Household } from "@/types";
import { cn, formatDate, formatRelative, initials, isOverdue } from "@/lib/utils";
import { useAuth } from "@/services/authService";
import { SensitiveField } from "@/components/domain/SensitiveField";
import { ProgrammeBadge, PriorityBadge, StatusBadge } from "@/components/domain/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function HouseholdProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      householdService.get(id),
      householdService.getCases(id),
      householdService.getFollowUps(id),
    ]).then(([h, c, f]) => {
      setHousehold(h);
      setCases(c);
      setFollowUps(f);
      setLoading(false);
    });
  }, [id]);

  const sortedCases = useMemo(() => [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [cases]);
  const sortedFollowUps = useMemo(() => [...followUps].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()), [followUps]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!household) {
    return <Alert variant="danger" title="Household not found">No household matches ID {id}.</Alert>;
  }

  const isAuthorized = user?.role !== "field_officer";

  return (
    <div className="space-y-5 pb-20">
      <Link to="/households" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Households
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-semibold text-white">
            {initials(household.name)}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{household.name}</h1>
              {household.activeProgrammes.map((p) => <ProgrammeBadge key={p} programme={p} />)}
            </div>
            <p className="text-sm text-muted-foreground">
              {household.id} · {household.village}, {household.union}, {household.district}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{household.phone}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{household.members.length} members</span>
              <span className="inline-flex items-center gap-1"><Home className="h-3 w-3" />{household.assignedArea}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Household members</CardTitle>
            <CardDescription>All members of the household as captured during registration.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y">
              {household.members.map((m, i) => (
                <li key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-foreground">{initials(m.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.relation} · {m.age} years</p>
                    </div>
                  </div>
                  {m.notes && <span className="text-xs text-muted-foreground">{m.notes}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Geography & assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <Detail label="District" value={household.district} />
            <Detail label="Union" value={household.union} />
            <Detail label="Village" value={household.village} />
            <Detail label="Assigned area" value={household.assignedArea} />
            <Detail label="Registered on" value={formatDate(household.createdAt)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Sensitive information</CardTitle>
            <CardDescription>Restricted to authorized programme staff.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <SensitiveField>
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Poverty score" value={household.povertyScore != null ? String(household.povertyScore) : "—"} />
                <Detail label="Monthly income" value={household.income != null ? `৳${household.income.toLocaleString()}` : "—"} />
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Vulnerability assessment</p>
                  <p className="mt-1 text-sm">{household.vulnerability ?? "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Health notes</p>
                  <p className="mt-1 text-sm">{household.healthNotes ?? "—"}</p>
                </div>
              </div>
            </SensitiveField>
            {!isAuthorized && (
              <div className="rounded-md border border-dashed border-rose-300 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/10 p-3 text-xs text-rose-900 dark:text-rose-200">
                <Lock className="mr-1 inline h-3 w-3" /> Your role does not include access to sensitive data for this household.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active programmes</CardTitle>
            <CardDescription>Programmes the household is currently enrolled in.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {household.activeProgrammes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active programme enrolment.</p>
            ) : (
              <ul className="space-y-2">
                {household.activeProgrammes.map((p) => {
                  const Icon = p === "Education" ? School : p === "Health" ? HeartPulse : Briefcase;
                  return (
                    <li key={p} className="flex items-center justify-between rounded-md border bg-background p-2.5">
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4 text-muted-foreground" /> {p}
                      </span>
                      <Badge variant="success">Active</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Case history</CardTitle>
          <CardDescription>Complete case history preserved across officer changes.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases yet for this household.</p>
          ) : (
            <ul className="divide-y">
              {sortedCases.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/cases/${c.id}`}
                    className="flex items-start gap-4 py-3 transition-colors hover:bg-accent"
                  >
                    <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.id} · {c.programme}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{c.request}</p>
                      {c.aiDraft?.duplicateRisk && (
                        <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300">⚠ Duplicate risk · {c.aiDraft.duplicateRisk.summary}</p>
                      )}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Follow-up history</CardTitle>
          <CardDescription>Past and upcoming follow-ups.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedFollowUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follow-ups recorded.</p>
          ) : (
            <ul className="divide-y">
              {sortedFollowUps.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-3">
                  <span className={cn(
                    "grid h-9 w-9 place-items-center rounded-full",
                    f.status === "Completed" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" :
                    isOverdue(f.dueDate) ? "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300" :
                    "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
                  )}>
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{f.type}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{f.notes ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{formatDate(f.dueDate)}</p>
                    <p className="text-[11px] text-muted-foreground">{f.assignedOfficerName}</p>
                  </div>
                  <PriorityBadge priority={f.priority} />
                  {f.status === "Completed" && <Badge variant="success">Completed</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
