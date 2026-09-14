import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  History,
  Home,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Send,
  ShieldAlert,
  Sparkles,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { caseService, followUpService, householdService, officerService } from "@/services/caseService";
import { useAuth } from "@/services/authService";
import { useToast } from "@/services/toastService";
import { cn, formatDate, formatRelative, initials, isOverdue } from "@/lib/utils";
import type { CaseRecord, CaseStatus, FollowUp } from "@/types";
import { PriorityBadge, ProgrammeBadge, StatusBadge } from "@/components/domain/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SensitiveField } from "@/components/domain/SensitiveField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FollowUpDialog } from "@/components/domain/FollowUpDialog";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, info } = useToast();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [officers, setOfficers] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const c = await caseService.get(id);
      if (!c) {
        setError("Case not found");
      } else {
        setCaseData(c);
        const fus = await followUpService.list({});
        setFollowUps(fus.filter((f) => f.caseId === c.id));
      }
    } catch (e: any) {
      setError(e.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    officerService.list().then(setOfficers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !caseData) {
    return <Alert variant="danger" title="Couldn't open case">{error ?? "Unknown error"}</Alert>;
  }

  const canEdit = user?.role === "programme_coordinator" || user?.role === "regional_manager";
  const isFieldOfficer = user?.role === "field_officer" && caseData.assignedOfficerId === user.id;

  const handleApprove = async () => {
    if (!canEdit) return;
    await caseService.setStatus(caseData.id, "Approved", user?.name ?? "Unknown", "Coordinator approved");
    success("Case approved", "Status moved to Approved.");
    load();
  };
  const handleAssign = async () => {
    if (!canEdit) return;
    await caseService.setStatus(caseData.id, "Assigned", user?.name ?? "Unknown", "Assigned to field officer");
    info("Case assigned", "Field officer notified.");
    load();
  };
  const handleComplete = async () => {
    if (!canEdit) return;
    await caseService.setStatus(caseData.id, "Completed", user?.name ?? "Unknown", "Marked completed");
    success("Case marked completed");
    load();
  };

  const sortedTimeline = [...caseData.timeline].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{caseData.id}</h1>
            <StatusBadge status={caseData.status} />
            <PriorityBadge priority={caseData.priority} />
            <ProgrammeBadge programme={caseData.programme} />
          </div>
          <p className="text-sm text-muted-foreground">{caseData.request}</p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {caseData.status === "Under Review" && (
              <Button onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
            )}
            {caseData.status === "Approved" && (
              <Button onClick={handleAssign}>
                <Send className="h-4 w-4" /> Mark assigned
              </Button>
            )}
            {(caseData.status === "In Progress" || caseData.status === "Assigned") && (
              <Button onClick={handleComplete}>
                <CheckCircle2 className="h-4 w-4" /> Mark completed
              </Button>
            )}
            <Button variant="outline" onClick={() => setReassignOpen(true)}>
              <UserCog className="h-4 w-4" /> Reassign
            </Button>
            <Button variant="outline" onClick={() => setFollowUpOpen(true)}>
              <Plus className="h-4 w-4" /> Follow-up
            </Button>
          </div>
        )}
        {!canEdit && isFieldOfficer && (
          <Button variant="outline" onClick={() => setFollowUpOpen(true)}>
            <Plus className="h-4 w-4" /> Add follow-up
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Household" value={caseData.householdName} sub={caseData.village} icon={Home} to={`/households/${caseData.householdId}`} />
        <SummaryTile label="Programme" value={caseData.programme} sub={caseData.need} icon={Sparkles} />
        <SummaryTile label="Assigned officer" value={caseData.assignedOfficerName} sub={caseData.district} icon={Users} />
        <SummaryTile
          label="Stipend"
          value={caseData.stipendAmount ? `৳${caseData.stipendAmount.toLocaleString()}` : "—"}
          sub="per term"
          icon={Wallet}
        />
      </div>

      {caseData.aiDraft?.duplicateRisk && (
        <Alert variant="danger" title="Duplicate-assistance risk identified">
          {caseData.aiDraft.duplicateRisk.summary}{" "}
          <Link to={`/cases/${caseData.aiDraft.duplicateRisk.relatedCaseId}`} className="font-medium underline">
            Review related case
          </Link>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups ({followUps.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="donor">Donor draft</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Case summary</CardTitle>
                <CardDescription>Coordinator-approved record</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <DetailRow label="Summary">{caseData.summary}</DetailRow>
                <DetailRow label="Need">{caseData.need}</DetailRow>
                <DetailRow label="Urgency"><PriorityBadge priority={caseData.urgency} /></DetailRow>
                <DetailRow label="Household context">{caseData.householdContext}</DetailRow>
                <DetailRow label="Suggested actions">
                  <ul className="space-y-1">
                    {caseData.suggestedActions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> {a}
                      </li>
                    ))}
                  </ul>
                </DetailRow>
                <DetailRow label="Documents needed">
                  <ul className="space-y-1">
                    {caseData.documentsNeeded.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" /> {d}
                      </li>
                    ))}
                  </ul>
                </DetailRow>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Household context</CardTitle>
                <CardDescription>Sensitive fields are restricted to authorized staff.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Household ID</p>
                  <p className="font-medium">{caseData.householdId}</p>
                  <Link to={`/households/${caseData.householdId}`} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Open household profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <SensitiveField>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Poverty score">— (see household)</DetailRow>
                    <DetailRow label="Household income">— (see household)</DetailRow>
                    <DetailRow label="Vulnerability">— (see household)</DetailRow>
                    <DetailRow label="Health notes">— (see household)</DetailRow>
                  </div>
                </SensitiveField>
              </CardContent>
            </Card>
          </div>

          {caseData.aiDraft && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /> AI-draft trail</CardTitle>
                <CardDescription>Draft generated by the AI assistant from the field officer's note.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-0 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Detected need</p>
                  <p className="mt-1 text-sm font-medium">{caseData.aiDraft.need}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Urgency</p>
                  <p className="mt-1 text-sm font-medium">{caseData.aiDraft.urgency}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Proposed stipend</p>
                  <p className="mt-1 text-sm font-medium">
                    {caseData.aiDraft.proposedStipend ? `৳${caseData.aiDraft.proposedStipend.toLocaleString()}` : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="followups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Follow-ups</CardTitle>
                <CardDescription>Scheduled, completed, overdue</CardDescription>
              </div>
              <Button size="sm" onClick={() => setFollowUpOpen(true)}>
                <Plus className="h-4 w-4" /> New follow-up
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {followUps.length === 0 ? (
                <div className="rounded-md border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
                  <ListChecks className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  No follow-ups scheduled.
                </div>
              ) : (
                <ul className="divide-y">
                  {followUps.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-3">
                      <span className={cn(
                        "grid h-9 w-9 place-items-center rounded-full",
                        f.status === "Completed" && "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                        f.status === "Overdue" && "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
                        f.status === "Scheduled" && "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
                      )}>
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{f.type}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{f.notes ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{formatDate(f.dueDate)}</p>
                        <p className={cn("text-[11px]", isOverdue(f.dueDate) && f.status !== "Completed" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                          {formatRelative(f.dueDate)}
                        </p>
                      </div>
                      <PriorityBadge priority={f.priority} />
                      {f.status !== "Completed" && (
                        <Button variant="outline" size="sm" onClick={async () => {
                          await followUpService.complete(f.id);
                          success("Follow-up completed");
                          load();
                        }}>
                          Mark done
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Case timeline</CardTitle>
              <CardDescription>All actor actions on this case</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="relative space-y-4 border-l border-border pl-6">
                {sortedTimeline.map((t) => (
                  <li key={t.id} className="relative">
                    <span className="absolute -left-[33px] grid h-6 w-6 place-items-center rounded-full border bg-card text-muted-foreground">
                      <Clock className="h-3 w-3" />
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{t.action}</p>
                      <Badge variant="neutral" className="rounded-md px-1.5 text-[10px]">{t.actor}</Badge>
                    </div>
                    {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(t.at, { withTime: true })} · {formatRelative(t.at)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Documents checklist</CardTitle>
              <CardDescription>Track which supporting documents have been collected.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {caseData.documents.length === 0 ? (
                <Alert variant="info" title="No documents required">
                  This case has no document requirements yet. Add documents via the AI suggested-actions editor.
                </Alert>
              ) : (
                <ul className="divide-y">
                  {caseData.documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        defaultChecked={d.collected}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{d.type.replace("_", " ")}</p>
                      </div>
                      {d.required ? <Badge variant="warning">Required</Badge> : <Badge variant="neutral">Optional</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donor">
          <Card>
            <CardHeader>
              <CardTitle>Donor-report draft</CardTitle>
              <CardDescription>
                Aggregated and anonymized before publishing in donor reports. Beneficiary identity is removed by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6">
                {caseData.donorReportDraft || "No donor draft available yet."}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        caseRecord={caseData}
        officerId={user?.id ?? ""}
        officerName={user?.name ?? ""}
        onCreated={() => {
          load();
          success("Follow-up scheduled");
        }}
      />

      <ReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        caseRecord={caseData}
        officers={officers}
        onReassigned={() => {
          load();
          success("Case reassigned", "Household history preserved.");
        }}
      />
    </div>
  );
}

function SummaryTile({ label, value, sub, icon: Icon, to }: { label: string; value: string; sub?: string; icon: any; to?: string }) {
  const inner = (
    <Card className="h-full">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
  if (to) {
    return <Link to={to}>{inner}</Link>;
  }
  return inner;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm leading-6 text-foreground">{children}</div>
    </div>
  );
}

function ReassignDialog({
  open,
  onOpenChange,
  caseRecord,
  officers,
  onReassigned,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  caseRecord: CaseRecord;
  officers: any[];
  onReassigned: () => void;
}) {
  const { user } = useAuth();
  const { success } = useToast();
  const [selected, setSelected] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const eligible = officers.filter((o) => o.status === "Active" && o.id !== caseRecord.assignedOfficerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Reassign case</DialogTitle>
          <DialogDescription>
            Household history and follow-ups remain intact. Original assignment remains in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Currently assigned</p>
            <p className="mt-1 font-medium">{caseRecord.assignedOfficerName}</p>
          </div>
          <div>
            <label className="text-sm font-medium">New officer</label>
            <select
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select officer…</option>
              {eligible.map((o) => (
                <option key={o.id} value={o.id}>{o.name} · {o.district}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!selected || submitting}
            onClick={async () => {
              const officer = officers.find((o) => o.id === selected);
              if (!officer) return;
              setSubmitting(true);
              await caseService.reassign(caseRecord.id, officer.id, officer.name, user?.name ?? "Unknown");
              setSubmitting(false);
              onOpenChange(false);
              onReassigned();
            }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
            Reassign case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
