import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CaseRecord, FollowUpType, Priority } from "@/types";
import { followUpService } from "@/services/caseService";
import { useToast } from "@/services/toastService";

const TYPES: FollowUpType[] = ["Phone call", "Household visit", "School verification", "Document collection", "Programme review", "Outcome verification"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];

export function FollowUpDialog({
  open,
  onOpenChange,
  caseRecord,
  officerId,
  officerName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  caseRecord: CaseRecord;
  officerId: string;
  officerName: string;
  onCreated: () => void;
}) {
  const { success } = useToast();
  const [type, setType] = useState<FollowUpType>("Household visit");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [priority, setPriority] = useState<Priority>("Medium");
  const [notes, setNotes] = useState("");
  const [assignSelf, setAssignSelf] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setType("Household visit");
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setDueDate(d.toISOString().slice(0, 10));
      setPriority("Medium");
      setNotes("");
      setAssignSelf(true);
    }
  }, [open]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await followUpService.create({
        caseId: caseRecord.id,
        householdId: caseRecord.householdId,
        type,
        dueDate: new Date(dueDate).toISOString(),
        assignedOfficerId: officerId,
        assignedOfficerName: officerName,
        notes: notes || undefined,
        priority,
        district: caseRecord.district,
        programme: caseRecord.programme,
      });
      onOpenChange(false);
      onCreated();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Schedule follow-up
          </DialogTitle>
          <DialogDescription>
            For {caseRecord.householdName} · {caseRecord.id}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="due">Due date</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned officer</Label>
            <div className="mt-1 flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
              {officerName || "Current user"}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Reassignment supported via Team & Assignments.</p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="What needs to happen during this follow-up?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            Schedule follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
