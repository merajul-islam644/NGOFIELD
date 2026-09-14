import { HOUSEHOLDS } from "@/data/households";
import type { AIDraft, DuplicateRisk, Priority, Programme } from "@/types";

export interface AnalyzeInput {
  note: string;
  householdId: string;
}

export interface AnalyzeProgress {
  step: number;
  label: string;
  status: "active" | "complete";
}

export interface AnalyzeResult {
  draft: AIDraft;
  risk: DuplicateRisk | null;
}

const PROGRAMME_KEYWORDS: { programme: Programme; patterns: RegExp[] }[] = [
  {
    programme: "Education",
    patterns: [
      /\bstipend\b/i,
      /\bschool\b/i,
      /\bclass\s*\d+/i,
      /\bdrop\s*(out|3 mas|3 month)/i,
      /\bmeye\b/i,
      /\bchele\b/i,
      /\bschool sir\b/i,
      /\badmission\b/i,
      /\bcollege\b/i,
      /\btuition\b/i,
    ],
  },
  {
    programme: "Health",
    patterns: [
      /\bhealth\b/i,
      /\bdoctor\b/i,
      /\bmedicine\b/i,
      /\bpregnan/i,
      /\b(MAM|SAM)\b/i,
      /\bnutrition\b/i,
      /\bsick\b/i,
      /\btherapy\b/i,
      /\bvaccin/i,
    ],
  },
  {
    programme: "Livelihood",
    patterns: [
      /\bincome\b/i,
      /\b(nai|nil)\b/i,
      /\bVGD\b/i,
      /\bsewing\b/i,
      /\brickshaw\b/i,
      /\bpoultry\b/i,
      /\bgoat/i,
      /\benterprise\b/i,
      /\bkormo\b/i,
      /\bbusiness\b/i,
    ],
  },
];

const URGENT_TERMS = [/\b3 mas\b/i, /\bdrop\b/i, /\bincome nai\b/i, /\bswami na thaka\b/i, /\bVGD nai\b/i];

function detectProgramme(note: string): Programme {
  const lower = note;
  let best: Programme = "Education";
  let bestScore = 0;
  for (const { programme, patterns } of PROGRAMME_KEYWORDS) {
    const score = patterns.reduce((s, p) => s + (p.test(lower) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = programme;
    }
  }
  return best;
}

function detectUrgency(note: string): Priority {
  if (URGENT_TERMS.some((p) => p.test(note))) return "High";
  if (note.length < 80) return "Low";
  return "Medium";
}

function extractSummary(note: string, household: string | null, village: string | null): string {
  if (household && village) {
    return `${household} from ${village} requires assistance — see structured context for primary need and household circumstances.`;
  }
  return `Field note captured during household visit. Programme need and urgency identified below.`;
}

function buildHouseholdContext(household: ReturnType<typeof HOUSEHOLDS.find> | undefined, membersLine: string) {
  if (!household) return `Field note received — household profile to be verified on first follow-up visit. ${membersLine}`;
  return `${household.members.length}-member household in ${household.union}, ${household.village}. Previously supported programmes: ${household.activeProgrammes.length ? household.activeProgrammes.join(", ") : "none"}.`;
}

function buildDonorDraft(programme: Programme, household: string | null) {
  const name = household ?? "the household";
  switch (programme) {
    case "Education":
      return `Provided education support to ${name}, restoring school continuity for one school-age child.`;
    case "Health":
      return `Provided health support to ${name}, addressing the identified health need through programme referral.`;
    case "Livelihood":
      return `Strengthened the household economy of ${name} through targeted livelihood assistance.`;
  }
}

function getSuggestedActions(programme: Programme): string[] {
  switch (programme) {
    case "Education":
      return [
        "Verify school attendance and dropout record",
        "Confirm stipend eligibility against Education criteria",
        "Coordinate with headmaster for school certificate",
        "Document collection: birth certificate and household ledger",
      ];
    case "Health":
      return [
        "Refer to Upazila Health Complex if required",
        "Conduct nutrition or health screening",
        "Document symptoms and history",
        "Schedule follow-up visit within 14 days",
      ];
    case "Livelihood":
      return [
        "Verify livelihood skill and experience",
        "Coordinate with cooperative or programme partner",
        "Document household income and asset status",
        "Plan asset delivery timeline and monitoring",
      ];
  }
}

function getDocumentsNeeded(programme: Programme): string[] {
  switch (programme) {
    case "Education":
      return ["School attendance certificate", "Household income declaration", "Beneficiary NID copy", "Birth certificate"];
    case "Health":
      return ["UHC referral slip", "Medical history", "Household income declaration", "Vulnerability assessment"];
    case "Livelihood":
      return ["Trade or skill certificate", "Cooperative enrolment form", "Land or asset record", "Income declaration"];
  }
}

function detectDuplicateRisk(
  householdId: string,
  note: string,
  programme: Programme,
): DuplicateRisk | null {
  const household = HOUSEHOLDS.find((h) => h.id === householdId);
  if (!household) return null;
  // Critical demo: Rekha Bibi + Health history → always flag for Education
  if (householdId === "HH-KUR-00821" && programme === "Education") {
    return {
      level: "medium",
      summary:
        "This household received a Health programme intervention approximately four months earlier (May 2026).",
      relatedCaseId: "CASE-2026-00488",
      relatedProgramme: "Health",
      monthsAgo: 4,
      detail:
        "Prior case CASE-2026-00488 (Health referral — child nutrition) was completed after two consecutive healthy screenings. The household is known to the programme, which supports eligibility but should be flagged for coordinator review to avoid double-counting of household-level assistance.",
    };
  }
  // Generic detection: any active programmes in household + matching need
  if (household.activeProgrammes.includes(programme)) {
    return {
      level: "low",
      summary: `Household already enrolled in ${programme} programme.`,
      relatedCaseId: undefined,
      relatedProgramme: programme,
      detail: "Cross-check history to ensure complementary support and avoid overlap.",
    };
  }
  // Banglish: "VGD card nai" suggests previously considered for safety net
  if (/VGD/i.test(note) && household.income && household.income < 6000) {
    return {
      level: "low",
      summary: "Household income below safety-net threshold — verify no VGD overlap.",
      detail: "Field note references VGD card status. Confirm eligibility against safety-net registry to avoid duplicate registration.",
    };
  }
  return null;
}

export const aiService = {
  /** Streaming-style progress callback. */
  async *analyzeStream(input: AnalyzeInput): AsyncGenerator<AnalyzeProgress, AnalyzeResult, void> {
    const steps = [
      "Extracting household context",
      "Identifying programme need",
      "Assessing urgency",
      "Reviewing household history",
      "Checking duplicate-assistance risk",
    ];
    for (let i = 0; i < steps.length; i++) {
      yield { step: i, label: steps[i], status: "active" };
      await new Promise((r) => setTimeout(r, 380));
      yield { step: i, label: steps[i], status: "complete" };
    }
    const result = await this.analyze(input);
    return result;
  },

  async analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
    const household = HOUSEHOLDS.find((h) => h.id === input.householdId);
    const programme = detectProgramme(input.note);
    const urgency = detectUrgency(input.note);
    const summary = extractSummary(input.note, household?.name ?? null, household?.village ?? null);
    const membersLine = household
      ? `Members: ${household.members.map((m) => `${m.name} (${m.relation}, ${m.age})`).join("; ")}.`
      : "";
    const householdContext = buildHouseholdContext(household, membersLine);
    const suggestedActions = getSuggestedActions(programme);
    const documentsNeeded = getDocumentsNeeded(programme);
    const donorReportDraft = buildDonorDraft(programme, household?.name ?? null);
    const risk = detectDuplicateRisk(input.householdId, input.note, programme);

    const draft: AIDraft = {
      summary,
      need: programme,
      householdContext,
      urgency,
      suggestedActions,
      documentsNeeded,
      donorReportDraft,
      duplicateRisk: risk ?? undefined,
      proposedStipend: programme === "Education" ? 1200 : programme === "Health" ? 800 : 5000,
    };

    return { draft, risk };
  },
};
