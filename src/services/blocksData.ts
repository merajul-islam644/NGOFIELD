// Typed wrappers around blocksClient.data.collection() for each NGOField schema.
// Each schema corresponds to a single GraphQL collection in the runtime Data Gateway.
// Schemas are defined in the SELISE Blocks tenant and live in
// `data/schemas/*.json` (created earlier from the gap-list bootstrap).

import { blocksClient } from "@/lib/blocks/client";

export interface BlocksListResponse<T> {
  items: T[];
  totalCount: number;
}

export interface BlocksMutationResult {
  acknowledged: boolean;
  itemId?: string;
  message?: string;
  totalImpactedData?: number;
}

type AnyRecord = Record<string, unknown>;

/**
 * Pull items + totalCount out of the GraphQL wrapper the SDK returns.
 * The collection helper calls `get{SchemaName}s`, so for `Household` we expect
 * `data.getHouseholds` to hold the paged result.
 */
export function unwrapList<T = AnyRecord>(
  schemaName: string,
  response: unknown,
): BlocksListResponse<T> {
  const fallback: BlocksListResponse<T> = { items: [], totalCount: 0 };
  if (!response || typeof response !== "object") return fallback;
  const r = response as AnyRecord;
  const data = r.data as AnyRecord | undefined;
  if (!data) return fallback;

  // Pluralized GraphQL field: `getHouseholds`, `getCases`, etc.
  // `getCompanys` is what the docs warn about — never trust an English plural.
  const collection = `${schemaName}s`;
  const container = (data[`get${collection}`] ?? data[`get${schemaName}s`]) as
    | AnyRecord
    | undefined;
  if (container && Array.isArray(container.items)) {
    return {
      items: container.items as T[],
      totalCount: typeof container.totalCount === "number" ? container.totalCount : (container.items as unknown[]).length,
    };
  }

  // Some responses already unwrap items/totalCount to top-level `data`.
  if (Array.isArray(data.items)) {
    return {
      items: data.items as T[],
      totalCount: typeof data.totalCount === "number" ? data.totalCount : (data.items as unknown[]).length,
    };
  }

  return fallback;
}

export function unwrapMutation(
  schemaName: string,
  response: unknown,
): BlocksMutationResult {
  if (!response || typeof response !== "object") {
    return { acknowledged: false, message: "Empty response" };
  }
  const data = (response as AnyRecord).data as AnyRecord | undefined;
  if (!data) return { acknowledged: false, message: "No data in response" };
  // Mutations are singular: insertHousehold, updateCase, deleteFollowUp…
  for (const verb of ["insert", "update", "delete"]) {
    const key = `${verb}${schemaName}`;
    const result = data[key] as BlocksMutationResult | undefined;
    if (result) return result;
  }
  return { acknowledged: false, message: "Unknown mutation response shape" };
}

/**
 * Pass-through helper for list<string> fields. The runtime stores these as
 * native `String[]` arrays (schema type `String, isArray: true`), so no
 * encoding is required — we just normalize undefined/null/strings into an
 * array of strings.
 */
export function encodeList(values: readonly unknown[] | undefined | null): string[] {
  if (!values) return [];
  return values
    .map((v) => (typeof v === "string" ? v : v == null ? "" : String(v)))
    .filter((v) => v.length > 0);
}

/** Read back either a String[] (runtime native) or a JSON string (legacy/migration). */
export function decodeList<T = string>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// ─── Schema row shapes (raw, as returned by the runtime) ────────────────────

export interface HouseholdRow extends AnyRecord {
  ItemId: string;
  name?: string;
  district?: string;
  union?: string;
  village?: string;
  phone?: string;
  assignedOfficerId?: string;
  assignedArea?: string;
  activeProgrammes?: string[]; // schema: String, isArray=true
  povertyScore?: number;
  income?: number;
  vulnerability?: string;
  healthNotes?: string;
  CreatedDate?: string;
  LastUpdatedDate?: string;
}

export interface HouseholdMemberRow extends AnyRecord {
  ItemId: string;
  householdId: string;
  name: string;
  relation?: string;
  age?: number;
  notes?: string;
}

export interface CaseRow extends AnyRecord {
  ItemId: string;
  householdId: string;
  householdName?: string;
  programme?: string;
  request?: string;
  district?: string;
  union?: string;
  village?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  priority?: string;
  status?: string;
  need?: string;
  summary?: string;
  householdContext?: string;
  urgency?: string;
  suggestedActions?: string[]; // schema: String, isArray=true
  documentsNeeded?: string[]; // schema: String, isArray=true
  donorReportDraft?: string;
  stipendAmount?: number;
  createdBy?: string;
  nextFollowUpAt?: string;
  reviewNotes?: string;
  CreatedDate?: string;
  LastUpdatedDate?: string;
}

export interface FollowUpRow extends AnyRecord {
  ItemId: string;
  caseId: string;
  householdId?: string;
  type?: string;
  dueDate?: string;
  status?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  notes?: string;
  priority?: string;
  district?: string;
  programme?: string;
  completedAt?: string;
  CreatedDate?: string;
}

export interface CaseDocumentRow extends AnyRecord {
  ItemId: string;
  caseId: string;
  name?: string;
  type?: string;
  required?: boolean;
  collected?: boolean;
}

export interface CaseTimelineEventRow extends AnyRecord {
  ItemId: string;
  caseId: string;
  actor?: string;
  actorRole?: string;
  action?: string;
  description?: string;
  timestamp?: string;
  CreatedDate?: string;
}

export interface AccessLogRow extends AnyRecord {
  ItemId: string;
  user?: string;
  userRole?: string;
  action?: string;
  resource?: string;
  reason?: string;
  timestamp?: string;
  CreatedDate?: string;
}

// ─── Typed collection helpers ────────────────────────────────────────────────
// Field lists are intentionally compact — only what the app needs to render.
// Add fields here as new screens require them; do not request everything by default.

export const householdsCollection = blocksClient.data.collection<HouseholdRow>(
  "Household",
  {
    fields: [
      "name",
      "district",
      "union",
      "village",
      "phone",
      "assignedOfficerId",
      "assignedArea",
      "activeProgrammes",
      "povertyScore",
      "income",
      "vulnerability",
      "healthNotes",
    ],
  },
);

export const householdMembersCollection =
  blocksClient.data.collection<HouseholdMemberRow>("HouseholdMember", {
    fields: ["householdId", "name", "relation", "age", "notes"],
  });

export const casesCollection = blocksClient.data.collection<CaseRow>("Case", {
  fields: [
    "householdId",
    "householdName",
    "programme",
    "request",
    "district",
    "union",
    "village",
    "assignedOfficerId",
    "assignedOfficerName",
    "priority",
    "status",
    "need",
    "summary",
    "householdContext",
    "urgency",
    "suggestedActions",
    "documentsNeeded",
    "donorReportDraft",
    "stipendAmount",
    "createdBy",
    "nextFollowUpAt",
    "reviewNotes",
  ],
});

export const followUpsCollection = blocksClient.data.collection<FollowUpRow>(
  "FollowUp",
  {
    fields: [
      "caseId",
      "householdId",
      "type",
      "dueDate",
      "status",
      "assignedOfficerId",
      "assignedOfficerName",
      "notes",
      "priority",
      "district",
      "programme",
      "completedAt",
    ],
  },
);

export const caseDocumentsCollection =
  blocksClient.data.collection<CaseDocumentRow>("CaseDocument", {
    fields: ["caseId", "name", "type", "required", "collected"],
  });

export const caseTimelineEventsCollection =
  blocksClient.data.collection<CaseTimelineEventRow>("CaseTimelineEvent", {
    fields: ["caseId", "actor", "actorRole", "action", "description", "timestamp"],
  });

export const accessLogsCollection =
  blocksClient.data.collection<AccessLogRow>("AccessLog", {
    fields: ["user", "userRole", "action", "resource", "reason", "timestamp"],
  });

// ─── Decoders (raw row → view-model shape used by the UI) ────────────────────

import type {
  CaseDocument,
  CaseRecord,
  CaseTimelineEvent,
  District,
  FollowUp,
  FollowUpStatus,
  FollowUpType,
  Household,
  HouseholdMember,
  Priority,
  Programme,
} from "@/types";

export function decodeHousehold(row: HouseholdRow, members: HouseholdMember[] = []): Household {
  const programmes = decodeList<Programme>(row.activeProgrammes);
  return {
    id: row.ItemId,
    name: asString(row.name, "Unnamed household"),
    district: (row.district ?? "Kurigram") as District,
    union: asString(row.union),
    village: asString(row.village),
    phone: asString(row.phone),
    members,
    assignedArea: asString(row.assignedArea),
    assignedOfficerId: asString(row.assignedOfficerId),
    activeProgrammes: programmes,
    povertyScore: asNumber(row.povertyScore),
    income: asNumber(row.income),
    vulnerability: row.vulnerability as string | undefined,
    healthNotes: row.healthNotes as string | undefined,
    createdAt: row.CreatedDate ?? new Date().toISOString(),
  };
}

export function decodeHouseholdMember(row: HouseholdMemberRow): HouseholdMember {
  return {
    name: asString(row.name, "Unnamed"),
    relation: asString(row.relation),
    age: asNumber(row.age) ?? 0,
    notes: row.notes as string | undefined,
  };
}

export function decodeCase(
  row: CaseRow,
  timeline: CaseTimelineEvent[] = [],
  documents: CaseDocument[] = [],
  followUps: FollowUp[] = [],
): CaseRecord {
  return {
    id: row.ItemId,
    householdId: asString(row.householdId),
    householdName: asString(row.householdName, "Unknown household"),
    programme: (row.programme ?? "Education") as Programme,
    request: asString(row.request),
    district: (row.district ?? "Kurigram") as District,
    union: asString(row.union),
    village: asString(row.village),
    assignedOfficerId: asString(row.assignedOfficerId),
    assignedOfficerName: asString(row.assignedOfficerName),
    priority: (row.priority ?? "Medium") as Priority,
    status: (row.status ?? "New") as CaseRecord["status"],
    need: asString(row.need),
    summary: asString(row.summary),
    householdContext: asString(row.householdContext),
    urgency: (row.urgency ?? row.priority ?? "Medium") as Priority,
    suggestedActions: decodeList<string>(row.suggestedActions),
    documentsNeeded: decodeList<string>(row.documentsNeeded),
    donorReportDraft: asString(row.donorReportDraft),
    followUps,
    timeline,
    documents,
    stipendAmount: asNumber(row.stipendAmount),
    createdBy: asString(row.createdBy, "Unknown"),
    createdAt: row.CreatedDate ?? new Date().toISOString(),
    updatedAt: row.LastUpdatedDate ?? row.CreatedDate ?? new Date().toISOString(),
    nextFollowUpAt: row.nextFollowUpAt as string | undefined,
    reviewNotes: row.reviewNotes as string | undefined,
  };
}

export function decodeFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.ItemId,
    caseId: asString(row.caseId),
    householdId: asString(row.householdId),
    type: (row.type ?? "Household visit") as FollowUpType,
    dueDate: row.dueDate ?? new Date().toISOString(),
    status: (row.status ?? "Scheduled") as FollowUpStatus,
    assignedOfficerId: asString(row.assignedOfficerId),
    assignedOfficerName: asString(row.assignedOfficerName),
    notes: row.notes as string | undefined,
    priority: (row.priority ?? "Medium") as Priority,
    district: (row.district ?? "Kurigram") as District,
    programme: (row.programme ?? "Education") as Programme,
    createdAt: row.CreatedDate ?? new Date().toISOString(),
    completedAt: row.completedAt as string | undefined,
  };
}

export function decodeCaseDocument(row: CaseDocumentRow): CaseDocument {
  return {
    id: row.ItemId,
    name: asString(row.name, "Unnamed document"),
    type: (row.type ?? "other") as CaseDocument["type"],
    required: Boolean(row.required),
    collected: Boolean(row.collected),
  };
}

export function decodeCaseTimelineEvent(row: CaseTimelineEventRow): CaseTimelineEvent {
  return {
    id: row.ItemId,
    actor: asString(row.actor, "System"),
    actorRole: (row.actorRole ?? "field_officer") as CaseTimelineEvent["actorRole"],
    action: asString(row.action, "Updated"),
    description: row.description as string | undefined,
    at: row.timestamp ?? row.CreatedDate ?? new Date().toISOString(),
  };
}
