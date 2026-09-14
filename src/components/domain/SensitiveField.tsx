import { Lock, ShieldAlert } from "lucide-react";
import { useAuth } from "@/services/authService";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

interface SensitiveFieldProps {
  children: React.ReactNode;
  /** Which roles are authorized to view this content. Default: programme_coordinator + regional_manager */
  authorizedRoles?: Role[];
  className?: string;
  /** Compact mode for inline use */
  inline?: boolean;
}

export function SensitiveField({ children, authorizedRoles, className, inline }: SensitiveFieldProps) {
  const { user } = useAuth();
  if (!user) return null;
  const allowed = authorizedRoles ?? ["programme_coordinator", "regional_manager"];
  const canView = allowed.includes(user.role);

  if (canView) {
    return <div className={cn(inline && "inline-flex items-center gap-1.5", className)}>{children}</div>;
  }

  if (inline) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded border border-dashed border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300",
          className,
        )}
      >
        <Lock className="h-3 w-3" aria-hidden />
        Restricted
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-lg border border-dashed border-rose-300 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-200",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">Sensitive information — Restricted</p>
          <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300">
            Access to poverty score, household income, health notes and vulnerability assessments is limited to authorized programme staff.
          </p>
        </div>
      </div>
    </div>
  );
}
