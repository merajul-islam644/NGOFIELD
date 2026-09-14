import type { Notification } from "@/types";

let store: Notification[] = [
  {
    id: "n-1",
    title: "Overdue follow-up · Chilmari",
    body: "School verification for Mohammad Sohag is 3 days overdue.",
    type: "warning",
    href: "/follow-ups",
    read: false,
    at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "n-2",
    title: "Potential duplicate assistance",
    body: "New case for Rekha Bibi flagged for coordinator review.",
    type: "danger",
    href: "/cases/CASE-2026-00921",
    read: false,
    at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "n-3",
    title: "Case requires review",
    body: "Mst. Sufia (Jamalpur) awaiting coordinator approval.",
    type: "info",
    href: "/cases/CASE-2026-00941",
    read: false,
    at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: "n-4",
    title: "Case reassigned",
    body: "Nazmul Haque transferred to Jahangir Alam for delivery.",
    type: "info",
    href: "/cases/CASE-2026-00923",
    read: true,
    at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const notificationService = {
  list() {
    return [...store].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  },
  unread() {
    return store.filter((n) => !n.read);
  },
  markRead(id: string) {
    store = store.map((n) => (n.id === id ? { ...n, read: true } : n));
  },
  markAllRead() {
    store = store.map((n) => ({ ...n, read: true }));
  },
  push(n: Omit<Notification, "id" | "at" | "read">) {
    store = [{ id: `n-${Date.now()}`, at: new Date().toISOString(), read: false, ...n }, ...store];
  },
};
