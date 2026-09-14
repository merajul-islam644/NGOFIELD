import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  CalendarClock,
  AlertCircle,
  FolderOpenDot,
  Sparkles,
  Hourglass,
  Users,
  ListChecks,
  MapPin,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCard } from "@/components/domain/StatsCard";
import { ProgrammeBadge, PriorityBadge, StatusBadge } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/services/authService";
import { caseService, followUpService, householdService, reportService } from "@/services/caseService";
import { formatRelative, isOverdue } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CaseRecord, District, FollowUp } from "@/types";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";

interface DashboardData {
  cases: CaseRecord[];
  followUps: FollowUp[];
  households: any[];
  districtSummary: any;
  monthly: any[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      caseService.list({}),
      followUpService.list({}),
      householdService.list(),
      reportService.districtSummary(),
      reportService.monthlyTrend(),
    ])
      .then(([cases, followUps, households, districtSummary, monthly]) => {
        if (cancelled) return;
        setData({ cases, followUps, households, districtSummary, monthly });
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;
  if (loading) return <DashboardSkeleton role={user.role} />;
  if (error) return <Alert variant="danger" title="Couldn't load dashboard">{error}</Alert>;
  if (!data) return null;

  if (user.role === "field_officer") return <FieldOfficerDashboard data={data} officerId={user.id} />;
  if (user.role === "programme_coordinator") return <CoordinatorDashboard data={data} />;
  return <RegionalManagerDashboard data={data} />;
}

function DashboardSkeleton({ role }: { role: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

// ============== FIELD OFFICER ==============
function FieldOfficerDashboard({ data, officerId }: { data: DashboardData; officerId: string }) {
  const myHouseholds = data.households.filter((h) => h.assignedOfficerId === officerId);
  const myCases = data.cases.filter((c) => c.assignedOfficerId === officerId);
  const myFollowUps = data.followUps.filter((f) => f.assignedOfficerId === officerId);
  const now = Date.now();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const dueToday = myFollowUps.filter((f) => f.status !== "Completed" && new Date(f.dueDate).getTime() <= todayEnd.getTime() && new Date(f.dueDate).getTime() >= now);
  const overdue = myFollowUps.filter((f) => f.status !== "Completed" && isOverdue(f.dueDate));
  const active = myCases.filter((c) => !["Closed", "Rejected", "Completed"].includes(c.status));
  const todays = [...dueToday, ...overdue].slice(0, 6);
  const recentCases = [...myCases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, Rahim</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your assigned areas · Chilmari, Rowmari, Rajibpur
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="My households" value={myHouseholds.length} icon={Home} tone="info" href="/households" hint="Kurigram area" />
        <StatsCard label="Active cases" value={active.length} icon={FolderOpenDot} tone="default" href="/cases" hint="Across my areas" />
        <StatsCard label="Due today" value={dueToday.length} icon={Hourglass} tone="warning" href="/follow-ups" hint="Today's follow-ups" />
        <StatsCard label="Overdue" value={overdue.length} icon={AlertCircle} tone="danger" href="/follow-ups" hint="Action needed" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's follow-ups</CardTitle>
              <CardDescription>Items requiring attention today</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/follow-ups">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {todays.length === 0 ? (
              <EmptyState message="No follow-ups due today. Great work." />
            ) : (
              <ul className="space-y-2">
                {todays.map((f) => (
                  <li key={f.id}>
                    <Link
                      to={`/cases/${f.caseId}`}
                      className="flex items-start gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-accent"
                    >
                      <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${isOverdue(f.dueDate) ? "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{f.type} · {f.notes}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {f.district} · {f.programme} · Due {formatRelative(f.dueDate)}
                        </p>
                      </div>
                      <PriorityBadge priority={f.priority} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Mobile-first field operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <Button asChild className="w-full" size="lg">
              <Link to="/cases/new">
                <Sparkles className="h-4 w-4" />
                Create new case with AI
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between" size="lg">
              <Link to="/households">
                My households <Home className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between" size="lg">
              <Link to="/follow-ups">
                Follow-ups <CalendarClock className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent cases</CardTitle>
            <CardDescription>Latest activity on your cases</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/cases">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Case</th>
                  <th className="px-3 py-2 font-medium">Household</th>
                  <th className="px-3 py-2 font-medium">Programme</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-accent">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/cases/${c.id}`} className="hover:underline">{c.id}</Link>
                    </td>
                    <td className="px-3 py-2">{c.householdName}</td>
                    <td className="px-3 py-2"><ProgrammeBadge programme={c.programme} /></td>
                    <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatRelative(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== COORDINATOR ==============
function CoordinatorDashboard({ data }: { data: DashboardData }) {
  const newRequests = data.cases.filter((c) => c.status === "New");
  const pendingReview = data.cases.filter((c) => c.status === "Under Review");
  const active = data.cases.filter((c) => !["Closed", "Rejected", "Completed"].includes(c.status));
  const duplicates = data.cases.filter((c) => c.aiDraft?.duplicateRisk);
  const now = Date.now();
  const overdueFollowUps = data.followUps.filter((f) => f.status !== "Completed" && isOverdue(f.dueDate));
  const casesNeedingReview = [...pendingReview, ...newRequests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Programme Coordination</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kurigram · Gaibandha — Education, Livelihood, Health</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard label="New requests" value={newRequests.length} icon={FolderOpenDot} tone="info" href="/cases?status=New" hint="Awaiting first review" />
        <StatsCard label="Pending review" value={pendingReview.length} icon={ListChecks} tone="warning" href="/cases?status=Under%20Review" hint="Coordinator queue" />
        <StatsCard label="Active cases" value={active.length} icon={Activity} tone="default" href="/cases" hint="In progress" />
        <StatsCard label="Duplicate risks" value={duplicates.length} icon={AlertCircle} tone="danger" hint="AI flagged" />
        <StatsCard label="Overdue follow-ups" value={overdueFollowUps.length} icon={CalendarClock} tone="warning" href="/follow-ups" hint="Across all officers" />
        <StatsCard label="Cases to review" value={casesNeedingReview.length} icon={Hourglass} tone="purple" hint="Sorted by recent activity" />
      </div>

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">Requires review</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicate risks</TabsTrigger>
          <TabsTrigger value="active">Active pipeline</TabsTrigger>
        </TabsList>
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cases requiring coordinator review</CardTitle>
              <CardDescription>Drafts awaiting approval and assignment</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {casesNeedingReview.length === 0 ? (
                <EmptyState message="Nothing pending. Inbox zero." />
              ) : (
                <ul className="divide-y">
                  {casesNeedingReview.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/cases/${c.id}`}
                        className="flex items-start gap-4 py-3 transition-colors hover:bg-accent"
                      >
                        <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{c.householdName} <span className="text-muted-foreground">· {c.id}</span></p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.request}</p>
                          {c.aiDraft?.duplicateRisk && (
                            <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300">
                              ⚠ Duplicate risk · {c.aiDraft.duplicateRisk.relatedCaseId ?? c.aiDraft.duplicateRisk.summary}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <ProgrammeBadge programme={c.programme} />
                          <StatusBadge status={c.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates">
          <Card>
            <CardHeader>
              <CardTitle>Potential duplicate assistance</CardTitle>
              <CardDescription>AI-flagged cases that share household history with prior records</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {duplicates.length === 0 ? (
                <EmptyState message="No duplicate risks detected." />
              ) : (
                <ul className="divide-y">
                  {duplicates.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/cases/${c.id}`}
                        className="flex items-start gap-4 py-3 transition-colors hover:bg-accent"
                      >
                        <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300">
                          <AlertCircle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{c.householdName} <span className="text-muted-foreground">· {c.id}</span></p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{c.aiDraft?.duplicateRisk?.summary}</p>
                        </div>
                        <ProgrammeBadge programme={c.programme} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active case pipeline</CardTitle>
              <CardDescription>Approved and in-progress work</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y">
                {active.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/cases/${c.id}`}
                      className="flex items-start gap-4 py-3 transition-colors hover:bg-accent"
                    >
                      <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300">
                        <Activity className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.householdName} <span className="text-muted-foreground">· {c.id}</span></p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.request}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <ProgrammeBadge programme={c.programme} />
                        <StatusBadge status={c.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============== REGIONAL MANAGER ==============
function RegionalManagerDashboard({ data }: { data: DashboardData }) {
  const activeHouseholds = data.households.length;
  const openCases = data.cases.filter((c) => !["Closed", "Rejected", "Completed"].includes(c.status)).length;
  const overdueFollowUps = data.followUps.filter((f) => f.status !== "Completed" && isOverdue(f.dueDate)).length;
  const monthlyCases = data.cases.filter((c) => {
    const d = new Date(c.createdAt);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).length;

  const districtRows = (["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"] as District[]).map((d) => ({
    district: d,
    activeHouseholds: data.districtSummary[d]?.activeHouseholds ?? 0,
    openCases: data.districtSummary[d]?.openCases ?? 0,
    overdue: data.districtSummary[d]?.overdue ?? 0,
    monthlyCases: data.districtSummary[d]?.monthlyCases ?? 0,
  }));

  const chartData = data.monthly.map((m: any) => ({
    month: m.month,
    Education: m.education,
    Livelihood: m.livelihood,
    Health: m.health,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Regional overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kurigram · Gaibandha · Jamalpur · Cox's Bazar</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Active households" value={activeHouseholds} icon={Home} tone="info" href="/households" hint="Across 4 districts" />
        <StatsCard label="Open cases" value={openCases} icon={FolderOpenDot} tone="default" href="/cases" hint="Excluding closed/rejected" />
        <StatsCard label="Overdue follow-ups" value={overdueFollowUps} icon={CalendarClock} tone="danger" href="/follow-ups" hint="Action needed" />
        <StatsCard label="Monthly cases" value={monthlyCases} icon={Activity} tone="success" hint="This month" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly cases by programme</CardTitle>
            <CardDescription>Trend across the year</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <RTooltip cursor={{ fill: "hsl(var(--accent))" }} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="Education" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Livelihood" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Health" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>District summary</CardTitle>
            <CardDescription>Quick view across districts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {districtRows.map((d) => (
              <Link
                key={d.district}
                to={`/follow-ups?district=${encodeURIComponent(d.district)}`}
                className="block rounded-lg border bg-background p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{d.district}</p>
                  </div>
                  {d.overdue > 0 && (
                    <span className="rounded-full bg-rose-100 dark:bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                      {d.overdue} overdue
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">{d.activeHouseholds}</p>
                    <p>Households</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{d.openCases}</p>
                    <p>Open cases</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{d.monthlyCases}</p>
                    <p>This month</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Overdue follow-ups snapshot</CardTitle>
            <CardDescription>Kurigram backlog requires immediate attention</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/follow-ups">
              <FileSpreadsheet className="h-4 w-4" />
              Open full follow-ups page
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {districtRows.map((d) => (
              <Link
                key={d.district}
                to={`/follow-ups?district=${encodeURIComponent(d.district)}`}
                className="rounded-lg border bg-background p-4 transition-colors hover:bg-accent"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{d.district}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight">{d.overdue}</span>
                  <span className="text-sm text-muted-foreground">overdue</span>
                </p>
                {d.district === "Kurigram" && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-3 w-3" /> Critical backlog
                  </p>
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed bg-background px-4 py-10 text-center text-sm text-muted-foreground">
      <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
      {message}
    </div>
  );
}
