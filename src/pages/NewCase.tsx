import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Search as SearchIcon,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  School,
  Briefcase,
  HeartPulse,
  ChevronRight,
  Save,
  X,
  FileText,
  ListChecks,
  Pencil,
  History,
  Receipt,
  Send,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { caseService, householdService, officerService } from "@/services/caseService";
import { aiService } from "@/services/aiService";
import { useUser } from "@/app/providers/AuthProvider";
import { useToast } from "@/services/toastService";
import { accessLogService } from "@/services/accessLogService";
import { cn, currency } from "@/lib/utils";
import { ProgrammeBadge, PriorityBadge, StatusBadge } from "@/components/domain/StatusBadge";
import type { AIDraft, DuplicateRisk, Household, Priority, Programme } from "@/types";

type Step = "household" | "programme" | "note" | "analyze" | "review" | "duplicate" | "submitted";

const PROGRAMMES: { value: Programme; label: string; icon: any; desc: string }[] = [
  { value: "Education", label: "Education", icon: School, desc: "Stipends, school supplies, tuition support" },
  { value: "Livelihood", label: "Livelihood", icon: Briefcase, desc: "Income, enterprise, asset support" },
  { value: "Health", label: "Health", icon: HeartPulse, desc: "Medical referral, nutrition, therapy" },
];

const SAMPLE_NOTES: Record<Programme, string> = {
  Education:
    "Rekha bibi, swami na thaka, chele class 8 drop 3 mas, meye class 5, barite income nai, VGD card nai, school sir bole stipend lagbe.",
  Livelihood:
    "Amir Hossain, rowmari, khet majhi. Wife tailoring pare. Chele class 9 porche. Sewing machine grant chai.",
  Health:
    "Shila Akter, masterpara. Meye Mim, boyos 8, weight kom. April e MAM dharono hoyeche. Nutrition monitoring er dorkar.",
};

export default function NewCasePage() {
  const navigate = useNavigate();
  const user = useUser();
  const { success, info, warning } = useToast();

  const [step, setStep] = useState<Step>("household");
  const [search, setSearch] = useState("");
  const [householdId, setHouseholdId] = useState<string>("");
  const [programme, setProgramme] = useState<Programme>("Education");
  const [note, setNote] = useState("");
  const [aiResult, setAiResult] = useState<{ draft: AIDraft; risk: DuplicateRisk | null } | null>(null);
  const [editedDraft, setEditedDraft] = useState<AIDraft | null>(null);
  const [stipend, setStipend] = useState<number | "">("");
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [officers, setOfficers] = useState<any[]>([]);
  const [officerId, setOfficerId] = useState<string>("");
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdsLoading, setHouseholdsLoading] = useState(true);

  const filteredHouseholds = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return households.slice(0, 6);
    return households.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q) ||
        h.village.toLowerCase().includes(q) ||
        h.union.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [search, households]);

  const selectedHousehold = useMemo(
    () => households.find((h) => h.id === householdId) ?? null,
    [householdId, households],
  );

  useEffect(() => {
    householdService.list().then((rows) => {
      setHouseholds(rows);
      setHouseholdsLoading(false);
    });
    officerService.list().then(setOfficers);
  }, []);

  useEffect(() => {
    if (user?.role === "field_officer") setOfficerId(user.id);
  }, [user]);

  const handleAnalyze = async () => {
    setStep("analyze");
    setProgress(0);
    const steps = [
      "Extracting household context",
      "Identifying programme need",
      "Assessing urgency",
      "Reviewing household history",
      "Checking duplicate-assistance risk",
    ];
    for (let i = 0; i < steps.length; i++) {
      setProgressStep(steps[i]);
      setProgress(((i + 1) / steps.length) * 100);
      await new Promise((r) => setTimeout(r, 540));
    }
    const result = await aiService.analyze({ note, household: selectedHousehold });
    setAiResult(result);
    setEditedDraft(result.draft);
    setStipend(result.draft.proposedStipend ?? "");
    if (result.fallback) {
      warning(
        "AI unavailable — using rule-based draft",
        result.reason ?? "Set ANTHROPIC_API_KEY to enable real LLM analysis.",
      );
    } else {
      info("AI draft ready", "Review the fields below before submitting for coordinator approval.");
    }
    if (result.risk && result.risk.relatedCaseId) {
      setStep("duplicate");
    } else {
      setStep("review");
    }
  };

  const handleSubmit = async () => {
    if (!editedDraft || !selectedHousehold) return;
    setSubmitting(true);
    try {
      const created = await caseService.create({
        householdId: selectedHousehold.id,
        householdName: selectedHousehold.name,
        programme: editedDraft.need,
        request: `Field note → ${editedDraft.need} support for ${selectedHousehold.name}`,
        district: selectedHousehold.district,
        union: selectedHousehold.union,
        village: selectedHousehold.village,
        assignedOfficerId: officerId || (user?.id ?? ""),
        assignedOfficerName: officers.find((o) => o.id === officerId)?.name || user?.name || "",
        priority: editedDraft.urgency,
        status: "Under Review",
        need: editedDraft.need,
        summary: editedDraft.summary,
        householdContext: editedDraft.householdContext,
        urgency: editedDraft.urgency,
        suggestedActions: editedDraft.suggestedActions,
        documentsNeeded: editedDraft.documentsNeeded,
        donorReportDraft: editedDraft.donorReportDraft,
        aiDraft: editedDraft,
        stipendAmount: typeof stipend === "number" ? stipend : undefined,
        createdBy: user?.name ?? "Unknown",
      });
      accessLogService.log({
        user: user?.name ?? "Unknown",
        userRole: user?.role ?? "field_officer",
        action: "Created case from AI draft",
        resource: created.id,
      });
      success(`Case ${created.id} created`, "Sent to coordinator for review.");
      setStep("submitted");
      setTimeout(() => navigate(`/cases/${created.id}`), 1100);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-xs text-muted-foreground">New case · AI-assisted intake</p>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {step === "household" && (
        <Card>
          <CardHeader>
            <CardTitle>Select the household</CardTitle>
            <CardDescription>Search by name, ID, union or village. The household links this case to its full programme history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search households…"
                className="pl-9"
              />
            </div>
            {householdsLoading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {filteredHouseholds.map((h) => {
                    const selected = householdId === h.id;
                    return (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => setHouseholdId(h.id)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all",
                            selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/40 hover:bg-accent",
                          )}
                        >
                          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
                            {h.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{h.name}</p>
                            <p className="text-xs text-muted-foreground">{h.id} · {h.village}, {h.union}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="rounded-md px-1.5 text-[10px]">{h.district}</Badge>
                              {h.activeProgrammes.map((p) => (
                                <ProgrammeBadge key={p} programme={p} className="px-1.5 text-[10px]" />
                              ))}
                            </div>
                          </div>
                          {selected && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filteredHouseholds.length === 0 && (
                  <Alert variant="info" title="No households found">Try searching by a different term. Households are listed as they match.</Alert>
                )}
              </>
            )}
            <div className="flex justify-end">
              <Button disabled={!householdId} onClick={() => setStep("programme")}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "programme" && selectedHousehold && (
        <Card>
          <CardHeader>
            <CardTitle>Choose programme</CardTitle>
            <CardDescription>AI will use this as a hint, but it can correct itself based on the field note.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
                {selectedHousehold.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedHousehold.name}</p>
                <p className="text-xs text-muted-foreground">{selectedHousehold.id} · {selectedHousehold.village}, {selectedHousehold.district}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("household")}>Change</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PROGRAMMES.map((p) => {
                const Icon = p.icon;
                const selected = programme === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProgramme(p.value)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/40 hover:bg-accent",
                    )}
                  >
                    <span className={cn(
                      "grid h-10 w-10 place-items-center rounded-lg",
                      p.value === "Education" && "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
                      p.value === "Livelihood" && "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                      p.value === "Health" && "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300",
                    )}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    {selected && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("household")}>Back</Button>
              <Button onClick={() => setStep("note")}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "note" && selectedHousehold && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Field note
            </CardTitle>
            <CardDescription>
              Write the visit note as you'd write it in your notebook — Banglish or English. The AI will structure it into a draft case.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
                {selectedHousehold.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
              </span>
              <div className="flex-1">
                <p className="font-medium">{selectedHousehold.name}</p>
                <p className="text-xs text-muted-foreground">{programme} programme · {selectedHousehold.village}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Your field note</Label>
              <Textarea
                id="note"
                rows={6}
                placeholder={`Example for ${selectedHousehold.name}:\n${SAMPLE_NOTES[programme]}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[140px]"
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">{note.length} characters · AI will draft a structured case from this note.</p>
                <Button variant="link" size="sm" onClick={() => setNote(SAMPLE_NOTES[programme])}>
                  Use sample note
                </Button>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep("programme")}>Back</Button>
              <Button onClick={handleAnalyze} disabled={note.trim().length < 6} size="lg">
                <Sparkles className="h-4 w-4" /> Analyze with AI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "analyze" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse-soft text-violet-600" />
              AI is analyzing your note
            </CardTitle>
            <CardDescription>Extracting household context, programme need, urgency and duplicate-risk signals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="grid gap-2 sm:grid-cols-5">
              {[
                "Extracting household context",
                "Identifying programme need",
                "Assessing urgency",
                "Reviewing household history",
                "Checking duplicate-assistance risk",
              ].map((label, i) => {
                const reached = progress >= ((i + 1) / 5) * 100;
                const active = progressStep === label;
                return (
                  <div
                    key={label}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border bg-background p-3 text-xs",
                      reached && "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/15",
                      active && "border-violet-300 bg-violet-50/50 dark:bg-violet-500/15",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {reached ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                      )}
                      <p className={cn("font-medium", reached && "text-emerald-900 dark:text-emerald-200", active && "text-violet-900 dark:text-violet-200")}>Step {i + 1}</p>
                    </div>
                    <p className="text-muted-foreground">{label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "duplicate" && aiResult?.risk && editedDraft && (
        <DuplicateRiskReview
          risk={aiResult.risk}
          draft={editedDraft}
          onContinue={(draft) => {
            setEditedDraft(draft);
            setStep("review");
          }}
          onCancel={() => setStep("note")}
        />
      )}

      {step === "review" && editedDraft && selectedHousehold && (
        <ReviewDraft
          draft={editedDraft}
          setDraft={setEditedDraft}
          stipend={stipend}
          setStipend={setStipend}
          householdName={selectedHousehold.name}
          officerId={officerId}
          setOfficerId={setOfficerId}
          officers={officers}
          userRole={user?.role}
          onSubmit={handleSubmit}
          submitting={submitting}
          onBack={() => setStep("note")}
        />
      )}

      {step === "submitted" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-base font-medium">Case submitted</p>
            <p className="text-xs text-muted-foreground">Opening case detail…</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "household", label: "Household" },
    { id: "programme", label: "Programme" },
    { id: "note", label: "Note" },
    { id: "analyze", label: "Analyze" },
    { id: "review", label: "Review" },
  ];
  const order: Step[] = ["household", "programme", "note", "analyze", "duplicate", "review", "submitted"];
  const currentIndex = order.indexOf(step);
  return (
    <ol className="flex items-center gap-2 overflow-x-auto text-xs">
      {steps.map((s, i) => {
        const active = currentIndex >= order.indexOf(s.id);
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-medium",
                active ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
          </li>
        );
      })}
    </ol>
  );
}

function DuplicateRiskReview({
  risk,
  draft,
  onContinue,
  onCancel,
}: {
  risk: DuplicateRisk;
  draft: AIDraft;
  onContinue: (d: AIDraft) => void;
  onCancel: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <div className="space-y-4">
      <Alert variant="danger" title="Potential duplicate-assistance risk">
        {risk.summary}
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Why the previous record matters</CardTitle>
          <CardDescription>The household is already known to the programme. Coordinator review prevents overlap.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-lg border bg-rose-50/40 dark:bg-rose-500/10 p-4 text-sm">
            <p className="font-medium text-rose-900 dark:text-rose-200">{risk.summary}</p>
            {risk.detail && <p className="mt-1 text-rose-800 dark:text-rose-300">{risk.detail}</p>}
            <div className="mt-3 flex items-center gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-rose-700 dark:text-rose-300">Related case</p>
                <p className="font-medium">{risk.relatedCaseId ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-rose-700 dark:text-rose-300">Programme</p>
                <p className="font-medium">{risk.relatedProgramme}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-rose-700 dark:text-rose-300">When</p>
                <p className="font-medium">{risk.monthsAgo ? `~${risk.monthsAgo} months ago` : "—"}</p>
              </div>
            </div>
            {risk.relatedCaseId && (
              <Link
                to={`/cases/${risk.relatedCaseId}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-rose-200 dark:border-rose-500/40 bg-white dark:bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-500/25"
              >
                Review related case history <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          <label className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
            />
            <span>
              I have reviewed the household's prior programme history and confirm this request is for a complementary need.
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onCancel}>Back to note</Button>
        <Button onClick={() => onContinue(draft)} disabled={!acknowledged}>
          Continue with justification <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ReviewDraft({
  draft,
  setDraft,
  stipend,
  setStipend,
  householdName,
  officerId,
  setOfficerId,
  officers,
  userRole,
  onSubmit,
  submitting,
  onBack,
}: {
  draft: AIDraft;
  setDraft: (d: AIDraft) => void;
  stipend: number | "";
  setStipend: (s: number | "") => void;
  householdName: string;
  officerId: string;
  setOfficerId: (id: string) => void;
  officers: any[];
  userRole?: string;
  onSubmit: () => void;
  submitting: boolean;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="ai" title="AI-generated draft — coordinator review required">
        This is a draft structured by the AI assistant. A Programme Coordinator will review, edit and approve before the case becomes official.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Case summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Field
              label="Concise summary"
              value={draft.summary}
              onChange={(v) => setDraft({ ...draft, summary: v })}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Primary need"
                value={draft.need}
                onChange={(v) => setDraft({ ...draft, need: v as Programme })}
              />
              <Field
                label="Urgency"
                value={draft.urgency}
                onChange={(v) => setDraft({ ...draft, urgency: v as Priority })}
              />
              <div>
                <Label>Priority badge</Label>
                <div className="mt-2"><PriorityBadge priority={draft.urgency} /></div>
              </div>
            </div>
            <Field
              label="Household context"
              value={draft.householdContext}
              onChange={(v) => setDraft({ ...draft, householdContext: v })}
              multiline
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Proposed stipend</CardTitle>
            <CardDescription>Coordinator may adjust the proposed amount before approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <Label htmlFor="stipend">Amount (BDT)</Label>
              <Input
                id="stipend"
                type="number"
                value={stipend}
                onChange={(e) => setStipend(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="1200"
                className="mt-1"
              />
              {typeof stipend === "number" && stipend > 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">≈ {currency(stipend)} per term</p>
              )}
            </div>
            <div>
              <Label>Programme</Label>
              <div className="mt-2"><ProgrammeBadge programme={draft.need} /></div>
            </div>
            <div>
              <Label>Assign officer</Label>
              <Select value={officerId} onValueChange={setOfficerId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select officer" /></SelectTrigger>
                <SelectContent>
                  {officers.filter((o) => o.status === "Active").map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name} · {o.district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Suggested follow-up actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {draft.suggestedActions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <Input value={a} onChange={(e) => {
                  const next = [...draft.suggestedActions];
                  next[i] = e.target.value;
                  setDraft({ ...draft, suggestedActions: next });
                }} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {draft.documentsNeeded.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <FileText className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <Input value={d} onChange={(e) => {
                  const next = [...draft.documentsNeeded];
                  next[i] = e.target.value;
                  setDraft({ ...draft, documentsNeeded: next });
                }} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donor-report draft (one line)</CardTitle>
          <CardDescription>Aggregated and anonymized before being added to donor reports.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea value={draft.donorReportDraft} onChange={(e) => setDraft({ ...draft, donorReportDraft: e.target.value })} rows={2} />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { /* Save draft feature — not in scope */ }} disabled>
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for coordinator review
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      )}
    </div>
  );
}

// Link is needed for "Review related case history" above
import { Link } from "react-router-dom";
