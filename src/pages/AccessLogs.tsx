import { useEffect, useState } from "react";
import { ScrollText, ShieldCheck, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { accessLogService } from "@/services/accessLogService";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelative } from "@/lib/utils";
import { ROLE_LABEL } from "@/services/authService";
import type { Role } from "@/types";

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    setLogs(accessLogService.list());
    setLoading(false);
  }, []);

  const filtered = logs.filter((l) => {
    if (!q) return true;
    return [l.user, l.action, l.resource, l.reason ?? ""].join(" ").toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Access logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sensitive actions, exports and individual report requests.</p>
        </div>
        <Badge variant="info" className="self-start">
          <ShieldCheck className="mr-1 h-3 w-3" /> Audit-ready
        </Badge>
      </header>

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by user, action, resource or reason…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Recent activity</CardTitle>
          <CardDescription>Newest entries first</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No access log entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">When</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">User</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Resource</th>
                    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2.5 text-xs">
                        <p>{formatDate(l.at, { withTime: true })}</p>
                        <p className="text-[11px] text-muted-foreground">{formatRelative(l.at)}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm font-medium">{l.user}</p>
                        <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[l.userRole as Role]}</p>
                      </td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className="rounded-md">{l.action}</Badge></td>
                      <td className="px-3 py-2.5 text-xs">{l.resource}</td>
                      <td className="px-3 py-2.5 text-xs italic text-muted-foreground">{l.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
