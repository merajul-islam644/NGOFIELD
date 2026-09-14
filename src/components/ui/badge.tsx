import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
        warning: "border-transparent bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300",
        danger: "border-transparent bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300",
        info: "border-transparent bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300",
        purple: "border-transparent bg-violet-100 dark:bg-violet-500/15 text-violet-800 dark:text-violet-300",
        neutral: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
