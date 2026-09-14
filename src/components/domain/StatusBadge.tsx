import { Badge } from "@/components/ui/badge";
import type { CaseStatus, Priority } from "@/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const map: Record<CaseStatus, { variant: any; label: string }> = {
    "New": { variant: "info", label: "New" },
    "Under Review": { variant: "warning", label: "Under Review" },
    "Approved": { variant: "purple", label: "Approved" },
    "Assigned": { variant: "purple", label: "Assigned" },
    "In Progress": { variant: "info", label: "In Progress" },
    "Waiting": { variant: "neutral", label: "Waiting" },
    "Completed": { variant: "success", label: "Completed" },
    "Closed": { variant: "neutral", label: "Closed" },
    "Rejected": { variant: "danger", label: "Rejected" },
  };
  const cfg = map[status];
  return (
    <Badge variant={cfg.variant} className={cn("rounded-md px-2 py-0.5 font-medium", className)}>
      <span
        className={cn(
          "status-dot mr-1.5",
          status === "Completed" && "bg-emerald-500",
          status === "In Progress" && "bg-sky-500",
          status === "Under Review" && "bg-amber-500",
          status === "Approved" && "bg-violet-500",
          status === "Assigned" && "bg-violet-500",
          status === "New" && "bg-sky-500",
          status === "Waiting" && "bg-slate-400",
          status === "Closed" && "bg-slate-400",
          status === "Rejected" && "bg-rose-500",
        )}
      />
      {cfg.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const map: Record<Priority, { variant: any }> = {
    "Low": { variant: "neutral" },
    "Medium": { variant: "info" },
    "High": { variant: "warning" },
    "Critical": { variant: "danger" },
  };
  return (
    <Badge variant={map[priority].variant} className={cn("rounded-md px-2 py-0.5 font-medium", className)}>
      {priority}
    </Badge>
  );
}

export function ProgrammeBadge({ programme, className }: { programme: "Education" | "Livelihood" | "Health"; className?: string }) {
  const map: Record<string, { variant: any; dot: string }> = {
    Education: { variant: "info", dot: "bg-sky-500" },
    Livelihood: { variant: "success", dot: "bg-emerald-500" },
    Health: { variant: "purple", dot: "bg-violet-500" },
  };
  const cfg = map[programme];
  return (
    <Badge variant={cfg.variant} className={cn("rounded-md px-2 py-0.5 font-medium", className)}>
      <span className={cn("status-dot mr-1.5", cfg.dot)} />
      {programme}
    </Badge>
  );
}

export function DistrictBadge({ district, className }: { district: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 font-medium text-foreground", className)}>
      {district}
    </Badge>
  );
}
