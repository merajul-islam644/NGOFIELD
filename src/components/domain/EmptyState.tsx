import { Inbox } from "lucide-react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-background px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
        {icon ?? <Inbox className="h-6 w-6 text-muted-foreground" />}
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
