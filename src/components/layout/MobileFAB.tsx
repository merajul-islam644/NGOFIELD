import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, X, FileText, Mic, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  if (location.pathname === "/cases/new") return null;

  return (
    <div className="fixed bottom-6 right-4 z-40 md:hidden">
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm animate-in fade-in"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="relative">
        {open && (
          <div className="absolute bottom-16 right-0 z-40 flex w-56 flex-col gap-2 rounded-xl border bg-card p-2 shadow-lg animate-in slide-in-from-bottom-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/cases/new");
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <span>
                New case
                <span className="block text-[11px] font-normal text-muted-foreground">AI-assisted intake</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-violet-500/10 text-violet-600">
                <Mic className="h-4 w-4" />
              </span>
              <span>
                Voice note
                <span className="block text-[11px] font-normal text-muted-foreground">Capture field note</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/10 text-emerald-600">
                <MapPin className="h-4 w-4" />
              </span>
              <span>
                Visit log
                <span className="block text-[11px] font-normal text-muted-foreground">Record household visit</span>
              </span>
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close new case menu" : "Open new case menu"}
          aria-expanded={open}
          className={cn(
            "grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform",
            open && "rotate-45",
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
