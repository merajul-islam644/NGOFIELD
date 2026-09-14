import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger" | "ai" | "privacy";

const VARIANTS: Record<AlertVariant, { icon: React.ElementType; cls: string }> = {
  info: { icon: Info, cls: "border-sky-200 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/15 text-sky-900 dark:text-sky-200" },
  success: { icon: CheckCircle2, cls: "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200" },
  warning: { icon: AlertTriangle, cls: "border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200" },
  danger: { icon: AlertCircle, cls: "border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/15 text-rose-900 dark:text-rose-200" },
  ai: { icon: Sparkles, cls: "border-violet-200 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/15 text-violet-900 dark:text-violet-200" },
  privacy: { icon: ShieldAlert, cls: "border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/15 text-rose-900 dark:text-rose-200" },
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
}

export function Alert({ className, variant = "info", title, children, icon, ...props }: AlertProps) {
  const { icon: DefaultIcon, cls } = VARIANTS[variant];
  const Icon = icon ?? <DefaultIcon className="h-5 w-5" aria-hidden />;
  return (
    <div
      role="alert"
      className={cn("flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm", cls, className)}
      {...props}
    >
      <div className="flex-shrink-0 pt-0.5">{Icon}</div>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium leading-5">{title}</p> : null}
        <div className={cn("text-sm leading-5", title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}
