import type { AccessLog, Role } from "@/types";

let logs: AccessLog[] = [
  {
    id: "log-1",
    user: "Sumaiya Rashid",
    userRole: "programme_coordinator",
    action: "Edited AI draft",
    resource: "CASE-2026-00921",
    at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: "log-2",
    user: "Sumaiya Rashid",
    userRole: "programme_coordinator",
    action: "Approved case",
    resource: "CASE-2026-00922",
    at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: "log-3",
    user: "Kabir Hossain",
    userRole: "regional_manager",
    action: "Exported donor report",
    resource: "Aggregate · September 2026",
    reason: "Quarterly donor submission",
    at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: "log-4",
    user: "Rahim Ahmed",
    userRole: "field_officer",
    action: "Created case",
    resource: "CASE-2026-00921",
    at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const accessLogService = {
  list() {
    return [...logs].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  },
  log(entry: { user: string; userRole: Role; action: string; resource: string; reason?: string }) {
    logs = [{ id: `log-${Date.now()}`, at: new Date().toISOString(), ...entry }, ...logs];
    return logs[0];
  },
};
