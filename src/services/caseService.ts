// Data services for NGOField.
//
// Every collection is backed by a runtime Data Gateway schema in the SELISE
// Blocks tenant (see `data/schemas/*.json`). Reads and writes go through
// `src/services/blocksData.ts` which wraps the shared `blocksClient`.
//
// Page-level code keeps its existing shape: async services returning
// view-model types from `@/types`, in-memory mutations become SDK calls.

import { blocksClient } from "@/lib/blocks/client";
import { accessLogService } from "@/services/accessLogService";
import {
  casesCollection,
  caseDocumentsCollection,
  caseTimelineEventsCollection,
  decodeCase,
  decodeCaseDocument,
  decodeCaseTimelineEvent,
  decodeFollowUp,
  decodeHousehold,
  decodeHouseholdMember,
  encodeList,
  followUpsCollection,
  householdMembersCollection,
  householdsCollection,
  unwrapList,
  unwrapMutation,
} from "@/services/blocksData";
import type {
  CaseDocument,
  CaseRecord,
  CaseStatus,
  CaseTimelineEvent,
  District,
  FollowUp,
  Household,
  HouseholdMember,
  Officer,
  Priority,
  Programme,
  Role,
} from "@/types";

/** Stable id for cross-collection rows. SDK returns generated ItemId; this is the fallback. */
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}// One-time paged fetch; NGOField tenants stay small enough to fit in a single
// request. Increase if a tenant ever needs more than this.
const LIST_PAGE_SIZE = 200;

async function listHouseholdsRaw(pageSize: number = LIST_PAGE_SIZE): Promise<Household[]> {
  const res = await householdsCollection.list({ pageNo: 1, pageSize });
  const { items } = unwrapList<any>("Household", res);
  // Members are a separate schema; skip the join here — pages that need
  // members fetch them via `householdService.get(id)`.
  return items.map((row) => decodeHousehold(row));
}

async function listCasesRaw(pageSize: number = LIST_PAGE_SIZE): Promise<CaseRecord[]> {
  const [caseRes, timelineRes, docRes, fuRes] = await Promise.all([
    casesCollection.list({ pageNo: 1, pageSize }),
    caseTimelineEventsCollection.list({ pageNo: 1, pageSize }),
    caseDocumentsCollection.list({ pageNo: 1, pageSize }),
    followUpsCollection.list({ pageNo: 1, pageSize }),
  ]);

  const cases = unwrapList<any>("Case", caseRes).items;
  const tlRaw = unwrapList<any>("CaseTimelineEvent", timelineRes).items;
  const docRaw = unwrapList<any>("CaseDocument", docRes).items;
  const fuRaw = unwrapList<any>("FollowUp", fuRes).items;

  // Bucket related rows by their parent case id so the view-model exposes
  // a single composed record per case.
  const tlByCase = new Map<string, CaseTimelineEvent[]>();
  for (const raw of tlRaw) {
    if (!raw.caseId) continue;
    const list = tlByCase.get(raw.caseId) ?? [];
    list.push(decodeCaseTimelineEvent(raw));
    tlByCase.set(raw.caseId, list);
  }
  const docsByCase = new Map<string, CaseDocument[]>();
  for (const raw of docRaw) {
    if (!raw.caseId) continue;
    const list = docsByCase.get(raw.caseId) ?? [];
    list.push(decodeCaseDocument(raw));
    docsByCase.set(raw.caseId, list);
  }
  const fusByCase = new Map<string, FollowUp[]>();
  for (const raw of fuRaw) {
    if (!raw.caseId) continue;
    const list = fusByCase.get(raw.caseId) ?? [];
    list.push(decodeFollowUp(raw));
    fusByCase.set(raw.caseId, list);
  }

  return cases.map((row) =>
    decodeCase(
      row,
      tlByCase.get(row.ItemId) ?? [],
      docsByCase.get(row.ItemId) ?? [],
      fusByCase.get(row.ItemId) ?? [],
    ),
  );
}function filterCases(cases: CaseRecord[], filters: CaseListFilters): CaseRecord[] {
  let out = cases;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter((c) =>
      [c.id, c.householdId, c.householdName, c.village, c.union, c.request, c.assignedOfficerName]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (filters.status && filters.status !== "All") out = out.filter((c) => c.status === filters.status);
  if (filters.priority && filters.priority !== "All") out = out.filter((c) => c.priority === filters.priority);
  if (filters.programme && filters.programme !== "All") out = out.filter((c) => c.programme === filters.programme);
  if (filters.district && filters.district !== "All") out = out.filter((c) => c.district === filters.district);
  if (filters.officerId && filters.officerId !== "All") out = out.filter((c) => c.assignedOfficerId === filters.officerId);

  const sortBy = filters.sortBy ?? "updatedAt";
  const sortDir = filters.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;
  const priorityWeight: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  out = [...out].sort((a, b) => {
    if (sortBy === "priority") return dir * (priorityWeight[a.priority] - priorityWeight[b.priority]);
    if (sortBy === "householdName") return dir * a.householdName.localeCompare(b.householdName);
    const av = (a as any)[sortBy];
    const bv = (b as any)[sortBy];
    if (!av) return 1;
    if (!bv) return -1;
    return dir * (new Date(av).getTime() - new Date(bv).getTime());
  });
  return out;
}

// ─── caseService ─────────────────────────────────────────────────────────────

export interface CaseListFilters {
  search?: string;
  status?: CaseStatus | "All";
  priority?: Priority | "All";
  programme?: string;
  district?: string;
  officerId?: string;
  sortBy?: "updatedAt" | "priority" | "nextFollowUpAt" | "householdName";
  sortDir?: "asc" | "desc";
  /** Cap on rows fetched from the Data Gateway before client-side filtering. */
  pageSize?: number;
}

export const caseService = {
  async list(filters: CaseListFilters = {}): Promise<CaseRecord[]> {
    const all = await listCasesRaw(filters.pageSize);
    return filterCases(all, filters);
  },

  async get(id: string): Promise<CaseRecord | null> {
    const all = await listCasesRaw();
    return all.find((c) => c.id === id) ?? null;
  },

  async getForHousehold(householdId: string): Promise<CaseRecord[]> {
    const all = await listCasesRaw();
    return all.filter((c) => c.householdId === householdId);
  },

  async create(input: Partial<CaseRecord>): Promise<CaseRecord> {
    const payload = encodeCasePayload(input);
    const res = await casesCollection.create(payload);
    const result = unwrapMutation("Case", res);
    if (!result.acknowledged || !result.itemId) {
      throw new Error(result.message ?? "Failed to create case");
    }
    const created = await caseService.get(result.itemId);
    if (!created) throw new Error("Created case could not be loaded");
    return created;
  },

  async update(id: string, patch: Partial<CaseRecord>): Promise<CaseRecord> {
    const payload = encodeCasePayload(patch);
    const res = await casesCollection.update(id, payload);
    const result = unwrapMutation("Case", res);
    if (!result.acknowledged) {
      throw new Error(result.message ?? `Failed to update case ${id}`);
    }
    const updated = await caseService.get(id);
    if (!updated) throw new Error(`Case ${id} disappeared after update`);
    return updated;
  },

  async appendTimeline(
    id: string,
    event: { actor: string; actorRole: Role; action: string; description?: string },
  ): Promise<void> {
    await caseTimelineEventsCollection.create({
      caseId: id,
      actor: event.actor,
      actorRole: event.actorRole,
      action: event.action,
      description: event.description ?? "",
      timestamp: new Date().toISOString(),
    });
    // Touch the case to refresh LastUpdatedDate.
    await casesCollection.update(id, {});
  },

  /**
   * Populate CaseDocument rows from the AI-drafted `documentsNeeded` text list.
   * Idempotent — already-present documents (matched by name+caseId) are left alone.
   */
  async syncDocumentsFromDraft(
    id: string,
    actor: string,
  ): Promise<CaseDocument[]> {
    const all = await caseService.get(id);
    if (!all) throw new Error(`Case ${id} not found`);
    const existing = new Set(all.documents.map((d) => d.name.toLowerCase()));
    const additions = (all.documentsNeeded ?? []).filter(
      (n) => n && !existing.has(n.toLowerCase()),
    );
    for (const name of additions) {
      await caseDocumentsCollection.create({
        caseId: id,
        name,
        type: "other",
        required: true,
        collected: false,
      });
    }
    if (additions.length > 0) {
      await caseService.appendTimeline(id, {
        actor,
        actorRole: "field_officer",
        action: "Documents checklist generated",
        description: `${additions.length} document${additions.length === 1 ? "" : "s"} added from AI draft.`,
      });
    }
    const refreshed = await caseService.get(id);
    return refreshed?.documents ?? [];
  },

  async addDocument(
    caseId: string,
    doc: { name: string; type?: string; required?: boolean },
    actor: string,
  ): Promise<CaseDocument> {
    const res = await caseDocumentsCollection.create({
      caseId,
      name: doc.name,
      type: doc.type ?? "other",
      required: doc.required ?? true,
      collected: false,
    });
    const result = unwrapMutation("CaseDocument", res);
    if (!result.acknowledged || !result.itemId) {
      throw new Error(result.message ?? "Failed to add document");
    }
    await caseService.appendTimeline(caseId, {
      actor,
      actorRole: "field_officer",
      action: "Document added",
      description: doc.name,
    });
    return {
      id: result.itemId,
      name: doc.name,
      type: (doc.type ?? "other") as CaseDocument["type"],
      required: doc.required ?? true,
      collected: false,
    };
  },

  async toggleDocument(
    docId: string,
    collected: boolean,
    actor: string,
  ): Promise<void> {
    const res = await caseDocumentsCollection.update(docId, { collected });
    const result = unwrapMutation("CaseDocument", res);
    if (!result.acknowledged) {
      throw new Error(result.message ?? `Failed to update document ${docId}`);
    }
    // Best-effort: record on the case timeline. No caseId is exposed here, so we
    // look it up from the live row set; the typical flow keeps case open in UI.
    const allDocs = await caseService.snapshot().then(async () => {
      // Cheap path: search by scanning doc rows directly.
      const res2 = await caseDocumentsCollection.get(docId);
      const row = unwrapList<any>("CaseDocument", res2).items[0];
      return row?.caseId as string | undefined;
    });
    if (allDocs) {
      await caseService.appendTimeline(allDocs, {
        actor,
        actorRole: "field_officer",
        action: collected ? "Document collected" : "Document uncollected",
        description: docId,
      });
    }
  },

  async delete(id: string): Promise<void> {
    // Delete child rows first (documents, follow-ups, timeline) so they don't
    // dangle after the parent case is gone.
    const all = await caseService.get(id);
    if (!all) return;
    for (const doc of all.documents) {
      await caseDocumentsCollection.delete(doc.id);
    }
    for (const fu of all.followUps) {
      if (fu.status !== "Completed") {
        await followUpsCollection.delete(fu.id);
      }
    }
    for (const ev of all.timeline) {
      await caseTimelineEventsCollection.delete(ev.id);
    }
    const res = await casesCollection.delete(id);
    const result = unwrapMutation("Case", res);
    if (!result.acknowledged) {
      throw new Error(result.message ?? `Failed to delete case ${id}`);
    }
  },

  async reassign(
    id: string,
    officerId: string,
    officerName: string,
    actor: string,
  ): Promise<CaseRecord> {
    const updated = await caseService.update(id, {
      assignedOfficerId: officerId,
      assignedOfficerName: officerName,
    });
    await caseService.appendTimeline(id, {
      actor,
      actorRole: "programme_coordinator",
      action: "Case reassigned",
      description: `Reassigned to ${officerName}`,
    });
    return updated;
  },

  async setStatus(
    id: string,
    status: CaseStatus,
    actor: string,
    note?: string,
  ): Promise<CaseRecord> {
    const updated = await caseService.update(id, { status });
    await caseService.appendTimeline(id, {
      actor,
      actorRole: "programme_coordinator",
      action: `Status → ${status}`,
      description: note,
    });
    return updated;
  },

  async bulkReassign(
    fromOfficerId: string,
    toOfficerId: string,
    toOfficerName: string,
    actor: string,
  ): Promise<number> {
    const all = await listCasesRaw();
    const targets = all.filter((c) => c.assignedOfficerId === fromOfficerId);
    let count = 0;
    for (const c of targets) {
      await casesCollection.update(c.id, {
        assignedOfficerId: toOfficerId,
        assignedOfficerName: toOfficerName,
      });
      await caseTimelineEventsCollection.create({
        caseId: c.id,
        actor,
        actorRole: "programme_coordinator",
        action: "Officer transfer",
        description: `Reassigned via officer transfer (preserved history)`,
        timestamp: new Date().toISOString(),
      });
      count++;
    }
    // Reassign any open follow-ups too.
    const fus = await followUpService.listRaw();
    for (const f of fus) {
      if (f.assignedOfficerId !== fromOfficerId || f.status === "Completed") continue;
      await followUpsCollection.update(f.id, {
        assignedOfficerId: toOfficerId,
        assignedOfficerName: toOfficerName,
      });
    }
    return count;
  },

  async getMetrics() {
    const cases = await listCasesRaw();
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

  /** Read-only view for sibling services (snapshot() in the old in-memory API). */
  async snapshot(): Promise<CaseRecord[]> {
    return listCasesRaw();
  },
};

// ─── followUpService ─────────────────────────────────────────────────────────

export const followUpService = {
  async list(
    filters: {
      search?: string;
      district?: string;
      programme?: string;
      officerId?: string;
      status?: string;
    } = {},
  ): Promise<FollowUp[]> {
    const all = await followUpService.listRaw();
    return filterFollowUps(all, filters);
  },

  async listRaw(): Promise<FollowUp[]> {
    const res = await followUpsCollection.list({ pageNo: 1, pageSize: LIST_PAGE_SIZE });
    return unwrapList<any>("FollowUp", res).items.map(decodeFollowUp);
  },

  async getMetrics() {
    const all = await followUpService.listRaw();
    const now = Date.now();
    const overdue = all.filter((f) => f.status !== "Completed" && new Date(f.dueDate).getTime() < now);
    const dueToday = all.filter((f) => {
      if (f.status === "Completed") return false;
      const d = new Date(f.dueDate);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    });
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const dueThisWeek = all.filter((f) => {
      if (f.status === "Completed") return false;
      const d = new Date(f.dueDate);
      return d.getTime() >= now && d.getTime() <= weekFromNow.getTime();
    });
    const completed = all.filter((f) => f.status === "Completed");
    return { overdue, dueToday, dueThisWeek, completed, total: all.length };
  },

  async getOverdueByDistrict() {
    const metrics = await followUpService.getMetrics();
    const map: Record<string, number> = {};
    metrics.overdue.forEach((f) => {
      map[f.district] = (map[f.district] ?? 0) + 1;
    });
    return map;
  },

  async create(input: Omit<FollowUp, "id" | "createdAt" | "status">): Promise<FollowUp> {
    const res = await followUpsCollection.create({
      caseId: input.caseId,
      householdId: input.householdId ?? "",
      type: input.type,
      dueDate: input.dueDate,
      status: "Scheduled",
      assignedOfficerId: input.assignedOfficerId,
      assignedOfficerName: input.assignedOfficerName,
      notes: input.notes ?? "",
      priority: input.priority,
      district: input.district,
      programme: input.programme,
    });
    const result = unwrapMutation("FollowUp", res);
    if (!result.acknowledged || !result.itemId) {
      throw new Error(result.message ?? "Failed to create follow-up");
    }
    return {
      ...input,
      id: result.itemId,
      status: "Scheduled",
      createdAt: new Date().toISOString(),
    };
  },

  async complete(id: string): Promise<FollowUp> {
    const res = await followUpsCollection.update(id, {
      status: "Completed",
      completedAt: new Date().toISOString(),
    });
    const result = unwrapMutation("FollowUp", res);
    if (!result.acknowledged) {
      throw new Error(result.message ?? "Failed to complete follow-up");
    }
    const all = await followUpService.listRaw();
    const updated = all.find((f) => f.id === id);
    if (!updated) throw new Error("Follow-up not found after update");
    return updated;
  },

  async delete(id: string): Promise<void> {
    const res = await followUpsCollection.delete(id);
    const result = unwrapMutation("FollowUp", res);
    if (!result.acknowledged) {
      throw new Error(result.message ?? `Failed to delete follow-up ${id}`);
    }
  },
};

function filterFollowUps(
  items: FollowUp[],
  filters: {
    search?: string;
    district?: string;
    programme?: string;
    officerId?: string;
    status?: string;
  },
): FollowUp[] {
  let out = [...items];
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
}

// ─── householdService ────────────────────────────────────────────────────────

export const householdService = {
  async list(opts: { pageSize?: number } = {}): Promise<Household[]> {
    return listHouseholdsRaw(opts.pageSize);
  },

  async get(id: string): Promise<Household | null> {
    const res = await householdsCollection.get(id);
    const items = unwrapList<any>("Household", res).items;
    const row = items[0];
    if (!row) return null;
    const membersRes = await householdMembersCollection.list({
      pageNo: 1,
      pageSize: LIST_PAGE_SIZE,
    });
    const members = unwrapList<any>("HouseholdMember", membersRes).items
      .filter((m: any) => m.householdId === id)
      .map(decodeHouseholdMember);
    return decodeHousehold(row, members);
  },

  async create(input: {
    name: string;
    district: District;
    union: string;
    village: string;
    phone?: string;
    assignedOfficerId?: string;
    assignedArea?: string;
    povertyScore?: number;
    income?: number;
    vulnerability?: string;
    healthNotes?: string;
    activeProgrammes?: Programme[];
    members?: Array<Omit<HouseholdMember, never>>;
  }): Promise<Household> {
    if (!input.name?.trim()) throw new Error("Household name is required");
    const res = await householdsCollection.create({
      name: input.name.trim(),
      district: input.district,
      union: input.union ?? "",
      village: input.village ?? "",
      phone: input.phone ?? "",
      assignedOfficerId: input.assignedOfficerId ?? "",
      assignedArea: input.assignedArea ?? "",
      activeProgrammes: encodeList(input.activeProgrammes ?? []),
      povertyScore: input.povertyScore,
      income: input.income,
      vulnerability: input.vulnerability ?? "",
      healthNotes: input.healthNotes ?? "",
    });
    const result = unwrapMutation("Household", res);
    if (!result.acknowledged || !result.itemId) {
      throw new Error(result.message ?? "Failed to create household");
    }
    const id = result.itemId;
    for (const m of input.members ?? []) {
      await householdMembersCollection.create({
        householdId: id,
        name: m.name,
        relation: m.relation ?? "",
        age: m.age,
        notes: m.notes ?? "",
      });
    }
    const created = await householdService.get(id);
    if (!created) throw new Error("Household created but could not be reloaded");
    return created;
  },

  async update(
    id: string,
    patch: Partial<{
      name: string;
      district: District;
      union: string;
      village: string;
      phone: string;
      assignedOfficerId: string;
      assignedArea: string;
      povertyScore: number;
      income: number;
      vulnerability: string;
      healthNotes: string;
      activeProgrammes: Programme[];
    }>,
  ): Promise<Household> {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.district !== undefined) payload.district = patch.district;
    if (patch.union !== undefined) payload.union = patch.union;
    if (patch.village !== undefined) payload.village = patch.village;
    if (patch.phone !== undefined) payload.phone = patch.phone;
    if (patch.assignedOfficerId !== undefined)
      payload.assignedOfficerId = patch.assignedOfficerId;
    if (patch.assignedArea !== undefined) payload.assignedArea = patch.assignedArea;
    if (patch.povertyScore !== undefined) payload.povertyScore = patch.povertyScore;
    if (patch.income !== undefined) payload.income = patch.income;
    if (patch.vulnerability !== undefined) payload.vulnerability = patch.vulnerability;
    if (patch.healthNotes !== undefined) payload.healthNotes = patch.healthNotes;
    if (patch.activeProgrammes !== undefined)
      payload.activeProgrammes = encodeList(patch.activeProgrammes);

    const res = await householdsCollection.update(id, payload);
    const result = unwrapMutation("Household", res);
    if (!result.acknowledged) {
      throw new Error(result.message ?? `Failed to update household ${id}`);
    }
    const updated = await householdService.get(id);
    if (!updated) throw new Error(`Household ${id} disappeared after update`);
    return updated;
  },

  async addMember(
    householdId: string,
    member: { name: string; relation?: string; age?: number; notes?: string },
  ): Promise<HouseholdMember> {
    const res = await householdMembersCollection.create({
      householdId,
      name: member.name,
      relation: member.relation ?? "",
      age: member.age,
      notes: member.notes ?? "",
    });
    const result = unwrapMutation("HouseholdMember", res);
    if (!result.acknowledged || !result.itemId) {
      throw new Error(result.message ?? "Failed to add household member");
    }
    return {
      name: member.name,
      relation: member.relation ?? "",
      age: member.age ?? 0,
      notes: member.notes,
    };
  },

  async removeMember(memberId: string): Promise<void> {
    const res = await householdMembersCollection.delete(memberId);
    const result = unwrapMutation("HouseholdMember", res);
    if (!result.acknowledged) {
      throw new Error(result.message ?? `Failed to remove member ${memberId}`);
    }
  },

  async getCases(householdId: string): Promise<CaseRecord[]> {
    return caseService.getForHousehold(householdId);
  },

  async getFollowUps(householdId: string): Promise<FollowUp[]> {
    const all = await followUpService.listRaw();
    return all.filter((f) => f.householdId === householdId);
  },
};

// ─── officerService (derived from IAM + case aggregations) ───────────────────

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-purple-600",
  "from-lime-500 to-emerald-600",
  "from-orange-500 to-red-600",
  "from-violet-500 to-fuchsia-600",
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function inferRole(roles: unknown): Role {
  if (typeof roles === "string") {
    if (roles.includes("regional_manager")) return "regional_manager";
    if (roles.includes("programme_coordinator")) return "programme_coordinator";
  }
  if (roles && typeof roles === "object") {
    // IAM returns `roles: { default: [...] }`. Walk both shapes.
    for (const v of Object.values(roles as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        if (v.includes("regional_manager")) return "regional_manager";
        if (v.includes("programme_coordinator")) return "programme_coordinator";
      }
    }
  }
  return "field_officer";
}

async function listOfficers(): Promise<Officer[]> {
  // Fetch IAM users and case assignments in parallel, then derive Officer fields.
  const [iamRes, cases] = await Promise.all([
    blocksClient.iam.users.list({ pageNo: 1, pageSize: LIST_PAGE_SIZE }),
    listCasesRaw(),
  ]);

  // IAM users.list returns either { data: { items: [...] } } or { data: [...] }.
  const iamAny = iamRes as any;
  const users: any[] = Array.isArray(iamAny?.data)
    ? iamAny.data
    : Array.isArray(iamAny?.data?.items)
      ? iamAny.data.items
      : [];

  // Aggregate cases per officer id.
  const byOfficer = new Map<
    string,
    { districts: Set<District>; programmes: Set<Programme>; unions: Set<string>; activeCases: number; totalCases: number }
  >();
  for (const c of cases) {
    if (!c.assignedOfficerId) continue;
    const e =
      byOfficer.get(c.assignedOfficerId) ?? {
        districts: new Set<District>(),
        programmes: new Set<Programme>(),
        unions: new Set<string>(),
        activeCases: 0,
        totalCases: 0,
      };
    e.districts.add(c.district);
    e.programmes.add(c.programme);
    if (c.union) e.unions.add(c.union);
    e.totalCases++;
    if (!["Closed", "Rejected", "Completed"].includes(c.status)) e.activeCases++;
    byOfficer.set(c.assignedOfficerId, e);
  }

  const officers: Officer[] = [];
  for (const u of users) {
    const id = u.itemId ?? u.id ?? u.userId ?? "";
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "Unknown";
    const stats = byOfficer.get(id);
    const districts = stats ? Array.from(stats.districts) : [];
    const programmes = stats ? Array.from(stats.programmes) : [];
    officers.push({
      id,
      name,
      initials: initialsFromName(name),
      email: u.email ?? "",
      phone: u.phoneNumber ?? "",
      role: inferRole(u.roles),
      district: districts[0] ?? "Kurigram",
      programmes,
      assignedUnions: stats ? Array.from(stats.unions) : [],
      activeCases: stats?.activeCases ?? 0,
      status: u.active === false || u.status === 0 ? "On Leave" : "Active",
      joinedAt: u.createdDate ?? new Date().toISOString(),
      avatarColor: avatarColor(id || name),
    });
  }

  // Officers referenced in cases but not yet present in IAM are surfaced too —
  // this matters when a tenant is mid-bootstrap.
  for (const [officerId, stats] of byOfficer.entries()) {
    if (officers.some((o) => o.id === officerId)) continue;
    const districts = Array.from(stats.districts);
    officers.push({
      id: officerId,
      name: officerId,
      initials: initialsFromName(officerId),
      email: "",
      phone: "",
      role: "field_officer",
      district: districts[0] ?? "Kurigram",
      programmes: Array.from(stats.programmes),
      assignedUnions: Array.from(stats.unions),
      activeCases: stats.activeCases,
      status: "Active",
      joinedAt: new Date().toISOString(),
      avatarColor: avatarColor(officerId),
    });
  }

  return officers;
}

export const officerService = {
  async list(): Promise<Officer[]> {
    return listOfficers();
  },

  async get(id: string): Promise<Officer | null> {
    const all = await listOfficers();
    return all.find((o) => o.id === id) ?? null;
  },

  async activeCaseCount(officerId: string): Promise<number> {
    const cases = await listCasesRaw();
    return cases.filter(
      (c) =>
        c.assignedOfficerId === officerId && !["Closed", "Rejected", "Completed"].includes(c.status),
    ).length;
  },

  async transfer(
    officerId: string,
    _toDistrict: string,
    actor: string,
    actorRole: Role,
  ): Promise<{ transferredOfficer: Officer; replacement: Officer | null; reassignedCases: number }> {
    const officers = await listOfficers();
    const transferred = officers.find((o) => o.id === officerId);
    if (!transferred) throw new Error("Officer not found");
    const replacement =
      officers.find(
        (o) => o.id !== officerId && o.status === "Active" && o.role === "field_officer",
      ) ?? null;
    let reassignedCases = 0;
    if (replacement) {
      reassignedCases = await caseService.bulkReassign(
        officerId,
        replacement.id,
        replacement.name,
        actor,
      );
    }
    // Mark the transferred officer inactive in IAM.
    try {
      await blocksClient.iam.users.update(officerId, { active: false });
    } catch {
      // IAM update is best-effort; bulk reassignment is the user-visible outcome.
    }
    // Audit trail: officer transfer is a privileged action and must be
    // visible in the AccessLog. Per Requirement #7, every privileged
    // mutation records who, what, and the resource affected.
    await accessLogService.log({
      user: actor,
      userRole: actorRole,
      action: "Officer transfer",
      resource: `officer:${transferred.id} → district:${_toDistrict} (replacement:${replacement?.id ?? "none"}, reassignedCases:${reassignedCases})`,
      reason: "Officer transfer preserves case history; replacement absorbs active caseload.",
    });
    return {
      transferredOfficer: { ...transferred, status: "Transferred" },
      replacement,
      reassignedCases,
    };
  },
};

// ─── reportService (cross-collection aggregations) ────────────────────────────

export const reportService = {
  async districtSummary() {
    const [households, cases, overdueMap] = await Promise.all([
      householdService.list(),
      listCasesRaw(),
      followUpService.getOverdueByDistrict(),
    ]);
    const districts: District[] = ["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"];
    const map: Record<string, { activeHouseholds: number; openCases: number; overdue: number; monthlyCases: number }> = {};
    for (const d of districts) {
      map[d] = { activeHouseholds: 0, openCases: 0, overdue: 0, monthlyCases: 0 };
    }
    for (const h of households) {
      if (map[h.district]) map[h.district].activeHouseholds++;
    }
    const month = new Date().getMonth();
    for (const c of cases) {
      if (!map[c.district]) continue;
      if (c.status !== "Closed" && c.status !== "Rejected") map[c.district].openCases++;
      if (new Date(c.createdAt).getMonth() === month) map[c.district].monthlyCases++;
    }
    for (const [d, n] of Object.entries(overdueMap)) {
      if (map[d]) map[d].overdue = n;
    }
    return map;
  },

  async programmeFunnel() {
    const cases = await listCasesRaw();
    const programmes: Programme[] = ["Education", "Livelihood", "Health"];
    return programmes.map((p) => {
      const subset = cases.filter((c) => c.programme === p);
      const requests = subset.length;
      const reviewed = subset.filter((c) =>
        ["Under Review", "Approved", "Assigned", "In Progress", "Waiting", "Completed", "Closed"].includes(c.status),
      ).length;
      const approved = subset.filter((c) =>
        ["Approved", "Assigned", "In Progress", "Waiting", "Completed", "Closed"].includes(c.status),
      ).length;
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
    const cases = await listCasesRaw();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = months.map((m, i) => ({
      month: m,
      opened: 0,
      completed: 0,
      education: 0,
      livelihood: 0,
      health: 0,
    }));
    for (const c of cases) {
      const d = new Date(c.createdAt);
      const bucket = buckets[d.getMonth()];
      if (!bucket) continue;
      bucket.opened++;
      const progKey = c.programme.toLowerCase() as "education" | "livelihood" | "health";
      if (progKey in bucket) (bucket as any)[progKey]++;
      if (c.status === "Completed" || c.status === "Closed") bucket.completed++;
    }
    return buckets;
  },

  async donorAggregate() {
    const [cases, households, fuMetrics] = await Promise.all([
      listCasesRaw(),
      householdService.list(),
      followUpService.getMetrics(),
    ]);
    return {
      householdsReached: households.length,
      casesOpened: cases.length,
      casesCompleted: cases.filter((c) => c.status === "Completed" || c.status === "Closed").length,
      successfulOutcomes: cases.filter((c) => c.status === "Completed").length,
      followUpsCompleted: fuMetrics.completed.length,
    };
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function encodeCasePayload(input: Partial<CaseRecord>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.householdId !== undefined) payload.householdId = input.householdId;
  if (input.householdName !== undefined) payload.householdName = input.householdName;
  if (input.programme !== undefined) payload.programme = input.programme;
  if (input.request !== undefined) payload.request = input.request;
  if (input.district !== undefined) payload.district = input.district;
  if (input.union !== undefined) payload.union = input.union;
  if (input.village !== undefined) payload.village = input.village;
  if (input.assignedOfficerId !== undefined) payload.assignedOfficerId = input.assignedOfficerId;
  if (input.assignedOfficerName !== undefined) payload.assignedOfficerName = input.assignedOfficerName;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.status !== undefined) payload.status = input.status;
  if (input.need !== undefined) payload.need = input.need;
  if (input.summary !== undefined) payload.summary = input.summary;
  if (input.householdContext !== undefined) payload.householdContext = input.householdContext;
  if (input.urgency !== undefined) payload.urgency = input.urgency;
  if (input.suggestedActions !== undefined) payload.suggestedActions = encodeList(input.suggestedActions);
  if (input.documentsNeeded !== undefined) payload.documentsNeeded = encodeList(input.documentsNeeded);
  if (input.donorReportDraft !== undefined) payload.donorReportDraft = input.donorReportDraft;
  if (input.stipendAmount !== undefined) payload.stipendAmount = input.stipendAmount;
  if (input.createdBy !== undefined) payload.createdBy = input.createdBy;
  if (input.nextFollowUpAt !== undefined) payload.nextFollowUpAt = input.nextFollowUpAt;
  if (input.reviewNotes !== undefined) payload.reviewNotes = input.reviewNotes;
  return payload;
}
