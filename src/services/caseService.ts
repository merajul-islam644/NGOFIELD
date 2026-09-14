import { CASES, FOLLOWUPS } from "@/data/cases";
import { HOUSEHOLDS } from "@/data/households";
import { OFFICERS } from "@/data/officers";
import type { CaseRecord, CaseStatus, FollowUp, Priority } from "@/types";

let cases: CaseRecord[] = [...CASES];
let followUps: FollowUp[] = [...FOLLOWUPS];

// Simulate network latency
const wait = (ms = 240) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface CaseListFilters {
  search?: string;
  status?: CaseStatus | "All";
  priority?: Priority | "All";
  programme?: string;
  district?: string;
  officerId?: string;
  sortBy?: "updatedAt" | "priority" | "nextFollowUpAt" | "householdName";
  sortDir?: "asc" | "desc";
}

export const caseService = {
  async list(filters: CaseListFilters = {}) {
    await wait();
    let out = [...cases];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((c) =>
        [c.id, c.householdId, c.householdName, c.village, c.union, c.request, c.assignedOfficerName]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (filters.status && filters.status !== "All") {
      out = out.filter((c) => c.status === filters.status);
    }
    if (filters.priority && filters.priority !== "All") {
      out = out.filter((c) => c.priority === filters.priority);
    }
    if (filters.programme && filters.programme !== "All") {
      out = out.filter((c) => c.programme === filters.programme);
    }
    if (filters.district && filters.district !== "All") {
      out = out.filter((c) => c.district === filters.district);
    }
    if (filters.officerId && filters.officerId !== "All") {
      out = out.filter((c) => c.assignedOfficerId === filters.officerId);
    }

    const priorityWeight: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const sortBy = filters.sortBy ?? "updatedAt";
    const sortDir = filters.sortDir ?? "desc";
    out.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "priority") return dir * (priorityWeight[a.priority] - priorityWeight[b.priority]);
      if (sortBy === "householdName") return dir * a.householdName.localeCompare(b.householdName);
      const av = (a as any)[sortBy];
      const bv = (b as any)[sortBy];
      if (!av) return 1;
      if (!bv) return -1;
      return dir * (new Date(av).getTime() - new Date(bv).getTime());
    });

    return out;
  },

  async get(id: string) {
    await wait(160);
    return cases.find((c) => c.id === id) ?? null;
  },

  async getForHousehold(householdId: string) {
    await wait(140);
    return cases.filter((c) => c.householdId === householdId);
  },

  async create(input: Partial<CaseRecord>) {
    await wait(280);
    const id = `CASE-2026-${String(cases.length + 950).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const created: CaseRecord = {
      id,
      householdId: input.householdId ?? "",
      householdName: input.householdName ?? "",
      programme: input.programme ?? "Education",
      request: input.request ?? "",
      district: input.district ?? "Kurigram",
      union: input.union ?? "",
      village: input.village ?? "",
      assignedOfficerId: input.assignedOfficerId ?? "",
      assignedOfficerName: input.assignedOfficerName ?? "",
      priority: input.priority ?? "Medium",
      status: input.status ?? "New",
      need: input.need ?? "",
      summary: input.summary ?? "",
      householdContext: input.householdContext ?? "",
      urgency: input.urgency ?? input.priority ?? "Medium",
      suggestedActions: input.suggestedActions ?? [],
      documentsNeeded: input.documentsNeeded ?? [],
      donorReportDraft: input.donorReportDraft ?? "",
      aiDraft: input.aiDraft,
      followUps: [],
      timeline: [
        {
          id: `tl-${id}-1`,
          actor: input.createdBy ?? "System",
          actorRole: "field_officer",
          action: "Case created",
          description: input.aiDraft ? "AI draft received — pending coordinator review" : "Manual case creation",
          at: now,
        },
      ],
      documents: input.documents ?? [],
      stipendAmount: input.stipendAmount,
      createdBy: input.createdBy ?? "Unknown",
      createdAt: now,
      updatedAt: now,
    };
    cases = [created, ...cases];
    return created;
  },

  async update(id: string, patch: Partial<CaseRecord>) {
    await wait(180);
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Case ${id} not found`);
    const updated = { ...cases[idx], ...patch, updatedAt: new Date().toISOString() };
    cases = [...cases.slice(0, idx), updated, ...cases.slice(idx + 1)];
    return updated;
  },

  async appendTimeline(id: string, event: { actor: string; actorRole: any; action: string; description?: string }) {
    await wait(120);
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Case ${id} not found`);
    const eventFull = { id: `tl-${id}-${Date.now()}`, at: new Date().toISOString(), ...event };
    cases[idx].timeline = [...cases[idx].timeline, eventFull];
    cases[idx].updatedAt = eventFull.at;
    return eventFull;
  },

  async reassign(id: string, officerId: string, officerName: string, actor: string) {
    await wait(220);
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Case ${id} not found`);
    const prevOfficer = cases[idx].assignedOfficerName;
    cases[idx].assignedOfficerId = officerId;
    cases[idx].assignedOfficerName = officerName;
    cases[idx].timeline = [
      ...cases[idx].timeline,
      {
        id: `tl-${id}-${Date.now()}`,
        actor,
        actorRole: "programme_coordinator",
        action: "Case reassigned",
        description: `Reassigned from ${prevOfficer} to ${officerName}`,
        at: new Date().toISOString(),
      },
    ];
    cases[idx].updatedAt = new Date().toISOString();
    return cases[idx];
  },

  async setStatus(id: string, status: CaseStatus, actor: string, note?: string) {
    await wait(180);
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Case ${id} not found`);
    cases[idx].status = status;
    cases[idx].timeline = [
      ...cases[idx].timeline,
      {
        id: `tl-${id}-${Date.now()}`,
        actor,
        actorRole: "programme_coordinator",
        action: `Status → ${status}`,
        description: note,
        at: new Date().toISOString(),
      },
    ];
    cases[idx].updatedAt = new Date().toISOString();
    return cases[idx];
  },

  // Bulk reassignment for officer transfer
  async bulkReassign(fromOfficerId: string, toOfficerId: string, toOfficerName: string, actor: string) {
    await wait(320);
    let count = 0;
    cases = cases.map((c) => {
      if (c.assignedOfficerId === fromOfficerId) {
        count++;
        return {
          ...c,
          assignedOfficerId: toOfficerId,
          assignedOfficerName: toOfficerName,
          timeline: [
            ...c.timeline,
            {
              id: `tl-${c.id}-${Date.now()}`,
              actor,
              actorRole: "programme_coordinator" as const,
              action: "Officer transfer",
              description: `Reassigned via officer transfer (preserved history)`,
              at: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    // Also reassign followups
    followUps = followUps.map((f) => {
      if (f.assignedOfficerId === fromOfficerId && f.status !== "Completed") {
        return { ...f, assignedOfficerId: toOfficerId, assignedOfficerName: toOfficerName };
      }
      return f;
    });
    return count;
  },

  async getMetrics() {
    await wait(140);
    const byStatus = cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: cases.length,
      byStatus,
      active: cases.filter((c) => !["Closed", "Rejected", "Completed"].includes(c.status)).length,
      completed: cases.filter((c) => c.status === "Completed").length,
    };
  },

  // Returns the in-memory list for read-only access from other services
  snapshot() {
    return cases;
  },
};

export const followUpService = {
  async list(filters: {
    search?: string;
    district?: string;
    programme?: string;
    officerId?: string;
    status?: string;
  } = {}) {
    await wait(140);
    let out = [...followUps];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((f) =>
        [f.id, f.caseId, f.householdId, f.notes ?? "", f.assignedOfficerName, f.type]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (filters.district && filters.district !== "All") out = out.filter((f) => f.district === filters.district);
    if (filters.programme && filters.programme !== "All") out = out.filter((f) => f.programme === filters.programme);
    if (filters.officerId && filters.officerId !== "All") out = out.filter((f) => f.assignedOfficerId === filters.officerId);
    if (filters.status && filters.status !== "All") out = out.filter((f) => f.status === filters.status);
    return out.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },

  async getMetrics() {
    await wait(120);
    const now = Date.now();
    const overdue = followUps.filter((f) => f.status !== "Completed" && new Date(f.dueDate).getTime() < now);
    const dueToday = followUps.filter((f) => {
      if (f.status === "Completed") return false;
      const d = new Date(f.dueDate);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    });
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const dueThisWeek = followUps.filter((f) => {
      if (f.status === "Completed") return false;
      const d = new Date(f.dueDate);
      return d.getTime() >= now && d.getTime() <= weekFromNow.getTime();
    });
    const completed = followUps.filter((f) => f.status === "Completed");
    return { overdue, dueToday, dueThisWeek, completed, total: followUps.length };
  },

  async getOverdueByDistrict() {
    const metrics = await this.getMetrics();
    const map: Record<string, number> = {};
    metrics.overdue.forEach((f) => {
      map[f.district] = (map[f.district] ?? 0) + 1;
    });
    return map;
  },

  async create(input: Omit<FollowUp, "id" | "createdAt" | "status">) {
    await wait(180);
    const id = `fu-${Date.now()}`;
    const created: FollowUp = { ...input, id, status: "Scheduled", createdAt: new Date().toISOString() };
    followUps = [created, ...followUps];
    return created;
  },

  async complete(id: string) {
    await wait(160);
    const idx = followUps.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error(`Follow-up ${id} not found`);
    followUps[idx].status = "Completed";
    followUps[idx].completedAt = new Date().toISOString();
    return followUps[idx];
  },
};

export const householdService = {
  async list() {
    await wait();
    return HOUSEHOLDS;
  },
  async get(id: string) {
    await wait(140);
    return HOUSEHOLDS.find((h) => h.id === id) ?? null;
  },
  async getCases(householdId: string) {
    await wait(120);
    return cases.filter((c) => c.householdId === householdId);
  },
  async getFollowUps(householdId: string) {
    await wait(120);
    return followUps.filter((f) => f.householdId === householdId);
  },
};

export const officerService = {
  async list() {
    await wait(120);
    return OFFICERS;
  },
  async get(id: string) {
    await wait(100);
    return OFFICERS.find((o) => o.id === id) ?? null;
  },
  async activeCaseCount(officerId: string) {
    return cases.filter((c) => c.assignedOfficerId === officerId && !["Closed", "Rejected", "Completed"].includes(c.status)).length;
  },
  async transfer(officerId: string, toDistrict: any, actor: string) {
    await wait(360);
    const officer = OFFICERS.find((o) => o.id === officerId);
    if (!officer) throw new Error("Officer not found");
    const replacement = OFFICERS.find(
      (o) => o.district === officer.district && o.id !== officerId && o.status === "Active" && o.role === "field_officer",
    );
    officer.status = "Transferred";
    if (replacement) {
      const count = await caseService.bulkReassign(officerId, replacement.id, replacement.name, actor);
      return { transferredOfficer: officer, replacement, reassignedCases: count };
    }
    return { transferredOfficer: officer, replacement: null, reassignedCases: 0 };
  },
};

// Aggregations used across the app
export const reportService = {
  async districtSummary() {
    await wait(180);
    const map: Record<string, { activeHouseholds: number; openCases: number; overdue: number; monthlyCases: number }> = {};
    ["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"].forEach((d) => {
      map[d] = { activeHouseholds: 0, openCases: 0, overdue: 0, monthlyCases: 0 };
    });
    HOUSEHOLDS.forEach((h) => {
      const d = h.district;
      if (map[d]) map[d].activeHouseholds++;
    });
    cases.forEach((c) => {
      const d = c.district;
      if (!map[d]) return;
      if (c.status !== "Closed" && c.status !== "Rejected") map[d].openCases++;
      if (new Date(c.createdAt).getMonth() === new Date().getMonth()) map[d].monthlyCases++;
    });
    const overdueMetrics = await followUpService.getOverdueByDistrict();
    Object.entries(overdueMetrics).forEach(([d, n]) => {
      if (map[d]) map[d].overdue = n;
    });
    return map;
  },
  async programmeFunnel() {
    await wait(180);
    const programmes = ["Education", "Livelihood", "Health"] as const;
    return programmes.map((p) => {
      const subset = cases.filter((c) => c.programme === p);
      const requests = subset.length;
      const reviewed = subset.filter((c) => ["Under Review", "Approved", "Assigned", "In Progress", "Waiting", "Completed", "Closed"].includes(c.status)).length;
      const approved = subset.filter((c) => ["Approved", "Assigned", "In Progress", "Waiting", "Completed", "Closed"].includes(c.status)).length;
      const active = subset.filter((c) => ["Assigned", "In Progress", "Waiting"].includes(c.status)).length;
      const completed = subset.filter((c) => c.status === "Completed").length;
      const outcomes = subset.filter((c) => c.status === "Completed" || c.status === "Closed").length;
      return {
        programme: p,
        requests,
        reviewed,
        approved,
        active,
        completed,
        outcomes,
        funnel: [
          { label: "Requests", value: requests },
          { label: "Reviewed", value: reviewed },
          { label: "Approved", value: approved },
          { label: "Active", value: active },
          { label: "Completed", value: completed },
          { label: "Outcomes", value: outcomes },
        ],
      };
    });
  },
  async monthlyTrend() {
    await wait(160);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = months.map((m, i) => ({ month: m, opened: 0, completed: 0, education: 0, livelihood: 0, health: 0 }));
    cases.forEach((c) => {
      const d = new Date(c.createdAt);
      buckets[d.getMonth()].opened++;
      buckets[d.getMonth()][c.programme.toLowerCase() as "education" | "livelihood" | "health"]++;
      if (c.status === "Completed" || c.status === "Closed") {
        buckets[d.getMonth()].completed++;
      }
    });
    return buckets;
  },
  async donorAggregate() {
    await wait(180);
    const metrics = await followUpService.getMetrics();
    const householdsReached = HOUSEHOLDS.length;
    const casesOpened = cases.length;
    const casesCompleted = cases.filter((c) => c.status === "Completed" || c.status === "Closed").length;
    const successful = cases.filter((c) => c.status === "Completed").length;
    const followUpsCompleted = metrics.completed.length;
    return {
      householdsReached,
      casesOpened,
      casesCompleted,
      successfulOutcomes: successful,
      followUpsCompleted,
    };
  },
};
