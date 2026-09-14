import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { cn, uniqueId } from "@/lib/utils";

export type ToastVariant = "success" | "info" | "warning" | "danger";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  danger: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = uniqueId("toast");
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => remove(id), 4200);
  }, [remove]);

  const value: ToastContextValue = {
    toast,
    success: (title, description) => toast({ title, description, variant: "success" }),
    info: (title, description) => toast({ title, description, variant: "info" }),
    warning: (title, description) => toast({ title, description, variant: "warning" }),
    danger: (title, description) => toast({ title, description, variant: "danger" }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex w-full max-w-sm flex-col gap-2">
        {items.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    // noop (timeout handled in provider)
  }, []);
  const Icon =
    toast.variant === "success"
      ? CheckCircle2
      : toast.variant === "warning"
        ? AlertTriangle
        : toast.variant === "danger"
          ? XCircle
          : Info;
  const colorClass =
    toast.variant === "success"
      ? "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
      : toast.variant === "warning"
        ? "border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200"
        : toast.variant === "danger"
          ? "border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/15 text-rose-900 dark:text-rose-200"
          : "border-sky-200 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/15 text-sky-900 dark:text-sky-200";
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2",
        colorClass,
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1 rounded p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
