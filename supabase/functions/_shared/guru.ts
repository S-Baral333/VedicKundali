// Rishi Guru protocol — shared across all AI edge functions.
// Pulls active prompt layers + persona laws from DB and stitches them into
// a system prompt + writing rules block. Use `resolveGuruContext` from any
// feature function: if the user toggled `rishi_guru_enabled`, prepend
// `systemBlock` to your system prompt so every reading speaks in the same
// canonical Rishi Guru voice.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Layer { layer_key: string; title: string; content: string; }
interface Rule  { roman_numeral: string; title: string; body: string; sort_order: number; }

export interface GuruBundle { layers: Layer[]; rules: Rule[]; fetchedAt: number; }

let cached: GuruBundle | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function loadGuruBundle(adminClient: ReturnType<typeof createClient>): Promise<GuruBundle> {
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached;
  const [{ data: layers }, { data: rules }] = await Promise.all([
    adminClient.from("ai_prompt_layers")
      .select("layer_key,title,content")
      .eq("status", "published"),
    adminClient.from("ai_persona_rules")
      .select("roman_numeral,title,body,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);
  cached = {
    layers: (layers as Layer[]) || [],
    rules: (rules as Rule[]) || [],
    fetchedAt: Date.now(),
  };
  return cached;
}

function pick(layers: Layer[], key: string): string {
  return layers.find(l => l.layer_key === key)?.content?.trim() || "";
}

export function assembleGuruSystemPrompt(
  layers: Layer[],
  rules: Rule[],
  periodNote = "",
): string {
  const identity   = pick(layers, "identity");
  const knowledge  = pick(layers, "knowledge");
  const voice      = pick(layers, "voice");
  const emotional  = pick(layers, "emotional");
  const structure  = pick(layers, "structure");
  const forbidden  = pick(layers, "forbidden");

  const lawsBlock = rules.length
    ? "THE TWELVE LAWS OF THE GURU (binding):\n" + rules
        .map(r => `${r.roman_numeral}. ${r.title} — ${r.body}`)
        .join("\n")
    : "";

  return [
    "═══ RISHI GURU PROTOCOL ENGAGED ═══",
    "",
    identity   && `[I · IDENTITY]\n${identity}`,
    knowledge  && `[II · KNOWLEDGE]\n${knowledge}`,
    voice      && `[III · VOICE]\n${voice}`,
    emotional  && `[V · EMOTIONAL]\n${emotional}`,
    structure  && `[VI · STRUCTURE]\n${structure}`,
    forbidden  && `[VII · FORBIDDEN]\n${forbidden}`,
    "",
    lawsBlock,
    "",
    "ENGINE NOTE: A citation-grade chart summary is provided in the user prompt when available. Cite from it directly — do not invent positions, dashas, or yogas. When you reference classical sources, do so honestly (e.g. \"BPHS Ch. 47\", \"Phaladeepika 7.12\"); never fabricate citations.",
    periodNote && "",
    periodNote && `OUTPUT: Return ONLY valid JSON, no markdown wrapping. Always include a "cosmic_headline" field as the first key. ${periodNote}`,
  ].filter(Boolean).join("\n");
}

export function assembleGuruWritingRules(layers: Layer[]): string {
  const voice     = pick(layers, "voice");
  const structure = pick(layers, "structure");
  const emotional = pick(layers, "emotional");

  return `
WRITING STYLE — RISHI GURU MODE:
${voice || "Speak as a classical Vedic master: warm, cited, never hedging. Close with a single dharmic line."}

STRUCTURE:
${structure || "Answer-first. Lead with the felt experience, then the classical reason in plain words, then a short technical anchor (planet/house/dasha) the reader can verify."}

EMOTIONAL REGISTER:
${emotional || "Warm Elder. Never fatalistic. Honor difficulty without dramatizing it."}

NEVER use bare jargon — always translate technical terms into plain words the moment you use them. Examples:
- "transit" → "the planet moving through your sky right now"
- "dasha" → "your current life chapter"
- "nakshatra" → "the lunar mansion"
- "lagna" → "your rising sign"
- "antardasha" → "the sub-chapter inside your current life chapter"

Address the person as "you" — this is a one-on-one consultation, never a lecture.
`.trim();
}

// Extra JSON keys the Guru reading must return on top of the period's base format.
export const GURU_EXTRA_JSON = `

GOD-MODE EXTRA FIELDS — REQUIRED in addition to the format above:
{
  "personal_callback": "ONE specific sentence quoting a real position from the chart summary (e.g. 'Your natal Jupiter in Pisces in the 5th is what makes today feel almost playful'). Must reference an actual planet/sign/house from the summary.",
  "life_area_lens": [
    { "area": "career|love|health|finances|spirituality", "guidance": "2 sentences specific to this life area" }
  ],
  "citations": [
    "Short footnote-style attribution, e.g. 'BPHS Ch. 47 — Saturn 12th from Moon (Sade Sati Rising)'",
    "2 to 4 entries total"
  ],
  "dharmic_close": "ONE closing line in the Warm Elder register, e.g. 'Bless the day. The river knows its bed.'"
}
`;

// Shared upgrades returned for everyone (free + guru).
export const COMMON_EXTRA_JSON = `

ADDITIONAL FIELDS — REQUIRED for daily/tomorrow periods:
{
  "three_acts": {
    "morning":   "1-2 sentence vignette for morning",
    "afternoon": "1-2 sentence vignette for afternoon",
    "evening":   "1-2 sentence vignette for evening"
  },
  "micro_ritual": "A 60-second physical action keyed to today's mood (one short sentence the user can do RIGHT NOW)",
  "if_then": [
    { "when": "time window e.g. 'Before 11 AM'", "if": "trigger condition", "then": "what to do" }
  ]
}
`;

export interface GuruContext {
  enabled: boolean;
  voice: "default" | "rishi_guru";
  systemBlock: string;
  writingRules: string;
  bundle: GuruBundle | null;
}

const DISABLED: GuruContext = {
  enabled: false,
  voice: "default",
  systemBlock: "",
  writingRules: "",
  bundle: null,
};

/**
 * Resolves whether the Rishi Guru voice should be applied for this user, and
 * returns the prompt fragments to inject. Safe to call from any edge function:
 * returns a no-op context (empty strings) when the toggle is off, so callers
 * can unconditionally do `systemPrompt = guru.systemBlock + systemPrompt`.
 *
 * Pass `forceEnable: true` to bypass the user check (admin preview).
 */
export async function resolveGuruContext(
  adminClient: ReturnType<typeof createClient>,
  userId: string | null | undefined,
  opts: { forceEnable?: boolean } = {},
): Promise<GuruContext> {
  try {
    let enabled = !!opts.forceEnable;
    if (!enabled && userId) {
      const { data } = await adminClient
        .from("profiles")
        .select("rishi_guru_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      enabled = data?.rishi_guru_enabled === true;
    }
    if (!enabled) return DISABLED;

    const bundle = await loadGuruBundle(adminClient);
    return {
      enabled: true,
      voice: "rishi_guru",
      systemBlock: assembleGuruSystemPrompt(bundle.layers, bundle.rules),
      writingRules: assembleGuruWritingRules(bundle.layers),
      bundle,
    };
  } catch (err) {
    console.error("resolveGuruContext failed", err);
    return DISABLED;
  }
}

/** Prepend the guru system block to an existing system prompt (no-op when disabled). */
export function applyGuru(systemPrompt: string, ctx: GuruContext): string {
  if (!ctx.enabled || !ctx.systemBlock) return systemPrompt;
  return `${ctx.systemBlock}\n\n${ctx.writingRules}\n\n${systemPrompt}`;
}
