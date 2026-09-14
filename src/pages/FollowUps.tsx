import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarClock, AlertCircle, CheckCircle2, Hourglass, Filter, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { caseService, followUpService, officerService } from "@/services/caseService";
import { useUser } from "@/app/providers/AuthProvider";
import { isOverdue, isDueToday, formatRelative, formatDate, cn } from "@/lib/utils";
import { PriorityBadge, ProgrammeBadge } from "@/components/domain/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/domain/StatsCard";
import { useToast } from "@/services/toastService";

export default function FollowUpsPage() {
  const user = useUser();
  const { success } = useToast();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const district = params.get("district") ?? "All";
  const programme = params.get("programme") ?? "All";
  const officerId = params.get("officer") ?? "All";
  const status = params.get("status") ?? "All";

  useEffect(() => {
    officerService.list().then(setOfficers);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      followUpService.list({
        district,
        programme,
        officerId,
        status,
      }),
      followUpService.getMetrics(),
    ]).then(([list, m]) => {
      // Field officers only see their own
      const filtered = user?.role === "field_officer" ? list.filter((f) => f.assignedOfficerId === user.id) : list;
      setItems(filtered);
      setMetrics(m);
      setLoading(false);
    });
  }, [district, programme, officerId, status, user]);

  const update = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === "All") next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const overdueByDistrict = useMemo(() => {
    const map: Record<string, number> = { Kurigram: 0, Gaibandha: 0, Jamalpur: 0, "Cox's Bazar": 0 };
    items.filter((f) => f.status !== "Completed" && isOverdue(f.dueDate)).forEach((f) => {
      if (map[f.district] != null) map[f.district]++;
    });
    return map;
  }, [items]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="mt-1 text-sm text-muted-foreground">All scheduled and overdue follow-ups across the programme.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Due today" value={metrics?.dueToday.length ?? 0} icon={Hourglass} tone="warning" hint="Action today" />
        <StatsCard label="Due this week" value={metrics?.dueThisWeek.length ?? 0} icon={CalendarClock} tone="info" hint="Next 7 days" />
        <StatsCard label="Overdue" value={metrics?.overdue.length ?? 0} icon={AlertCircle} tone="danger" hint="Past due" />
        <StatsCard label="Completed" value={metrics?.completed.length ?? 0} icon={CheckCircle2} tone="success" hint="Lifetime" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Overdue by district</CardTitle>
          <CardDescription>Click a district to filter the overdue view below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(overdueByDistrict).map(([d, n]) => (
              <button
                key={d}
                onClick={() => update("district", district === d ? "All" : d)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  district === d ? "border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/15" : "bg-background hover:bg-accent",
                )}
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{d}</p>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className={cn("text-3xl font-semibold tabular-nums tracking-tight", n >= 7 && "text-rose-600 dark:text-rose-400")}>{n}</span>
                  <span className="text-sm text-muted-foreground">overdue</span>
                </p>
                {n >= 7 && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-3 w-3" /> Critical backlog
                  </p>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filter</CardTitle>
            <CardDescription>Narrow the table by district, programme, officer or status.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={district} onValueChange={(v) => update("district", v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="District" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All districts</SelectItem>
                {["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={programme} onValueChange={(v) => update("programme", v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Programme" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All programmes</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Livelihood">Livelihood</SelectItem>
                <SelectItem value="Health">Health</SelectItem>
              </SelectContent>
            </Select>
            <Select value={officerId} onValueChange={(v) => update("officer", v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Officer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All officers</SelectItem>
                {officers.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All status</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No follow-ups match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Case / Household</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Programme</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">District</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Officer</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Due</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Priority</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((f) => {
                    const overdue = f.status !== "Completed" && isOverdue(f.dueDate);
                    return (
                      <tr key={f.id} className={cn("transition-colors hover:bg-muted/40", overdue && "bg-rose-50/30 dark:bg-rose-500/10")}>
                        <td className="px-3 py-2.5">
                          <Badge variant={
                            f.status === "Completed" ? "success" :
                            overdue ? "danger" :
                            f.status === "In Progress" ? "info" :
                            "warning"
                          } className="rounded-md px-2 py-0.5">
                            {f.status === "Completed" ? "Completed" : overdue ? "Overdue" : f.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{f.type}</td>
                        <td className="px-3 py-2.5">
                          <Link to={`/cases/${f.caseId}`} className="font-medium hover:underline">{f.caseId}</Link>
                          <p className="text-[11px] text-muted-foreground">{f.notes ?? "—"}</p>
                        </td>
                        <td className="px-3 py-2.5"><ProgrammeBadge programme={f.programme} /></td>
                        <td className="px-3 py-2.5 text-xs">{f.district}</td>
                        <td className="px-3 py-2.5 text-xs">{f.assignedOfficerName}</td>
                        <td className="px-3 py-2.5 text-xs">
                          <p>{formatDate(f.dueDate)}</p>
                          <p className={cn("text-[11px]", overdue && "font-medium text-rose-600 dark:text-rose-400")}>{formatRelative(f.dueDate)}{isDueToday(f.dueDate) ? " · today" : ""}</p>
                        </td>
                        <td className="px-3 py-2.5"><PriorityBadge priority={f.priority} /></td>
                        <td className="px-3 py-2.5 text-right">
                          {f.status !== "Completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await followUpService.complete(f.id);
                                success("Follow-up completed");
                                setItems((p) => p.map((it) => it.id === f.id ? { ...it, status: "Completed" } : it));
                              }}
                            >
                              Mark done
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
