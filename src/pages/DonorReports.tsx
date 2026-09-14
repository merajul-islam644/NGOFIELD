import { useEffect, useState } from "react";
import {
  Download,
  Lock,
  ShieldCheck,
  Users,
  FolderOpenDot,
  CheckCircle2,
  CalendarClock,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { reportService } from "@/services/caseService";
import { StatsCard } from "@/components/domain/StatsCard";
import { Alert } from "@/components/ui/alert";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/services/toastService";
import { useUser } from "@/app/providers/AuthProvider";
import { accessLogService } from "@/services/accessLogService";

export default function DonorReportsPage() {
  const user = useUser();
  const { success } = useToast();
  const [aggregate, setAggregate] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [justificationOpen, setJustificationOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    Promise.all([
      reportService.donorAggregate(),
      reportService.programmeFunnel(),
    ]).then(([agg, fnl]) => {
      setAggregate(agg);
      setFunnel(fnl);
      setLoading(false);
    });
  }, []);

  const handleAggregateExport = () => {
    accessLogService.log({
      user: user?.name ?? "Unknown",
      userRole: user?.role ?? "regional_manager",
      action: "Exported aggregate donor report",
      resource: "Aggregate · September 2026",
    });
    success("Aggregate report exported", "Beneficiary identities not included.");
  };

  const handleIndividualSubmit = () => {
    if (!reason.trim()) return;
    accessLogService.log({
      user: user?.name ?? "Unknown",
      userRole: user?.role ?? "regional_manager",
      action: "Requested individual beneficiary report",
      resource: "Rekha Bibi · HH-KUR-00821",
      reason,
    });
    setJustificationOpen(false);
    setReason("");
    success("Request submitted", "Your justification was logged in the access audit trail.");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Donor reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aggregate-first reporting. Beneficiary identities removed by default.</p>
        </div>
        <Button onClick={handleAggregateExport}>
          <Download className="h-4 w-4" /> Export aggregate (PDF)
        </Button>
      </header>

      <Alert variant="info" title="Privacy-first by design" icon={<ShieldCheck className="h-5 w-5 text-sky-700 dark:text-sky-300" />}>
        Donor reports show aggregate metrics only — no beneficiary names, addresses, phone numbers or health notes appear here.
        Requesting an individual report requires a written justification that is recorded in the access log.
      </Alert>

      {loading || !aggregate ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard label="Households reached" value={aggregate.householdsReached} icon={Users} tone="info" />
          <StatsCard label="Cases opened" value={aggregate.casesOpened} icon={FolderOpenDot} tone="default" />
          <StatsCard label="Cases completed" value={aggregate.casesCompleted} icon={CheckCircle2} tone="success" />
          <StatsCard label="Successful outcomes" value={aggregate.successfulOutcomes} icon={CheckCircle2} tone="purple" />
          <StatsCard label="Follow-ups completed" value={aggregate.followUpsCompleted} icon={CalendarClock} tone="warning" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> Programme funnels</CardTitle>
            <CardDescription>From intake to outcome — anonymized aggregate</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnel.flatMap((f) => f.funnel.map((s: any, i: number) => ({ programme: f.programme, step: s.label, value: s.value, idx: i })))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="step" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Individual report</CardTitle>
            <CardDescription>Requires written justification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Request example</p>
              <p className="mt-1 text-xs text-muted-foreground">Rekha Bibi · HH-KUR-00821 · Education programme</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setJustificationOpen(true)}>
              <Lock className="h-4 w-4" /> Request individual report
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Justification is mandatory. Each request is logged with user, action, resource, reason and timestamp.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={justificationOpen} onOpenChange={setJustificationOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Individual beneficiary information requires a stated business justification.</DialogTitle>
            <DialogDescription>
              Each request is logged in the access audit trail with user, action, resource, reason and timestamp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-rose-50/40 dark:bg-rose-500/10 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-rose-900 dark:text-rose-200">Resource</p>
              <p className="mt-0.5 font-medium">Rekha Bibi · HH-KUR-00821 · Education stipend</p>
            </div>
            <div>
              <label className="text-sm font-medium">Justification</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Donor follow-up call regarding Sept 2026 stipend"
                rows={4}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">A non-empty reason is required.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setJustificationOpen(false)}>Cancel</Button>
            <Button onClick={handleIndividualSubmit} disabled={!reason.trim()}>
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
