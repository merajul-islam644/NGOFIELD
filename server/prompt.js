// Builds the Anthropic Messages API request from a field note + household +
// prior-cases context. Pure function so it's trivially testable.
//
// We use Anthropic's "tool use" with a forced `tool_choice` to guarantee the
// response is a single structured object matching AIDraft — no JSON parsing
// brittleness, no streaming-to-shape concerns.

const TOOL_NAME = "draft_case";

const TOOL = {
  name: TOOL_NAME,
  description:
    "Emit a structured draft of an NGOField case record from a field officer's Banglish shorthand note. " +
    "Also flag duplicate-assistance risk by cross-checking the household's prior case history.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "2-3 sentence plain-English case summary suitable for a coordinator's first read.",
      },
      need: {
        type: "string",
        enum: ["Education", "Livelihood", "Health"],
        description: "Primary programme need inferred from the note.",
      },
      householdContext: {
        type: "string",
        description: "One paragraph describing household circumstances relevant to the need.",
      },
      urgency: {
        type: "string",
        enum: ["Low", "Medium", "High", "Critical"],
        description: "How quickly a coordinator should act.",
      },
      suggestedActions: {
        type: "array",
        items: { type: "string" },
        description: "3-5 concrete follow-up actions for the field officer.",
      },
      documentsNeeded: {
        type: "array",
        items: { type: "string" },
        description: "3-5 documents the coordinator should request from the household.",
      },
      donorReportDraft: {
        type: "string",
        description: "ONE anonymised sentence suitable for a donor aggregate report.",
      },
      proposedStipend: {
        type: "number",
        description: "Suggested stipend in BDT (Education: ~1200, Health: ~800, Livelihood: ~5000).",
      },
      duplicateRisk: {
        type: "object",
        description: "Only present if a duplicate-assistance risk is detected; else null.",
        properties: {
          level: { type: "string", enum: ["low", "medium", "high"] },
          summary: { type: "string" },
          detail: { type: "string" },
          relatedCaseId: { type: "string" },
          relatedProgramme: { type: "string", enum: ["Education", "Livelihood", "Health"] },
          monthsAgo: { type: "number" },
        },
        required: ["level", "summary"],
      },
    },
    required: [
      "summary",
      "need",
      "householdContext",
      "urgency",
      "suggestedActions",
      "documentsNeeded",
      "donorReportDraft",
    ],
  },
};

const SYSTEM_PROMPT = `You are an assistant for NGO field officers in Kurigram, Gaibandha, Jamalpur, and Cox's Bazar districts of Bangladesh.
You turn their Banglish shorthand notes (mixed Bangla-English) into structured case drafts for a Programme Coordinator to review and approve.

Programmes available: Education, Livelihood, Health.
- Education: school stipends, dropout re-enrolment, supplies.
- Livelihood: income grants, asset transfers (sewing machines, rickshaws), VGD cards.
- Health: medical referrals, nutrition monitoring (MAM/SAM), therapy.

Strict rules:
1. Respond ONLY by calling the \`${TOOL_NAME}\` tool. Do not write prose outside the tool call.
2. Summary must be 2-3 plain-English sentences — no Bangla transliteration.
3. Urgency: Critical = child welfare / life-threatening, High = dropout or income loss within weeks, Medium = standard 30-day window, Low = advisory.
4. Donor-report draft MUST be one anonymised sentence (no household names, no village names, no individual identifiers) — aggregate-friendly phrasing.
5. Duplicate-risk detection (CRITICAL — this is what your cross-check is for):
   - If a prior case exists for the SAME programme within the last 12 months, OR a prior stipend amount is within ±20% of what you propose → level='high', include relatedCaseId + relatedProgramme + monthsAgo + a detail sentence explaining the overlap.
   - If a prior case exists for a DIFFERENT programme on the same household within 12 months (e.g. a Health referral 4 months ago while this request is Education) → level='medium', complementary-overlap warning.
   - If only an old (>=12 months) prior case exists, or no overlap → return null for duplicateRisk.
6. Never invent IDs, dates, or amounts that aren't in the inputs. If a number is missing, omit the field.`;

function formatHousehold(household) {
  if (!household) return "(no household selected — to be verified on first visit)";
  const lines = [
    `Name: ${household.name}`,
    `ID: ${household.id}`,
    `Location: ${household.village}, ${household.union}, ${household.district}`,
    `Members: ${household.members?.length ?? 0}`,
  ];
  if (household.members?.length) {
    lines.push(`  - ${household.members.map((m) => `${m.name} (${m.relation}, ${m.age}${m.notes ? ` — ${m.notes}` : ""})`).join("\n  - ")}`);
  }
  if (household.activeProgrammes?.length) {
    lines.push(`Active programmes on file: ${household.activeProgrammes.join(", ")}`);
  }
  return lines.join("\n");
}

function formatPriorCases(priorCases) {
  if (!priorCases?.length) return "(no prior cases for this household)";
  return priorCases.map((c) => {
    const date = c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : "?";
    const stipend = c.stipendAmount != null ? `, BDT ${c.stipendAmount}` : "";
    return `- ${c.id} | ${date} | ${c.programme} | status=${c.status}${stipend}`;
  }).join("\n");
}

/**
 * Build the messages + tools payload for `client.messages.create()`.
 * @param {{note: string, household: any|null, priorCases: any[]}} input
 * @returns {{system: string, tools: any[], tool_choice: any, messages: any[]}}
 */
export function buildMessages({ note, household, priorCases }) {
  const userContent = [
    "Field officer's note (Banglish shorthand — translate as needed):",
    "<<<",
    note,
    ">>>",
    "",
    "Household on file:",
    formatHousehold(household),
    "",
    "Prior case history for this household (cross-check against this for duplicate-assistance risk):",
    formatPriorCases(priorCases),
  ].join("\n");

  return {
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: userContent }],
  };
}

export { TOOL as DRAFT_CASE_TOOL, TOOL_NAME };
