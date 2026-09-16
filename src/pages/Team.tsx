import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Loader2,
  Users,
  MapPin,
  Search,
  UserCog,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { officerService } from "@/services/caseService";
import { useUser } from "@/app/providers/AuthProvider";
import { useToast } from "@/services/toastService";
import { Skeleton } from "@/components/ui/skeleton";
import { initials, cn } from "@/lib/utils";
import type { Officer } from "@/types";
import { Alert } from "@/components/ui/alert";

export default function TeamPage() {
  const user = useUser();
  const { success } = useToast();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string>("All");
  const [transferTarget, setTransferTarget] = useState<Officer | null>(null);
  const [replacement, setReplacement] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ transferredOfficer: Officer; replacement: Officer | null; reassignedCases: number } | null>(null);

  const load = () => {
    setLoading(true);
    officerService.list().then((o) => {
      setOfficers(o);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = officers.filter((o) => {
    if (districtFilter !== "All" && o.district !== districtFilter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [o.name, o.email, o.district].join(" ").toLowerCase().includes(q);
  });

  const handleTransfer = async () => {
    if (!transferTarget) return;
    setSubmitting(true);
    const res = await officerService.transfer(
      transferTarget.id,
      transferTarget.district,
      user?.name ?? "Unknown",
      (user?.role ?? "field_officer") as any,
    );
    setResult(res);
    load();
    setSubmitting(false);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team & Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active field officers and their case assignments across the region.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search officers…"
                className="pl-9"
              />
            </div>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="sm:w-[200px]"><SelectValue placeholder="District" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All districts</SelectItem>
                {["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className={cn("bg-gradient-to-br text-white", o.avatarColor)}>
                      {o.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {o.district}
                    </p>
                  </div>
                  <Badge variant={o.status === "Active" ? "success" : o.status === "Transferred" ? "warning" : "neutral"}>
                    {o.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {o.programmes.map((p) => (
                    <Badge key={p} variant="outline" className="rounded-md px-1.5 text-[10px]">{p}</Badge>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {o.activeCases} active cases
                  </div>
                  {o.status === "Active" && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setTransferTarget(o);
                      setReplacement("");
                      setResult(null);
                    }}>
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!transferTarget} onOpenChange={(o) => { if (!o) { setTransferTarget(null); setResult(null); } }}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Officer transfer</DialogTitle>
            <DialogDescription>
              Transfer {transferTarget?.name} to a different district. Active cases will be reassigned to a replacement officer in {transferTarget?.district}.
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <>
              <Alert variant="warning" title="Heads up">
                This action will reassign all active cases belonging to {transferTarget?.name}. Household history and follow-ups remain intact. The original officer record is preserved in the audit trail.
              </Alert>

              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Transferring</p>
                  <p className="mt-0.5 text-base font-semibold">{transferTarget?.name}</p>
                  <p className="text-xs text-muted-foreground">{transferTarget?.district} · {transferTarget?.activeCases} active cases</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Transfer to district</label>
                  <Select defaultValue={transferTarget?.district === "Kurigram" ? "Jamalpur" : "Kurigram"}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"].filter((d) => d !== transferTarget?.district).map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Replacement officer</label>
                  <Select value={replacement} onValueChange={setReplacement}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select replacement officer" /></SelectTrigger>
                    <SelectContent>
                      {officers.filter((o) => o.status === "Active" && o.district === transferTarget?.district && o.id !== transferTarget?.id).map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-[11px] text-muted-foreground">Cases will be reassigned to this officer.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setTransferTarget(null)}>Cancel</Button>
                <Button onClick={handleTransfer} disabled={!replacement || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                  Confirm transfer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-3 py-2">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold">Transfer complete</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.reassignedCases} active case{result.reassignedCases === 1 ? "" : "s"} reassigned to {result.replacement?.name ?? "the new officer"}.
                  Household history preserved. Follow-ups preserved. Case ownership updated.
                </p>
              </div>
              <Alert variant="info" title="Audit trail preserved">
                Original officer record is retained. The transfer event is recorded on every case timeline with actor, timestamp and reason.
              </Alert>
              <DialogFooter>
                <Button onClick={() => { setTransferTarget(null); setResult(null); }}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
