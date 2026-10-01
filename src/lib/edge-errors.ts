// Reading a failed edge-function response into something a user can be shown.
//
// The functions answer a denial with both a machine code and a sentence:
//
//   { error: "quota_reached",
//     message: "You've used your free Oracle questions (3/month). Upgrade for more.",
//     feature: "ai_chat", upgrade_required: true, used: 3, limit: 3 }
//
// Every call site used to throw `err.error`, so the moment the quotas actually
// started firing the toast read "quota_reached". The sentence was right there in
// the payload, unused.
//
// Older handlers put a human sentence in `error` instead ("Chart not found"),
// and both conventions are still live, so this prefers `message`, accepts an
// `error` that reads like a sentence, and otherwise falls back to the caller's
// own wording rather than showing a code.

import type { FeatureKey } from "@/lib/tiers";

/** The JSON body an edge function sends with a 4xx/5xx. All fields optional. */
export interface EdgeErrorBody {
  /** Machine code: "quota_reached", "upgrade_required", "usage_unavailable", … */
  error?: string;
  /** Sentence written for the reader. Preferred over `error`. */
  message?: string;
  /** Resource or feature the denial concerns. */
  feature?: string;
  /** True when a higher tier would lift this denial. */
  upgrade_required?: boolean;
  current_tier?: string;
  required_tier?: string;
  used?: number;
  limit?: number;
}

export interface EdgeError {
  body: EdgeErrorBody;
  /** Fit to show a user — never a bare machine code. */
  message: string;
  /** Key for openUpgrade(), when upgrading would actually lift the denial. */
  upgradeFeature: FeatureKey | null;
}

/** Feature keys the upgrade modal understands, by the name the server uses. */
const UPGRADE_FEATURES: Record<string, FeatureKey> = {
  // Server names the chart allowance "charts"; the modal's key for "you need
  // room for another chart" is extra_chart.
  charts: "extra_chart",
  ai_chat: "ai_chat",
  ai_reading: "ai_reading",
  dream: "dream",
  pdf_download: "pdf_download",
  destiny_timeline: "destiny_timeline",
  muhurta_calculator: "muhurta_calculator",
  compatibility: "compatibility",
  varshaphal: "varshaphal",
};

/** True for a value that looks like a code rather than a sentence. */
function isMachineCode(v: string): boolean {
  return !/\s/.test(v.trim());
}

/**
 * Read a failed response into a body, a showable message, and the upgrade key.
 *
 * `fallback` is used when the body carries no sentence — pass something already
 * translated and specific to the action that failed.
 */
export async function readEdgeError(resp: Response, fallback: string): Promise<EdgeError> {
  let body: EdgeErrorBody = {};
  try {
    const raw = await resp.text();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") body = parsed as EdgeErrorBody;
    }
  } catch {
    // Not JSON, or the body was already consumed. The fallback covers it.
  }

  const sentence =
    (typeof body.message === "string" && body.message.trim()) ||
    (typeof body.error === "string" && !isMachineCode(body.error) && body.error.trim()) ||
    fallback;

  const named = typeof body.feature === "string" ? UPGRADE_FEATURES[body.feature] : undefined;

  return {
    body,
    message: sentence,
    // Only when the server says so: a quota denial on the top tier sets
    // upgrade_required false, and offering an upgrade there would be a lie.
    upgradeFeature: body.upgrade_required && named ? named : null,
  };
}
