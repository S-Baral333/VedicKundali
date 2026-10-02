import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The portal's copy lives in two places that cannot check each other: English
 * is inlined in src/i18n/config.ts, the other six languages are JSON under
 * public/locales. A key the code asks for and a locale lacks silently falls
 * back to English — in the middle of a Nepali screen — so this pins them.
 */
const LOCALES = join(process.cwd(), "public/locales");
const SRC = join(process.cwd(), "src/components/onboarding/dwara");
const NON_EN = ["hi", "ne", "mr", "bn", "ta", "te"];

const flatten = (obj: Record<string, unknown>, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

const dwaraKeys = (lang: string) => {
  const json = JSON.parse(readFileSync(join(LOCALES, lang, "onboarding.json"), "utf8"));
  return flatten(json.dwara).sort();
};

/** Every `onboarding:dwara.…` the components ask for, with eyebrow keys expanded. */
function keysUsedInCode(): string[] {
  const used = new Set<string>();
  for (const file of readdirSync(SRC).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))) {
    const text = readFileSync(join(SRC, file), "utf8");
    for (const m of text.matchAll(/onboarding:dwara\.([A-Za-z]+(?:\.[A-Za-z]+)*)/g)) {
      if (!m[1].startsWith("eyebrow")) used.add(m[1]);
    }
  }
  // DwaraFlow builds eyebrow keys from a map; its values are the keys.
  const flow = readFileSync(join(SRC, "DwaraFlow.tsx"), "utf8");
  const map = flow.match(/const key: Partial<Record<Step, string>> = \{([\s\S]*?)\};/);
  for (const m of (map?.[1] ?? "").matchAll(/:\s*"([a-z]+)"/g)) used.add(`eyebrow.${m[1]}`);
  return [...used].sort();
}

describe("Dwara copy", () => {
  const used = keysUsedInCode();

  it("finds the keys the components use", () => {
    expect(used.length).toBeGreaterThan(30);
    expect(used).toContain("eyebrow.moment");
  });

  it.each(NON_EN)("%s has every key the components use", (lang) => {
    const have = new Set(dwaraKeys(lang));
    expect(used.filter((k) => !have.has(k))).toEqual([]);
  });

  it.each(NON_EN)("%s has no keys the components do not use", (lang) => {
    const need = new Set(used);
    expect(dwaraKeys(lang).filter((k) => !need.has(k))).toEqual([]);
  });

  it.each(NON_EN)("%s keeps the interpolation placeholders", (lang) => {
    const json = JSON.parse(readFileSync(join(LOCALES, lang, "onboarding.json"), "utf8")).dwara;
    expect(json.arrivalTitle).toContain("{{name}}");
    expect(json.arrivalTitleSkipped).toContain("{{name}}");
    expect(json.progress).toContain("{{n}}");
    expect(json.progress).toContain("{{total}}");
  });
});
