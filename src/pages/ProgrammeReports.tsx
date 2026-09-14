import { useEffect, useState } from "react";
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  CheckCircle2,
  Activity,
  FileBarChart2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { caseService, reportService } from "@/services/caseService";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  "New": "#0ea5e9",
  "Under Review": "#f59e0b",
  "Approved": "#8b5cf6",
  "Assigned": "#a855f7",
  "In Progress": "#0284c7",
  "Waiting": "#94a3b8",
  "Completed": "#10b981",
  "Closed": "#475569",
  "Rejected": "#f43f5e",
};

export default function ProgrammeReportsPage() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [byDistrict, setByDistrict] = useState<any[]>([]);
  const [completion, setCompletion] = useState<number>(0);
  const [outcomeRate, setOutcomeRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportService.monthlyTrend(),
      reportService.programmeFunnel(),
      reportService.districtSummary(),
    ]).then(([m, f, d]) => {
      setMonthly(m);
      setFunnel(f);
      // Build status distribution
      caseService.list({}).then((cs) => {
        const map: Record<string, number> = {};
        cs.forEach((c) => (map[c.status] = (map[c.status] ?? 0) + 1));
        setByStatus(map);
        const total = cs.length || 1;
        const completed = cs.filter((c) => c.status === "Completed").length;
        const outcomes = cs.filter((c) => c.status === "Completed" || c.status === "Closed").length;
        setCompletion(Math.round((completed / total) * 100));
        setOutcomeRate(Math.round((outcomes / total) * 100));
      });
      const rows = Object.entries(d).map(([k, v]: any) => ({ district: k, openCases: v.openCases, overdue: v.overdue }));
      setByDistrict(rows);
      setLoading(false);
    });
  }, []);

  const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Programme reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aggregate metrics across Education, Livelihood and Health programmes.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Completion rate" value={`${completion}%`} icon={CheckCircle2} color="emerald" hint="Cases completed" />
        <KPI label="Outcome rate" value={`${outcomeRate}%`} icon={TrendingUp} color="sky" hint="Successful outcomes" />
        <KPI label="Programmes" value={funnel.length} icon={Activity} color="violet" hint="Active programmes" />
        <KPI label="Total cases" value={monthly.reduce((acc, m) => acc + m.opened, 0)} icon={FileBarChart2} color="default" hint="Year to date" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Cases by programme</CardTitle>
            <CardDescription>Year-to-date volume per programme</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Bar dataKey="education" stackId="a" fill="#0ea5e9" name="Education" />
                    <Bar dataKey="livelihood" stackId="a" fill="#10b981" name="Livelihood" />
                    <Bar dataKey="health" stackId="a" fill="#8b5cf6" name="Health" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieIcon className="h-4 w-4" /> Status distribution</CardTitle>
            <CardDescription>All cases by status</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {statusData.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.name] ?? "#64748b"} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Cases by district</CardTitle>
            <CardDescription>Open cases and overdue follow-ups</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDistrict} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="district" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Bar dataKey="openCases" fill="#0ea5e9" name="Open cases" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" fill="#f43f5e" name="Overdue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Monthly cases</CardTitle>
            <CardDescription>Opened vs completed</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="opened" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Opened" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color, hint }: { label: string; value: number | string; icon: any; color: string; hint?: string }) {
  const colorClass: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    sky: "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
    violet: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300",
    default: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
          </div>
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${colorClass[color]}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
