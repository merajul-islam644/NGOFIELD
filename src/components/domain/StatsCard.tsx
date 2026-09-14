import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success" | "info" | "purple";
  change?: string;
}

const TONE: Record<NonNullable<StatsCardProps["tone"]>, string> = {
  default: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
  success: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  info: "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
  purple: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export function StatsCard({ label, value, icon: Icon, href, hint, tone = "default", change }: StatsCardProps) {
  const inner = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          </div>
          <span className={cn("grid h-9 w-9 place-items-center rounded-lg", TONE[tone])}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{hint ?? ""}</span>
          {change && <span className="font-medium text-foreground">{change}</span>}
        </div>
        {href && (
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
            View all <ArrowRight className="h-3 w-3" aria-hidden />
          </div>
        )}
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <Link to={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
        {inner}
      </Link>
    );
  }
  return inner;
}
