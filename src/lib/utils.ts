import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | Date, opts?: { withTime?: boolean; relative?: boolean }): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";

  if (opts?.relative) {
    return formatRelative(d);
  }

  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (opts?.withTime) {
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return `${date} · ${time}`;
  }
  return date;
}

export function formatRelative(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < minute) return rtf.format(Math.round(diff / 1000), "second");
  if (abs < hour) return rtf.format(Math.round(diff / minute), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), "day");
  return formatDate(d);
}

export function daysBetween(a: Date | string, b: Date | string = new Date()) {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  return Math.round((da.getTime() - db.getTime()) / (24 * 60 * 60 * 1000));
}

export function isOverdue(due: string | Date) {
  const d = typeof due === "string" ? new Date(due) : due;
  return d.getTime() < Date.now();
}

export function isDueToday(due: string | Date) {
  const d = typeof due === "string" ? new Date(due) : due;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function currency(n: number, code: string = "BDT") {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(n);
}

export function pluralize(n: number, singular: string, plural?: string) {
  return `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`;
}

export function uniqueId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
