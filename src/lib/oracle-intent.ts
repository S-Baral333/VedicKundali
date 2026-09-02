// Silent intent detection — keeps the edge function contract intact
// while removing category/mode pickers from the UI.

export type OracleCategory = "career" | "relationships" | "finance" | "health" | "spiritual" | "general";
export type OracleMode = "insight" | "prediction" | "guidance";

const CATEGORY_BUCKETS: Array<[OracleCategory, string[]]> = [
  ["career",        ["job", "work", "career", "business", "promotion", "boss", "office", "startup", "company", "interview"]],
  ["relationships", ["marry", "marriage", "love", "partner", "husband", "wife", "relationship", "breakup", " ex ", "crush", "boyfriend", "girlfriend", "spouse"]],
  ["finance",       ["money", "finance", "wealth", "debt", "salary", "invest", "loan", "rich", "poor", "income", "stocks", "property"]],
  ["health",        ["health", "sick", "illness", "disease", "body", "anxiety", "depression", "sleep", "energy levels", "pain"]],
  ["spiritual",     ["karma", "dharma", "purpose", "soul", "god", "meditation", "spiritual", "moksha", "enlighten"]],
];

const PREDICTION_TRIGGERS = ["will ", "when ", "going to", "future", "soon", "this year", "next year", "next month", "by when", "ever "];
const GUIDANCE_TRIGGERS  = ["should i", "what should", "advice", "help me", "how do i", "how should", "what to do", "what do i do", "guide me"];

export function detectIntent(question: string): { category: OracleCategory; mode: OracleMode } {
  const q = ` ${question.toLowerCase()} `;

  let category: OracleCategory = "general";
  for (const [cat, keywords] of CATEGORY_BUCKETS) {
    if (keywords.some((k) => q.includes(k))) { category = cat; break; }
  }

  let mode: OracleMode = "insight";
  if (GUIDANCE_TRIGGERS.some((t) => q.includes(t))) mode = "guidance";
  else if (PREDICTION_TRIGGERS.some((t) => q.includes(t))) mode = "prediction";

  return { category, mode };
}
