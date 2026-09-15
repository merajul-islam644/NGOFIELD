// Pure-function fallback that mirrors the original src/services/aiService.ts
// keyword matcher. Used by the server when ANTHROPIC_API_KEY is missing or the
// upstream call fails, AND by the frontend (when the API responds with
// `fallback: true`) so the demo runs without a key.
//
// Kept dependency-free (no imports) so it can be required from either a Node
// process (server/index.js) or a Vite-built browser bundle without changes.

const PROGRAMME_KEYWORDS = [
  {
    programme: "Education",
    patterns: [
      /\bstipend\b/i, /\bschool\b/i, /\bclass\s*\d+/i,
      /\bdrop\s*(out|3 mas|3 month)/i, /\bmeye\b/i, /\bchele\b/i,
      /\bschool sir\b/i, /\badmission\b/i, /\bcollege\b/i, /\btuition\b/i,
    ],
  },
  {
    programme: "Health",
    patterns: [
      /\bhealth\b/i, /\bdoctor\b/i, /\bmedicine\b/i, /\bpregnan/i,
      /\b(MAM|SAM)\b/i, /\bnutrition\b/i, /\bsick\b/i, /\btherapy\b/i, /\bvaccin/i,
    ],
  },
  {
    programme: "Livelihood",
    patterns: [
      /\bincome\b/i, /\b(nai|nil)\b/i, /\bVGD\b/i, /\bsewing\b/i,
      /\brickshaw\b/i, /\bpoultry\b/i, /\bgoat/i, /\benterprise\b/i,
      /\bkormo\b/i, /\bbusiness\b/i,
    ],
  },
];

const URGENT_TERMS = [/\b3 mas\b/i, /\bdrop\b/i, /\bincome nai\b/i, /\bswami na thaka\b/i, /\bVGD nai\b/i];

function detectProgramme(note) {
  let best = "Education", bestScore = 0;
  for (const { programme, patterns } of PROGRAMME_KEYWORDS) {
    const score = patterns.reduce((s, p) => s + (p.test(note) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = programme; }
  }
  return best;
}

function detectUrgency(note) {
  if (URGENT_TERMS.some((p) => p.test(note))) return "High";
  if (note.length < 80) return "Low";
  return "Medium";
}

function extractSummary(note, householdName, village) {
  if (householdName && village) {
    return `${householdName} from ${village} requires assistance — see structured context for primary need and household circumstances.`;
  }
  return `Field note captured during household visit. Programme need and urgency identified below.`;
}

function buildHouseholdContext(household, membersLine) {
  if (!household) return `Field note received — household profile to be verified on first follow-up visit. ${membersLine}`;
  const memberCount = Array.isArray(household.members) ? household.members.length : 0;
  const progs = household.activeProgrammes?.length ? household.activeProgrammes.join(", ") : "none";
  const loc = [household.union, household.village].filter(Boolean).join(", ") || "unspecified location";
  return `${memberCount}-member household in ${loc}. Previously supported programmes: ${progs}.`;
}

function buildDonorDraft(programme, householdName) {
  const name = householdName ?? "the household";
  if (programme === "Education") return `Provided education support to ${name}, restoring school continuity for one school-age child.`;
  if (programme === "Health") return `Provided health support to ${name}, addressing the identified health need through programme referral.`;
  return `Strengthened the household economy of ${name} through targeted livelihood assistance.`;
}

function getSuggestedActions(programme) {
  if (programme === "Education") return [
    "Verify school attendance and dropout record",
    "Confirm stipend eligibility against Education criteria",
    "Coordinate with headmaster for school certificate",
    "Document collection: birth certificate and household ledger",
  ];
  if (programme === "Health") return [
    "Refer to Upazila Health Complex if required",
    "Conduct nutrition or health screening",
    "Document symptoms and history",
    "Schedule follow-up visit within 14 days",
  ];
  return [
    "Verify livelihood skill and experience",
    "Coordinate with cooperative or programme partner",
    "Document household income and asset status",
    "Plan asset delivery timeline and monitoring",
  ];
}

function getDocumentsNeeded(programme) {
  if (programme === "Education") return ["School attendance certificate", "Household income declaration", "Beneficiary NID copy", "Birth certificate"];
  if (programme === "Health") return ["UHC referral slip", "Medical history", "Household income declaration", "Vulnerability assessment"];
  return ["Trade or skill certificate", "Cooperative enrolment form", "Land or asset record", "Income declaration"];
}

function detectDuplicateRisk(household, note, programme) {
  if (!household) return null;
  if (household.activeProgrammes?.includes(programme)) {
    return {
      level: "low",
      summary: `Household already enrolled in ${programme} programme.`,
      relatedProgramme: programme,
      detail: "Cross-check history to ensure complementary support and avoid overlap.",
    };
  }
  if (/VGD/i.test(note) && household.income !== undefined && household.income < 6000) {
    return {
      level: "low",
      summary: "Household income below safety-net threshold — verify no VGD overlap.",
      detail: "Field note references VGD card status. Confirm eligibility against safety-net registry to avoid duplicate registration.",
    };
  }
  return null;
}

/**
 * Mirror of the original `aiService.analyze()` shape.
 * @param {{note: string, household: any|null}} input
 * @returns {{draft: any, risk: any|null}}
 */
export function heuristicAnalyze({ note, household }) {
  const programme = detectProgramme(note);
  const urgency = detectUrgency(note);
  const summary = extractSummary(note, household?.name ?? null, household?.village ?? null);
  const membersLine =
    household && Array.isArray(household.members) && household.members.length > 0
      ? `Members: ${household.members
          .map((m) => `${m?.name ?? "?"} (${m?.relation ?? "?"}, ${m?.age ?? "?"})`)
          .join("; ")}.`
      : "";
  const householdContext = buildHouseholdContext(household, membersLine);
  const suggestedActions = getSuggestedActions(programme);
  const documentsNeeded = getDocumentsNeeded(programme);
  const donorReportDraft = buildDonorDraft(programme, household?.name ?? null);
  const risk = detectDuplicateRisk(household, note, programme);

  const draft = {
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
}

// Also expose as default for the frontend bundle (which imports as default).
export default { heuristicAnalyze };
