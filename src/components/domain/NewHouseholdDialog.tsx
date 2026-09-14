import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { householdService } from "@/services/caseService";
import { useToast } from "@/services/toastService";
import { useUser } from "@/app/providers/AuthProvider";
import { accessLogService } from "@/services/accessLogService";
import type { District, HouseholdMember, Programme } from "@/types";

interface DraftMember {
  name: string;
  relation: string;
  age: string; // keep as string for input
  notes: string;
}

const DISTRICTS: District[] = ["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"];
const PROGRAMMES: Programme[] = ["Education", "Livelihood", "Health"];

const emptyMember = (): DraftMember => ({ name: "", relation: "", age: "", notes: "" });

export function NewHouseholdDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const user = useUser();
  const { success } = useToast();

  const [name, setName] = useState("");
  const [district, setDistrict] = useState<District>("Kurigram");
  const [union, setUnion] = useState("");
  const [village, setVillage] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedArea, setAssignedArea] = useState("");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [povertyScore, setPovertyScore] = useState<string>("");
  const [income, setIncome] = useState<string>("");
  const [vulnerability, setVulnerability] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([emptyMember()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDistrict("Kurigram");
      setUnion("");
      setVillage("");
      setPhone("");
      setAssignedArea("");
      setProgrammes([]);
      setPovertyScore("");
      setIncome("");
      setVulnerability("");
      setHealthNotes("");
      setMembers([emptyMember()]);
      setError(null);
    }
  }, [open]);

  const toggleProgramme = (p: Programme) => {
    setProgrammes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const updateMember = (idx: number, patch: Partial<DraftMember>) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const removeMember = (idx: number) => {
    setMembers((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Household name is required");
      return;
    }
    const cleanedMembers: HouseholdMember[] = members
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        name: m.name.trim(),
        relation: m.relation.trim(),
        age: m.age ? Number(m.age) : 0,
        notes: m.notes.trim() || undefined,
      }));

    setSubmitting(true);
    try {
      const created = await householdService.create({
        name: name.trim(),
        district,
        union: union.trim(),
        village: village.trim(),
        phone: phone.trim(),
        assignedOfficerId: user?.id,
        assignedArea: assignedArea.trim(),
        povertyScore: povertyScore ? Number(povertyScore) : undefined,
        income: income ? Number(income) : undefined,
        vulnerability: vulnerability.trim() || undefined,
        healthNotes: healthNotes.trim() || undefined,
        activeProgrammes: programmes,
        members: cleanedMembers,
      });
      accessLogService.log({
        user: user?.name ?? "Unknown",
        userRole: user?.role ?? "field_officer",
        action: "Created household",
        resource: created.id,
      });
      success(`Household ${created.id} created`);
      onOpenChange(false);
      onCreated(created.id);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create household");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            New household
          </DialogTitle>
          <DialogDescription>
            Register a household in the programme area. Members can be added at any time.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="danger" title="Could not create household">
            {error}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="hh-name">Household name *</Label>
            <Input
              id="hh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rekha Bibi household"
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <Label>District *</Label>
            <Select value={district} onValueChange={(v) => setDistrict(v as District)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="hh-union">Union</Label>
            <Input id="hh-union" value={union} onChange={(e) => setUnion(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="hh-village">Village</Label>
            <Input id="hh-village" value={village} onChange={(e) => setVillage(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="hh-phone">Phone</Label>
            <Input id="hh-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="hh-area">Assigned area</Label>
            <Input id="hh-area" value={assignedArea} onChange={(e) => setAssignedArea(e.target.value)} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Active programmes</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROGRAMMES.map((p) => {
                const active = programmes.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleProgramme(p)}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/40 hover:bg-accent")
                    }
                  >
                    {p}
                  </button>
                );
              })}
              {programmes.length === 0 && (
                <span className="text-xs text-muted-foreground">None selected.</span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Household members</p>
              <p className="text-xs text-muted-foreground">Add at least one member if known.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMembers((prev) => [...prev, emptyMember()])}
            >
              <Plus className="h-3.5 w-3.5" /> Add member
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {/* Column headers — once, above the list */}
            <div className="hidden gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1.4fr_1fr_90px_1.6fr_36px]">
              <span>Name</span>
              <span>Relation</span>
              <span>Age</span>
              <span>Notes</span>
              <span className="sr-only">Remove</span>
            </div>
            {members.map((m, idx) => (
              <div
                key={idx}
                className="grid items-end gap-2 sm:grid-cols-[1.4fr_1fr_90px_1.6fr_36px]"
              >
                <div>
                  <Label className="mb-1 block text-[11px] sm:hidden">Name</Label>
                  <Input
                    value={m.name}
                    onChange={(e) => updateMember(idx, { name: e.target.value })}
                    placeholder="Member name"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] sm:hidden">Relation</Label>
                  <Input
                    value={m.relation}
                    onChange={(e) => updateMember(idx, { relation: e.target.value })}
                    placeholder="Head, spouse…"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] sm:hidden">Age</Label>
                  <Input
                    type="number"
                    value={m.age}
                    onChange={(e) => updateMember(idx, { age: e.target.value })}
                    placeholder="—"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-[11px] sm:hidden">Notes</Label>
                  <Input
                    value={m.notes}
                    onChange={(e) => updateMember(idx, { notes: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove member"
                    onClick={() => removeMember(idx)}
                    disabled={members.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="hh-score">Poverty score</Label>
            <Input
              id="hh-score"
              type="number"
              value={povertyScore}
              onChange={(e) => setPovertyScore(e.target.value)}
              placeholder="0–100"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="hh-income">Monthly income (BDT)</Label>
            <Input
              id="hh-income"
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g. 5000"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="hh-vuln">Vulnerability assessment</Label>
            <Textarea
              id="hh-vuln"
              rows={2}
              value={vulnerability}
              onChange={(e) => setVulnerability(e.target.value)}
              className="mt-1"
              placeholder="Optional — captured during field visits."
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="hh-health">Health notes</Label>
            <Textarea
              id="hh-health"
              rows={2}
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              className="mt-1"
              placeholder="Optional — health conditions or monitoring needs."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="neutral">Assigned officer: {user?.name ?? "—"}</Badge>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create household
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
