export type District = "Kurigram" | "Gaibandha" | "Jamalpur" | "Cox's Bazar";
export type Programme = "Education" | "Livelihood" | "Health";

export type Role = "field_officer" | "programme_coordinator" | "regional_manager";

export type CaseStatus =
  | "New"
  | "Under Review"
  | "Approved"
  | "Assigned"
  | "In Progress"
  | "Waiting"
  | "Completed"
  | "Closed"
  | "Rejected";

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type FollowUpType =
  | "Phone call"
  | "Household visit"
  | "School verification"
  | "Document collection"
  | "Programme review"
  | "Outcome verification";

export type FollowUpStatus = "Scheduled" | "In Progress" | "Completed" | "Overdue" | "Cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  district?: District;
  programmes?: Programme[];
  assignedAreas?: string[];
}

export interface Officer {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  role: Role;
  district: District;
  programmes: Programme[];
  assignedUnions: string[];
  activeCases: number;
  status: "Active" | "On Leave" | "Transferred";
  joinedAt: string;
  avatarColor: string;
}

export interface HouseholdMember {
  name: string;
  relation: string;
  age: number;
  notes?: string;
}

export interface Household {
  id: string;
  name: string;
  district: District;
  union: string;
  village: string;
  phone: string;
  members: HouseholdMember[];
  assignedArea: string;
  assignedOfficerId: string;
  activeProgrammes: Programme[];
  povertyScore?: number;
  income?: number;
  vulnerability?: string;
  healthNotes?: string;
  createdAt: string;
}

export interface CaseDocument {
  id: string;
  name: string;
  type: "stipend_proof" | "id_card" | "income_certificate" | "school_certificate" | "medical_record" | "other";
  required: boolean;
  collected: boolean;
}

export interface CaseTimelineEvent {
  id: string;
  actor: string;
  actorRole: Role;
  action: string;
  description?: string;
  at: string;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  resource: string;
  reason?: string;
  at: string;
}

export interface DuplicateRisk {
  level: "low" | "medium" | "high";
  summary: string;
  relatedCaseId?: string;
  relatedProgramme?: Programme;
  monthsAgo?: number;
  detail?: string;
}

export interface AIDraft {
  summary: string;
  need: Programme;
  householdContext: string;
  urgency: Priority;
  suggestedActions: string[];
  documentsNeeded: string[];
  donorReportDraft: string;
  duplicateRisk?: DuplicateRisk;
  proposedStipend?: number;
}

export interface CaseRecord {
  id: string;
  householdId: string;
  householdName: string;
  programme: Programme;
  request: string;
  district: District;
  union: string;
  village: string;
  assignedOfficerId: string;
  assignedOfficerName: string;
  priority: Priority;
  status: CaseStatus;
  need: string;
  summary: string;
  householdContext: string;
  urgency: Priority;
  suggestedActions: string[];
  documentsNeeded: string[];
  donorReportDraft: string;
  aiDraft?: AIDraft;
  followUps: FollowUp[];
  timeline: CaseTimelineEvent[];
  documents: CaseDocument[];
  stipendAmount?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  nextFollowUpAt?: string;
  reviewNotes?: string;
}

export interface FollowUp {
  id: string;
  caseId: string;
  householdId: string;
  type: FollowUpType;
  dueDate: string;
  status: FollowUpStatus;
  assignedOfficerId: string;
  assignedOfficerName: string;
  notes?: string;
  priority: Priority;
  district: District;
  programme: Programme;
  createdAt: string;
  completedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "warning" | "info" | "success" | "danger";
  href?: string;
  read: boolean;
  at: string;
}

export interface AccessLog {
  id: string;
  user: string;
  userRole: Role;
  action: string;
  resource: string;
  reason?: string;
  at: string;
}

export interface FunnelStep {
  label: string;
  value: number;
}

export interface ProgrammeMetrics {
  programme: Programme;
  requests: number;
  reviewed: number;
  approved: number;
  active: number;
  completed: number;
  outcomes: number;
  funnel: FunnelStep[];
}
