// Sacred Kundali PDF — Elite-only on-demand generator.
// Renders a 10-page parchment + dark "Janma Kundali" using pdf-lib.
// Devanagari + Lora fonts are fetched at cold-start from jsDelivr/Google Fonts
// and cached for the function lifetime, so no binaries are committed.

// Polyfill regeneratorRuntime — fontkit's Indic shaping engine (Devanagari)
// uses generator syntax that, when bundled by edge-runtime via npm: specifiers,
// expects a global `regeneratorRuntime`. Load it before importing fontkit.
import "npm:regenerator-runtime@0.14.1/runtime.js";

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  degrees,
  StandardFonts,
} from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── A4 in points ───────────────────────────────────────────────────────────
const W = 595.276; // 210mm
const H = 841.89;  // 297mm
const MM = 2.83465;
const MARGIN = 14 * MM;

// ─── Palette (HSL → RGB rgb-fractions) ──────────────────────────────────────
const C = {
  saffron: rgb(0xC9 / 255, 0x7D / 255, 0x10 / 255),
  gold: rgb(0xB8 / 255, 0x82 / 255, 0x0A / 255),
  goldBright: rgb(0xE8 / 255, 0xB8 / 255, 0x4B / 255),
  goldDim: rgb(0x9A / 255, 0x6A / 255, 0x08 / 255),
  crimson: rgb(0x7A / 255, 0x0D / 255, 0x0D / 255),
  dark: rgb(0x1E / 255, 0x05 / 255, 0x05 / 255),
  dark2: rgb(0x11 / 255, 0x02 / 255, 0x02 / 255),
  parchment: rgb(0xFC / 255, 0xF0 / 255, 0xDC / 255),
  cream: rgb(0xFB / 255, 0xF5 / 255, 0xE9 / 255),
  ink: rgb(0x2C / 255, 0x05 / 255, 0x05 / 255),
  inkLight: rgb(0x5C / 255, 0x3A / 255, 0x1A / 255),
  bandWarm: rgb(0xF0 / 255, 0xE2 / 255, 0xC0 / 255),
  black: rgb(0, 0, 0),
  white: rgb(1, 1, 1),
};

// ─── Font sources (cached across cold start) ────────────────────────────────
const FONT_URLS = {
  body: "https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-normal.ttf",
  bodyBold: "https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-700-normal.ttf",
  bodyItalic: "https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-italic.ttf",
  devanagari: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-devanagari@latest/devanagari-400-normal.ttf",
  devanagariBold: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-devanagari@latest/devanagari-700-normal.ttf",
};

let fontCache: Record<string, Uint8Array> | null = null;
async function loadFontBytes() {
  if (fontCache) return fontCache;
  const entries = await Promise.all(
    Object.entries(FONT_URLS).map(async ([k, url]) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Font fetch failed (${k}): ${res.status}`);
      return [k, new Uint8Array(await res.arrayBuffer())] as const;
    }),
  );
  fontCache = Object.fromEntries(entries);
  return fontCache;
}

// ─── Sanskrit constants ─────────────────────────────────────────────────────
const TITHI_NAMES = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami",
  "Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima",
];
const VARA_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const VARA_SANSKRIT = ["Ravivar","Somvar","Mangalvar","Budhvar","Guruvar","Shukravar","Shanivar"];

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_GLYPH: Record<string, string> = {
  Aries:"Ar", Taurus:"Ta", Gemini:"Ge", Cancer:"Cn", Leo:"Le", Virgo:"Vi",
  Libra:"Li", Scorpio:"Sc", Sagittarius:"Sg", Capricorn:"Cp", Aquarius:"Aq", Pisces:"Pi",
};
const PLANET_ABBR: Record<string, string> = {
  Sun:"Su", Moon:"Mo", Mars:"Ma", Mercury:"Me", Jupiter:"Ju",
  Venus:"Ve", Saturn:"Sa", Rahu:"Ra", Ketu:"Ke", Lagna:"As", Ascendant:"As",
};
const PLANET_SANSKRIT: Record<string, string> = {
  Sun:"Surya", Moon:"Chandra", Mars:"Mangal", Mercury:"Budha", Jupiter:"Guru",
  Venus:"Shukra", Saturn:"Shani", Rahu:"Rahu", Ketu:"Ketu",
};
const PLANET_BEEJ: { name: string; sanskrit: string; mantra: string; translit: string }[] = [
  { name: "Surya",   sanskrit: "॥ ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः ॥", mantra: "Om Hraam Hreem Hraum Sah Suryaya Namaha", translit: "For radiance, vitality, leadership" },
  { name: "Chandra", sanskrit: "॥ ॐ श्रां श्रीं श्रौं सः चन्द्राय नमः ॥", mantra: "Om Shraam Shreem Shraum Sah Chandraya Namaha", translit: "For peace of mind, emotional balance" },
  { name: "Mangal",  sanskrit: "॥ ॐ क्रां क्रीं क्रौं सः भौमाय नमः ॥",   mantra: "Om Kraam Kreem Kraum Sah Bhaumaya Namaha", translit: "For courage, energy, victory" },
  { name: "Budha",   sanskrit: "॥ ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः ॥",   mantra: "Om Braam Breem Braum Sah Budhaya Namaha", translit: "For intellect, communication, wit" },
  { name: "Guru",    sanskrit: "॥ ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः ॥",   mantra: "Om Graam Greem Graum Sah Gurave Namaha", translit: "For wisdom, fortune, dharma" },
  { name: "Shukra",  sanskrit: "॥ ॐ द्रां द्रीं द्रौं सः शुक्राय नमः ॥",  mantra: "Om Draam Dreem Draum Sah Shukraya Namaha", translit: "For love, beauty, comfort" },
  { name: "Shani",   sanskrit: "॥ ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः ॥", mantra: "Om Praam Preem Praum Sah Shanaishcharaya Namaha", translit: "For discipline, longevity, perseverance" },
  { name: "Rahu",    sanskrit: "॥ ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः ॥",   mantra: "Om Bhraam Bhreem Bhraum Sah Rahave Namaha", translit: "For breaking limitations, foresight" },
  { name: "Ketu",    sanskrit: "॥ ॐ स्रां स्रीं स्रौं सः केतवे नमः ॥",   mantra: "Om Sraam Sreem Sraum Sah Ketave Namaha", translit: "For liberation, intuition, moksha" },
];

const INVOCATIONS = [
  {
    titleSa: "॥ श्री गणेशाय नमः ॥",
    titleEn: "SHRI GANESHA — REMOVER OF OBSTACLES",
    versesSa: ["वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।", "निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥"],
    versesEn: ["Vakratunda Mahakaya Suryakoti Samaprabha,", "Nirvighnam Kuru Me Deva Sarva-Karyeshu Sarvada."],
  },
  {
    titleSa: "॥ गुरु परम्परा नमः ॥",
    titleEn: "THE GURU LINEAGE — ETERNAL KNOWLEDGE CHAIN",
    versesSa: ["गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः ।", "गुरुः साक्षात् परब्रह्म तस्मै श्री गुरवे नमः ॥"],
    versesEn: ["Gurur Brahma Gurur Vishnu, Gurur Devo Maheshwara,", "Guruh Sakshat Para-Brahma, Tasmai Shri Gurave Namah."],
  },
  {
    titleSa: "॥ सरस्वती नमस्तुभ्यं ॥",
    titleEn: "SARASWATI — GODDESS OF JYOTISH VIDYA",
    versesSa: ["या कुन्देन्दु तुषार हार धवला या शुभ्र वस्त्रावृता ।", "या वीणा वर दण्ड मण्डित करा या श्वेत पद्मासना ॥"],
    versesEn: ["Ya Kundendu-Tushara-Hara-Dhavala, Ya Shubhra-Vastravruta,", "Ya Veena-Vara-Danda-Mandita-Kara, Ya Shweta-Padmasana."],
  },
  {
    titleSa: "॥ पराशर ऋषि प्रणाम ॥",
    titleEn: "MAHARISHI PARASHARA — FATHER OF JYOTISH",
    versesSa: ["नमस्तस्मै महर्षाय पराशराय महात्मने ।", "यस्य प्रसादाद् ज्योतिष्ये ज्ञानं जातं महत्तमम् ॥"],
    versesEn: ["Namas Tasmai Maharshaya Parasharaya Mahatmane,", "Yasya Prasadad Jyotishye Gyanam Jatam Mahattamam."],
  },
];

// ─── Drawing helpers ────────────────────────────────────────────────────────
type Fonts = {
  body: PDFFont; bodyBold: PDFFont; bodyItalic: PDFFont;
  display: PDFFont; displayBold: PDFFont; mono: PDFFont;
  san: PDFFont; sanBold: PDFFont;
};

function pageBgDark(p: PDFPage, color = C.dark) {
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color });
}
function pageBgParchment(p: PDFPage) {
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.cream });
  p.drawRectangle({ x: 0, y: 0, width: W, height: 12 * MM, color: C.bandWarm });
  p.drawRectangle({ x: 0, y: H - 12 * MM, width: W, height: 12 * MM, color: C.bandWarm });
}
function borderFrame(p: PDFPage) {
  const m = MARGIN;
  p.drawRectangle({ x: m, y: m, width: W - 2*m, height: H - 2*m, borderColor: C.gold, borderWidth: 0.9 });
  p.drawRectangle({ x: m + 2.5*MM, y: m + 2.5*MM, width: W - 2*(m + 2.5*MM), height: H - 2*(m + 2.5*MM), borderColor: C.gold, borderWidth: 0.3 });
}
function cornerMarks(p: PDFPage, size = 20) {
  const m = MARGIN;
  const corners: [number, number, number][] = [
    [m, H - m, 0], [W - m, H - m, 90], [W - m, m, 180], [m, m, 270],
  ];
  for (const [cx, cy, deg] of corners) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const v = (lx: number, ly: number) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
    const a = v(0, 0), b = v(size, 0), c = v(0, size);
    p.drawLine({ start: a, end: b, color: C.goldBright, thickness: 0.9 });
    p.drawLine({ start: a, end: c, color: C.goldBright, thickness: 0.9 });
    p.drawRectangle({ x: cx - 2.8, y: cy - 2.8, width: 5.6, height: 5.6, color: C.goldBright });
  }
}
function hline(p: PDFPage, y: number, x1?: number, x2?: number, lw = 0.6, color = C.gold) {
  p.drawLine({ start: { x: x1 ?? MARGIN + 6*MM, y }, end: { x: x2 ?? W - MARGIN - 6*MM, y }, color, thickness: lw });
}
function doubleLine(p: PDFPage, y: number, x1?: number, x2?: number) {
  hline(p, y, x1, x2, 0.8); hline(p, y - 2.5, x1, x2, 0.3);
}
function ornamentDivider(p: PDFPage, y: number, cx = W/2, width = 130) {
  const beads = [6, 4, 3.5, 3, 2.5, 2, 1.5];
  const step = width / (2 * beads.length);
  for (let i = 0; i < beads.length; i++) {
    const offset = (i + 0.5) * step;
    const r = beads[i] * 0.55;
    p.drawCircle({ x: cx + offset, y, size: r, color: C.goldBright });
    p.drawCircle({ x: cx - offset, y, size: r, color: C.goldBright });
  }
  p.drawEllipse({ x: cx, y, xScale: 5, yScale: 4.5, color: C.goldBright });
  p.drawLine({ start: { x: cx - width/2, y }, end: { x: cx - 20, y }, color: C.goldBright, thickness: 0.5 });
  p.drawLine({ start: { x: cx + 20, y }, end: { x: cx + width/2, y }, color: C.goldBright, thickness: 0.5 });
}
function drawText(p: PDFPage, text: unknown, opts: { x: number; y: number; size: number; font: PDFFont; color?: any; align?: "left"|"center"|"right" }) {
  const { x, y, size, font, color = C.parchment, align = "left" } = opts;
  const safe = text == null ? "" : String(text);
  if (!safe) return;
  const w = font.widthOfTextAtSize(safe, size);
  const dx = align === "center" ? -w/2 : align === "right" ? -w : 0;
  p.drawText(safe, { x: x + dx, y, size, font, color });
}
function pageNumber(p: PDFPage, n: number, font: PDFFont, dark = true) {
  const col = dark ? C.saffron : C.crimson;
  drawText(p, `KUNDALI.APP  ·  kundali.app  ·  Page ${n}`, { x: W/2, y: MARGIN - 5, size: 6, font, color: col, align: "center" });
}
function wrapLines(text: unknown, font: PDFFont, size: number, maxW: number): string[] {
  const safe = text == null ? "" : String(text);
  const words = safe.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
    else { if (line) out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}

// Splits a string into runs of Devanagari (U+0900–U+097F + Vedic ext + ॐ) vs.
// everything else, and renders each run with the right font. Latin punctuation,
// digits and ASCII em-dashes/spaces stay with the Latin font; Devanagari glyphs
// (and the Om sign) go through the Sanskrit font. Anything outside Lora's range
// (e.g. •, ·, em-dash) is allowed because Lora supports them; non-supported
// glyphs are stripped to avoid tofu.
const DEVA_RE = /[\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]/;
function isDevanagariRun(ch: string) {
  return DEVA_RE.test(ch);
}
function splitMixed(text: string): { run: string; deva: boolean }[] {
  const out: { run: string; deva: boolean }[] = [];
  if (!text) return out;
  let cur = "";
  let curDeva = isDevanagariRun(text[0]);
  for (const ch of text) {
    const d = isDevanagariRun(ch);
    if (d === curDeva) cur += ch;
    else { if (cur) out.push({ run: cur, deva: curDeva }); cur = ch; curDeva = d; }
  }
  if (cur) out.push({ run: cur, deva: curDeva });
  return out;
}
// Draw a string that may contain mixed Devanagari + Latin, using the right font
// for each run. `latin`/`deva` are the two fonts; alignment supported.
function drawMixed(
  p: PDFPage,
  text: unknown,
  opts: { x: number; y: number; size: number; latin: PDFFont; deva: PDFFont; color?: any; align?: "left"|"center"|"right"; gap?: number },
) {
  const { x, y, size, latin, deva, color = C.parchment, align = "left", gap = 1.5 } = opts;
  const safe = text == null ? "" : String(text);
  if (!safe) return;
  const runs = splitMixed(safe);
  // Compute total width
  let total = 0;
  const widths = runs.map((r) => {
    const f = r.deva ? deva : latin;
    const w = f.widthOfTextAtSize(r.run, size);
    return w;
  });
  for (let i = 0; i < widths.length; i++) {
    total += widths[i];
    if (i < widths.length - 1) total += gap;
  }
  const dx = align === "center" ? -total/2 : align === "right" ? -total : 0;
  let cx = x + dx;
  for (let i = 0; i < runs.length; i++) {
    const f = runs[i].deva ? deva : latin;
    p.drawText(runs[i].run, { x: cx, y, size, font: f, color });
    cx += widths[i] + gap;
  }
}
function drawKundaliGrid(p: PDFPage, cx: number, cy: number, s: number, houses: Record<number, { sign: string; planets: string[] }>, fonts: Fonts) {
  // Outer diamond (filled near-black with gold border) — pdf-lib has no path-fill,
  // so we render the diamond border via 4 lines and rely on the dark page bg.
  const diamond = [
    { x: cx, y: cy + s }, { x: cx + s, y: cy }, { x: cx, y: cy - s }, { x: cx - s, y: cy }, { x: cx, y: cy + s },
  ];
  for (let i = 0; i < diamond.length - 1; i++) {
    p.drawLine({ start: diamond[i], end: diamond[i + 1], color: C.gold, thickness: 1.2 });
  }
  // Inner square (rotated 0°)
  const hs = s * 0.5;
  p.drawRectangle({ x: cx - hs, y: cy - hs, width: hs * 2, height: hs * 2, borderColor: C.gold, borderWidth: 0.8 });
  // Diagonals (corners of inner square → diamond vertices)
  const diags: [number, number, number, number][] = [
    [cx - hs, cy + hs, cx - s, cy], [cx - hs, cy + hs, cx, cy + s],
    [cx + hs, cy + hs, cx + s, cy], [cx + hs, cy + hs, cx, cy + s],
    [cx - hs, cy - hs, cx - s, cy], [cx - hs, cy - hs, cx, cy - s],
    [cx + hs, cy - hs, cx + s, cy], [cx + hs, cy - hs, cx, cy - s],
  ];
  for (const [x1, y1, x2, y2] of diags) {
    p.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: C.gold, thickness: 0.7 });
  }
  // House centres (North Indian standard)
  const hc: Record<number, [number, number]> = {
    1:  [cx,            cy + s * 0.72],
    2:  [cx + s * 0.50, cy + s * 0.50],
    3:  [cx + s * 0.72, cy],
    4:  [cx + s * 0.50, cy - s * 0.50],
    5:  [cx,            cy - s * 0.72],
    6:  [cx - s * 0.50, cy - s * 0.50],
    7:  [cx - s * 0.72, cy],
    8:  [cx - s * 0.50, cy + s * 0.50],
    9:  [cx - hs * 0.48, cy + hs * 0.48],
    10: [cx + hs * 0.48, cy + hs * 0.48],
    11: [cx + hs * 0.48, cy - hs * 0.48],
    12: [cx - hs * 0.48, cy - hs * 0.48],
  };
  for (const [num, [hx, hy]] of Object.entries(hc)) {
    const h = houses[Number(num)];
    if (!h) continue;
    drawText(p, String(num), { x: hx, y: hy + 9, size: 7.5, font: fonts.displayBold, color: C.gold, align: "center" });
    drawText(p, h.sign,      { x: hx, y: hy + 1, size: 6.5, font: fonts.bodyBold,    color: C.saffron, align: "center" });
    const dense = h.planets.length >= 4;
    const stride = dense ? 6.5 : 8;
    const psize = dense ? 5.8 : 6.5;
    h.planets.forEach((pl, j) => {
      drawText(p, pl, { x: hx, y: hy - 8 - j * stride, size: psize, font: fonts.body, color: C.parchment, align: "center" });
    });
  }
  drawText(p, "LAGNA", { x: cx, y: cy + s + 14, size: 6.5, font: fonts.displayBold, color: C.crimson, align: "center" });
}

// ─── Native payload shaping ─────────────────────────────────────────────────
type Native = ReturnType<typeof shapeNative>;

function fmtDeg(deg: number) {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}'`;
}
function ucFirst(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function shapeNative(chart: any, chartRow: any) {
  const cd = chart;
  const ascSign = cd?.ascendant?.sign || "Aries";
  const ascIdx = SIGNS.indexOf(ascSign);
  const planets = (cd?.planets || []) as any[];

  // Build North Indian houses payload
  const houseToSign: Record<number, string> = {};
  for (let i = 0; i < 12; i++) houseToSign[i + 1] = SIGNS[(ascIdx + i) % 12];
  const housesObj: Record<number, { sign: string; planets: string[] }> = {};
  for (let i = 1; i <= 12; i++) housesObj[i] = { sign: SIGN_GLYPH[houseToSign[i]] || houseToSign[i].slice(0,2), planets: [] };
  housesObj[1].planets.push("As"); // Lagna marker
  for (const pl of planets) {
    const h = pl.house;
    if (h && housesObj[h]) {
      const code = (PLANET_ABBR[pl.name] || pl.name.slice(0, 2)) + (pl.is_retrograde ? "(R)" : "");
      housesObj[h].planets.push(code);
    }
  }

  // Panchanga (best-effort — generate-chart already stores tithi/nakshatra under chart_data.panchanga; fall back to birth_nakshatra)
  const panch = cd?.panchanga || {};
  const tithiName = panch?.tithi?.name || "—";
  const paksha = panch?.tithi?.paksha || "";
  const nakP = panch?.nakshatra?.name || cd?.birth_nakshatra?.name || "—";
  const nakPada = panch?.nakshatra?.pada || cd?.birth_nakshatra?.pada || "";
  const yoga = panch?.yoga?.name || "—";
  const karanaRaw = panch?.karana;
  const karana = typeof karanaRaw === "string"
    ? karanaRaw
    : (karanaRaw?.name || "—");
  const dob = chartRow.date_of_birth as string;
  const varaIdx = dob ? new Date(dob + "T00:00:00Z").getUTCDay() : 0;
  const vara = `${VARA_SANSKRIT[varaIdx]} (${VARA_NAMES[varaIdx]})`;

  // Planets table
  const planetRows = planets.map((pl) => ({
    sym: PLANET_ABBR[pl.name] || pl.name.slice(0,2),
    name: PLANET_SANSKRIT[pl.name] || pl.name,
    sign: pl.sign,
    degree: typeof pl.degree === "number" ? fmtDeg(pl.degree) : "—",
    nak: pl.nakshatra || "—",
    pada: pl.nakshatra_pada ? String(pl.nakshatra_pada) : "—",
    house: String(pl.house ?? "—"),
    status: ucFirst((pl.dignity || "—").replace("_", " ")),
    retro: !!pl.is_retrograde,
  }));
  // Append Lagna row
  planetRows.push({
    sym: "As", name: "Lagna", sign: ascSign,
    degree: fmtDeg(cd?.ascendant?.degree ?? 0),
    nak: cd?.ascendant?.nakshatra || "—", pada: "—", house: "1", status: "—", retro: false,
  });

  // Dasha
  const dasha = cd?.dasha || {};
  const yogas = (cd?.active_yogas || []).slice(0, 6);

  return {
    name: chartRow.full_name || "Native",
    dob: dob || "—",
    tob: chartRow.birth_time || "—",
    pob: chartRow.birthplace || "—",
    latLon: (chartRow.latitude != null && chartRow.longitude != null)
      ? `${chartRow.latitude.toFixed(2)}° / ${chartRow.longitude.toFixed(2)}°`
      : "—",
    lagna: `${ascSign} — ${fmtDeg(cd?.ascendant?.degree ?? 0)}`,
    moonSign: cd?.moon_sign || "—",
    sunSign: cd?.sun_sign || "—",
    nakshatra: `${cd?.birth_nakshatra?.name || "—"}${cd?.birth_nakshatra?.pada ? ` — Pada ${cd.birth_nakshatra.pada}` : ""}`,
    ayanamsha: cd?.ayanamsha || "Lahiri",
    panchanga: { tithi: paksha ? `${paksha} ${tithiName}` : tithiName, vara, nakshatra: `${nakP}${nakPada ? ` — Pada ${nakPada}` : ""}`, yoga, karana },
    dashaCurrent: {
      maha: dasha.maha_dasha || "—",
      antar: dasha.antar_dasha || "—",
      praty: dasha.pratyantar_dasha || "—",
      from: dasha.antar_dasha_start || dasha.maha_dasha_start || "—",
      to: dasha.antar_dasha_end || dasha.maha_dasha_end || "—",
    },
    planets: planetRows,
    chartHouses: housesObj,
    yogas: yogas.map((y: any) => ({
      name: y.name || "Yoga",
      sanskrit: y.sanskrit_name || "",
      strength: y.strength || "Active",
      description: y.description || "",
    })),
  };
}

// ─── Page renderers ─────────────────────────────────────────────────────────
function pageCover(p: PDFPage, d: Native, fonts: Fonts) {
  pageBgDark(p);
  borderFrame(p);
  cornerMarks(p);

  // Top invocation (Sanskrit)
  drawText(p, "॥ ॐ गं गणपतये नमः ॥", { x: W/2, y: H - 28*MM, size: 16, font: fonts.sanBold, color: C.goldBright, align: "center" });
  drawText(p, "OM GANESHAYA NAMAHA  ·  SHUBH AARAMBH", { x: W/2, y: H - 36*MM, size: 7.5, font: fonts.display, color: C.saffron, align: "center" });
  doubleLine(p, H - 40*MM);

  // Brand wordmark
  drawText(p, "KUNDALI", { x: W/2, y: H - 60*MM, size: 42, font: fonts.displayBold, color: C.white, align: "center" });
  drawMixed(p, "VEDIC ASTROLOGY · जन्मपत्री", { x: W/2, y: H - 68*MM, size: 8.5, latin: fonts.display, deva: fonts.san, color: C.saffron, align: "center" });
  doubleLine(p, H - 72*MM);

  // Tagline band (fills the previously empty gap between wordmark and centerpiece)
  drawText(p, "A SACRED RECORD OF YOUR JOURNEY", { x: W/2, y: H - 88*MM, size: 8, font: fonts.display, color: C.saffron, align: "center" });
  drawText(p, "Prepared in the tradition of Maharishi Parashara", { x: W/2, y: H - 97*MM, size: 10, font: fonts.bodyItalic, color: C.parchment, align: "center" });
  ornamentDivider(p, H - 105*MM, W/2, 130);

  // Centerpiece title (logo would sit between — using ornament for now)
  ornamentDivider(p, H/2 + 30, W/2, 170);
  drawText(p, "Janma Kundali", { x: W/2, y: H/2 + 6, size: 24, font: fonts.displayBold, color: C.parchment, align: "center" });
  drawMixed(p, "जन्म कुण्डली  ·  SACRED BIRTH CHART", { x: W/2, y: H/2 - 6, size: 9, latin: fonts.display, deva: fonts.san, color: C.goldBright, align: "center" });
  ornamentDivider(p, H/2 - 18, W/2, 170);

  // Native details box
  const bx = W/2 - 95, bw = 190, bh = 80;
  const by = H/2 - 40 - bh;
  p.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: rgb(0x2E/255, 0x08/255, 0x08/255), borderColor: C.gold, borderWidth: 0.7 });
  p.drawRectangle({ x: bx + 2, y: by + 2, width: bw - 4, height: bh - 4, borderColor: C.gold, borderWidth: 0.25 });
  drawText(p, "NATIVE", { x: W/2, y: by + bh - 12, size: 6.5, font: fonts.display, color: C.saffron, align: "center" });
  drawText(p, d.name, { x: W/2, y: by + bh - 30, size: 15, font: fonts.displayBold, color: C.white, align: "center" });
  drawText(p, `${d.dob}  ·  ${d.tob}`, { x: W/2, y: by + bh - 48, size: 9.5, font: fonts.body, color: C.goldBright, align: "center" });
  drawText(p, d.pob, { x: W/2, y: by + bh - 62, size: 9, font: fonts.bodyItalic, color: C.parchment, align: "center" });

  // Navagraha strip
  ornamentDivider(p, by - 12, W/2, 160);
  const planets = ["Surya","Chandra","Mangal","Budha","Guru","Shukra","Shani","Rahu","Ketu"];
  const availW = W - 2*MARGIN - 20;
  const step = availW / planets.length;
  planets.forEach((nm, i) => {
    const px = MARGIN + 10 + step * i + step/2;
    drawText(p, nm.charAt(0), { x: px, y: by - 32, size: 12, font: fonts.bodyBold, color: C.goldBright, align: "center" });
    drawText(p, nm, { x: px, y: by - 42, size: 5.5, font: fonts.display, color: C.saffron, align: "center" });
  });

  // Footer
  ornamentDivider(p, 40*MM, W/2, 190);
  drawText(p, "\"As above, so below. As within, so without.\"", { x: W/2, y: 33*MM, size: 9.5, font: fonts.bodyItalic, color: C.parchment, align: "center" });
  drawText(p, "kundali.app  ·  YOUR STARS. YOUR STORY. YOUR DHARMA.", { x: W/2, y: 26*MM, size: 6, font: fonts.display, color: C.saffron, align: "center" });
}

function pageInvocation(p: PDFPage, _d: Native, fonts: Fonts) {
  pageBgDark(p, C.dark2);
  borderFrame(p);
  cornerMarks(p);

  drawText(p, "॥ मंगलाचरण ॥", { x: W/2, y: H - 28*MM, size: 18, font: fonts.sanBold, color: C.goldBright, align: "center" });
  drawText(p, "MANGALACHARANA — AUSPICIOUS INVOCATION", { x: W/2, y: H - 36*MM, size: 8, font: fonts.display, color: C.saffron, align: "center" });
  doubleLine(p, H - 40*MM);

  let y = H - 54*MM;
  const rowH = 92; // header + ornament + 2 verses × (Sa 13 + En 11) + breathing room
  for (const inv of INVOCATIONS) {
    ornamentDivider(p, y, W/2, 160);
    drawText(p, inv.titleSa, { x: W/2, y: y - 14, size: 13, font: fonts.sanBold, color: C.goldBright, align: "center" });
    drawText(p, inv.titleEn, { x: W/2, y: y - 24, size: 6.5, font: fonts.display, color: C.saffron, align: "center" });
    const verseStride = 26; // Sa line + En line = 13 + 11 + 2 padding
    inv.versesSa.forEach((v, j) => {
      const baseY = y - 38 - j * verseStride;
      drawText(p, v, { x: W/2, y: baseY, size: 10.5, font: fonts.san, color: C.parchment, align: "center" });
      drawText(p, inv.versesEn[j] || "", { x: W/2, y: baseY - 12, size: 8.5, font: fonts.bodyItalic, color: rgb(0xA0/255, 0x90/255, 0x70/255), align: "center" });
    });
    y -= rowH;
  }

  ornamentDivider(p, 50*MM, W/2, 180);
  drawText(p, "This sacred Kundali is prepared with reverence, under the guidance", { x: W/2, y: 42*MM, size: 10, font: fonts.bodyItalic, color: C.parchment, align: "center" });
  drawText(p, "of the ancient rishis, by the grace of the Navagrahas.", { x: W/2, y: 31*MM, size: 10, font: fonts.bodyItalic, color: C.parchment, align: "center" });
  pageNumber(p, 2, fonts.display, true);
}

function pageBirthDetails(p: PDFPage, d: Native, fonts: Fonts) {
  pageBgParchment(p);
  borderFrame(p);
  cornerMarks(p);

  drawMixed(p, "JANMA PATRIKA — जन्म पत्रिका", { x: W/2, y: H - 28*MM, size: 17, latin: fonts.displayBold, deva: fonts.sanBold, color: C.ink, align: "center" });
  drawText(p, "Sacred Birth Certificate", { x: W/2, y: H - 37*MM, size: 10.5, font: fonts.bodyItalic, color: C.saffron, align: "center" });
  doubleLine(p, H - 41*MM);

  const fields: [string, string, string][] = [
    ["नाम",       "Name",            d.name],
    ["जन्म तिथि", "Date of Birth",   d.dob],
    ["जन्म समय",  "Time of Birth",   d.tob],
    ["जन्म स्थान","Place of Birth",  d.pob],
    ["अक्षांश",   "Latitude / Long.",d.latLon],
    ["लग्न",      "Ascendant",       d.lagna],
    ["चन्द्र राशि","Moon Sign",       d.moonSign],
    ["जन्म नक्षत्र","Nakshatra",       d.nakshatra],
    ["आयनांश",    "Ayanamsha",       d.ayanamsha],
  ];
  let y = H - 54*MM;
  const labelW = 62*MM;
  fields.forEach((f, i) => {
    const fy = y - i * 18;
    if (i % 2 === 0) p.drawRectangle({ x: MARGIN + 6*MM, y: fy - 5, width: W - 2*MARGIN - 12*MM, height: 16, color: rgb(0xFD/255, 0xF7/255, 0xEE/255) });
    drawText(p, f[0], { x: MARGIN + 8*MM, y: fy + 3, size: 8, font: fonts.san, color: C.crimson });
    drawText(p, f[1], { x: MARGIN + 8*MM + 30*MM, y: fy + 3, size: 7.5, font: fonts.display, color: C.crimson });
    drawText(p, f[2], { x: MARGIN + 8*MM + labelW, y: fy + 3, size: 10, font: fonts.bodyBold, color: C.ink });
  });

  // Panchanga
  const yBelow = y - fields.length * 18 - 6;
  doubleLine(p, yBelow);
  drawMixed(p, "PANCHANGA — पञ्चाङ्ग", { x: W/2, y: yBelow - 14, size: 11, latin: fonts.displayBold, deva: fonts.sanBold, color: C.ink, align: "center" });
  const items: [string, string, string][] = [
    ["तिथि", "Tithi", d.panchanga.tithi],
    ["वार",  "Vara", d.panchanga.vara],
    ["नक्षत्र", "Nakshatra", d.panchanga.nakshatra],
    ["योग",  "Yoga", d.panchanga.yoga],
    ["करण",  "Karana", d.panchanga.karana],
  ];
  const pw = (W - 2*MARGIN - 12*MM) / 5;
  items.forEach((it, i) => {
    const px = MARGIN + 6*MM + i * pw;
    const py = yBelow - 30;
    p.drawRectangle({ x: px + 1, y: py - 28, width: pw - 3, height: 42, color: rgb(0xFD/255, 0xF7/255, 0xEE/255), borderColor: C.saffron, borderWidth: 0.6 });
    drawText(p, it[0], { x: px + pw/2, y: py + 4, size: 8, font: fonts.san, color: C.crimson, align: "center" });
    drawText(p, it[1], { x: px + pw/2, y: py - 6, size: 6, font: fonts.display, color: C.inkLight, align: "center" });
    const lines = wrapLines(it[2], fonts.bodyBold, 8, pw - 6);
    lines.forEach((ln, li) => drawText(p, ln, { x: px + pw/2, y: py - 16 - li * 9, size: 8, font: fonts.bodyBold, color: C.ink, align: "center" }));
  });

  pageNumber(p, 3, fonts.display, false);
}

function pageKundaliChart(p: PDFPage, d: Native, fonts: Fonts) {
  pageBgDark(p);
  borderFrame(p);
  cornerMarks(p);

  drawMixed(p, "JANMA KUNDALI — जन्म कुण्डली", { x: W/2, y: H - 28*MM, size: 14, latin: fonts.displayBold, deva: fonts.sanBold, color: C.goldBright, align: "center" });
  drawText(p, "Natal Birth Chart · Rashi (D1) · North Indian Style", { x: W/2, y: H - 36*MM, size: 10, font: fonts.bodyItalic, color: C.saffron, align: "center" });
  doubleLine(p, H - 40*MM);

  const cy = H/2 + 14*MM;
  drawKundaliGrid(p, W/2, cy, 127, d.chartHouses, fonts);

  // Legend
  const legY = cy - 160;
  ornamentDivider(p, legY + 18, W/2, 160);
  drawText(p, "LEGEND — KEY", { x: W/2, y: legY + 4, size: 9, font: fonts.displayBold, color: C.goldBright, align: "center" });
  const cols = [
    "Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter",
    "Ve Venus · Sa Saturn · Ra Rahu · Ke Ketu · As Lagna",
    "(R) = Retrograde · House numbers fixed · Signs rotate from Lagna",
  ];
  cols.forEach((line, i) => drawText(p, line, { x: W/2, y: legY - 8 - i * 11, size: 8, font: fonts.body, color: C.parchment, align: "center" }));

  pageNumber(p, 4, fonts.display, true);
}

function pagePlanets(p: PDFPage, d: Native, fonts: Fonts) {
  pageBgParchment(p);
  borderFrame(p);
  cornerMarks(p);

  drawMixed(p, "GRAHA STITHI — ग्रह स्थिति", { x: W/2, y: H - 28*MM, size: 16, latin: fonts.displayBold, deva: fonts.sanBold, color: C.ink, align: "center" });
  drawText(p, "Planetary Positions at Birth", { x: W/2, y: H - 37*MM, size: 10, font: fonts.bodyItalic, color: C.saffron, align: "center" });
  doubleLine(p, H - 41*MM);

  // Header row
  const cols = [
    { label: "Sym", x: MARGIN + 8*MM,  w: 22 },
    { label: "Planet", x: MARGIN + 8*MM + 22, w: 64 },
    { label: "Sign", x: MARGIN + 8*MM + 86, w: 80 },
    { label: "Degree", x: MARGIN + 8*MM + 166, w: 50 },
    { label: "Nakshatra", x: MARGIN + 8*MM + 216, w: 90 },
    { label: "Pada", x: MARGIN + 8*MM + 306, w: 36 },
    { label: "House", x: MARGIN + 8*MM + 342, w: 40 },
    { label: "Status", x: MARGIN + 8*MM + 382, w: 80 },
  ];
  let y = H - 56*MM;
  p.drawRectangle({ x: MARGIN + 6*MM, y: y - 4, width: W - 2*MARGIN - 12*MM, height: 18, color: C.crimson });
  cols.forEach((c) => drawText(p, c.label, { x: c.x, y: y + 3, size: 8, font: fonts.displayBold, color: C.parchment }));

  y -= 22;
  d.planets.forEach((pl, i) => {
    if (i % 2 === 0) p.drawRectangle({ x: MARGIN + 6*MM, y: y - 4, width: W - 2*MARGIN - 12*MM, height: 16, color: rgb(0xFD/255, 0xF7/255, 0xEE/255) });
    drawText(p, pl.sym, { x: cols[0].x, y: y + 1, size: 9, font: fonts.bodyBold, color: C.crimson });
    drawText(p, pl.name + (pl.retro ? " (R)" : ""), { x: cols[1].x, y: y + 1, size: 9, font: fonts.bodyBold, color: C.ink });
    drawText(p, pl.sign, { x: cols[2].x, y: y + 1, size: 9, font: fonts.body, color: C.ink });
    drawText(p, pl.degree, { x: cols[3].x, y: y + 1, size: 9, font: fonts.body, color: C.ink });
    drawText(p, pl.nak, { x: cols[4].x, y: y + 1, size: 9, font: fonts.body, color: C.ink });
    drawText(p, pl.pada, { x: cols[5].x, y: y + 1, size: 9, font: fonts.body, color: C.ink, align: "center" });
    drawText(p, pl.house, { x: cols[6].x, y: y + 1, size: 9, font: fonts.body, color: C.ink, align: "center" });
    drawText(p, pl.status, { x: cols[7].x, y: y + 1, size: 9, font: fonts.bodyItalic, color: C.saffron });
    y -= 18;
  });

  pageNumber(p, 5, fonts.display, false);
}

function pageDasha(p: PDFPage, d: Native, fonts: Fonts) {
  pageBgDark(p);
  borderFrame(p);
  cornerMarks(p);

  drawMixed(p, "VIMSHOTTARI DASHA — विंशोत्तरी दशा", { x: W/2, y: H - 28*MM, size: 14, latin: fonts.displayBold, deva: fonts.sanBold, color: C.goldBright, align: "center" });
  drawText(p, "120-Year Planetary Period Cycle", { x: W/2, y: H - 36*MM, size: 10, font: fonts.bodyItalic, color: C.saffron, align: "center" });
  doubleLine(p, H - 40*MM);

  // Current dasha highlight
  const bx = MARGIN + 8*MM, by = H - 80*MM, bw = W - 2*MARGIN - 16*MM, bh = 70;
  p.drawRectangle({ x: bx, y: by, width: bw, height: bh, color: rgb(0x2E/255, 0x08/255, 0x08/255), borderColor: C.gold, borderWidth: 0.7 });
  drawText(p, "CURRENT PERIOD", { x: bx + bw/2, y: by + bh - 14, size: 8, font: fonts.display, color: C.saffron, align: "center" });
  drawText(p, `${d.dashaCurrent.maha} Mahadasha · ${d.dashaCurrent.antar} Antardasha`, { x: bx + bw/2, y: by + bh - 32, size: 13, font: fonts.bodyBold, color: C.parchment, align: "center" });
  drawText(p, `Pratyantar: ${d.dashaCurrent.praty}`, { x: bx + bw/2, y: by + bh - 46, size: 10, font: fonts.body, color: C.goldBright, align: "center" });
  drawText(p, `${d.dashaCurrent.from}  →  ${d.dashaCurrent.to}`, { x: bx + bw/2, y: by + bh - 60, size: 9, font: fonts.bodyItalic, color: C.parchment, align: "center" });

  // Mahadasha sequence (canonical 9-planet 120-year cycle)
  const seq: [string, number][] = [
    ["Ketu", 7], ["Venus", 20], ["Sun", 6], ["Moon", 10], ["Mars", 7],
    ["Rahu", 18], ["Jupiter", 16], ["Saturn", 19], ["Mercury", 17],
  ];
  drawText(p, "MAHADASHA SEQUENCE", { x: W/2, y: by - 18, size: 9, font: fonts.displayBold, color: C.goldBright, align: "center" });

  let y = by - 38;
  const rowH = 16;
  seq.forEach(([nm, yrs], i) => {
    const isCurrent = d.dashaCurrent.maha && nm.toLowerCase().includes(d.dashaCurrent.maha.toLowerCase());
    if (isCurrent) p.drawRectangle({ x: MARGIN + 6*MM, y: y - 4, width: W - 2*MARGIN - 12*MM, height: rowH - 2, color: C.crimson });
    drawText(p, nm.replace(/^[^\sA-Za-z]+\s*/, ""), { x: MARGIN + 12*MM, y: y, size: 9.5, font: fonts.bodyBold, color: isCurrent ? C.parchment : C.parchment });
    drawText(p, `${yrs} years`, { x: MARGIN + 70*MM, y: y, size: 9, font: fonts.body, color: C.goldBright });
    if (isCurrent) drawText(p, "<-- CURRENT MAHADASHA", { x: W - MARGIN - 12*MM, y: y, size: 8, font: fonts.bodyItalic, color: C.parchment, align: "right" });
    y -= rowH;
  });

  pageNumber(p, 6, fonts.display, true);
}

function pageYogas(p: PDFPage, d: Native, fonts: Fonts) {
  pageBgParchment(p);
  borderFrame(p);
  cornerMarks(p);

  drawMixed(p, "YOGAS — योग संयोग", { x: W/2, y: H - 28*MM, size: 16, latin: fonts.displayBold, deva: fonts.sanBold, color: C.ink, align: "center" });
  drawText(p, "Active Planetary Combinations in Your Chart", { x: W/2, y: H - 37*MM, size: 10, font: fonts.bodyItalic, color: C.saffron, align: "center" });
  doubleLine(p, H - 41*MM);

  let y = H - 56*MM;
  if (!d.yogas.length) {
    drawText(p, "No major yogas detected in this configuration.", { x: W/2, y, size: 11, font: fonts.bodyItalic, color: C.inkLight, align: "center" });
  }
  d.yogas.forEach((yg, i) => {
    p.drawRectangle({ x: MARGIN + 6*MM, y: y - 60, width: W - 2*MARGIN - 12*MM, height: 70, color: rgb(0xFD/255, 0xF7/255, 0xEE/255), borderColor: C.gold, borderWidth: 0.5 });
    drawText(p, `*  ${yg.name}`, { x: MARGIN + 12*MM, y: y - 4, size: 12, font: fonts.bodyBold, color: C.crimson });
    if (yg.sanskrit) drawText(p, yg.sanskrit, { x: W - MARGIN - 12*MM, y: y - 4, size: 11, font: fonts.san, color: C.saffron, align: "right" });
    drawText(p, yg.strength, { x: MARGIN + 12*MM, y: y - 16, size: 7.5, font: fonts.display, color: C.saffron });
    const desc = wrapLines(yg.description, fonts.body, 9, W - 2*MARGIN - 24*MM);
    desc.slice(0, 4).forEach((ln, li) => drawText(p, ln, { x: MARGIN + 12*MM, y: y - 28 - li * 11, size: 9, font: fonts.body, color: C.ink }));
    y -= 80;
    if (y < 80) return;
  });

  pageNumber(p, 7, fonts.display, false);
}

function pageMantras(p: PDFPage, _d: Native, fonts: Fonts) {
  pageBgDark(p);
  borderFrame(p);
  cornerMarks(p);

  drawMixed(p, "NAVAGRAHA MANTRAS — नवग्रह मंत्र", { x: W/2, y: H - 28*MM, size: 14, latin: fonts.displayBold, deva: fonts.sanBold, color: C.goldBright, align: "center" });
  drawText(p, "Beej (Seed) Mantras of the Nine Planetary Deities", { x: W/2, y: H - 36*MM, size: 10, font: fonts.bodyItalic, color: C.saffron, align: "center" });
  doubleLine(p, H - 40*MM);

  let y = H - 54*MM;
  PLANET_BEEJ.forEach((pl) => {
    drawText(p, pl.name.toUpperCase(), { x: MARGIN + 12*MM, y, size: 9, font: fonts.displayBold, color: C.saffron });
    drawText(p, pl.translit, { x: W - MARGIN - 12*MM, y, size: 7.5, font: fonts.bodyItalic, color: C.parchment, align: "right" });
    drawText(p, pl.sanskrit, { x: W/2, y: y - 12, size: 11, font: fonts.san, color: C.goldBright, align: "center" });
    drawText(p, pl.mantra, { x: W/2, y: y - 22, size: 8.5, font: fonts.bodyItalic, color: C.parchment, align: "center" });
    y -= 38;
  });

  pageNumber(p, 8, fonts.display, true);
}

function pageClosing(p: PDFPage, d: Native, fonts: Fonts) {
  pageBgDark(p);
  borderFrame(p);
  cornerMarks(p);

  drawText(p, "॥ शान्ति मंत्र ॥", { x: W/2, y: H - 40*MM, size: 18, font: fonts.sanBold, color: C.goldBright, align: "center" });
  drawText(p, "SHANTI MANTRA — INVOCATION OF PEACE", { x: W/2, y: H - 50*MM, size: 8, font: fonts.display, color: C.saffron, align: "center" });
  ornamentDivider(p, H - 56*MM, W/2, 200);

  const verses = [
    "ॐ सर्वे भवन्तु सुखिनः ।",
    "सर्वे सन्तु निरामयाः ।",
    "सर्वे भद्राणि पश्यन्तु ।",
    "मा कश्चिद् दुःख भाग्भवेत् ॥",
  ];
  const en = [
    "May all beings be happy.",
    "May all be free from illness.",
    "May all see what is auspicious.",
    "May no one suffer in any way.",
  ];
  let y = H - 80*MM;
  verses.forEach((v, i) => {
    drawText(p, v, { x: W/2, y, size: 13, font: fonts.san, color: C.parchment, align: "center" });
    drawText(p, en[i], { x: W/2, y: y - 12, size: 9.5, font: fonts.bodyItalic, color: C.goldBright, align: "center" });
    y -= 28;
  });

  ornamentDivider(p, y - 10, W/2, 200);
  drawText(p, "॥ ॐ शान्तिः शान्तिः शान्तिः ॥", { x: W/2, y: y - 26, size: 14, font: fonts.sanBold, color: C.goldBright, align: "center" });
  drawText(p, "Om Shantih Shantih Shantih", { x: W/2, y: y - 38, size: 9, font: fonts.bodyItalic, color: C.parchment, align: "center" });

  // Branded sign-off
  drawText(p, `Prepared with reverence for ${d.name}`, { x: W/2, y: 60*MM, size: 10, font: fonts.bodyItalic, color: C.parchment, align: "center" });
  drawText(p, "KUNDALI · kundali.app", { x: W/2, y: 50*MM, size: 9, font: fonts.displayBold, color: C.goldBright, align: "center" });
  drawText(p, "YOUR STARS · YOUR STORY · YOUR DHARMA", { x: W/2, y: 42*MM, size: 7, font: fonts.display, color: C.saffron, align: "center" });

  pageNumber(p, 9, fonts.display, true);
}

// ─── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    let chartId: string | null = null;
    try {
      const body = await req.json();
      if (body?.chart_id) chartId = body.chart_id as string;
    } catch { /* no body */ }

    // Tier check (server-side authoritative)
    const { data: profile } = await supabase
      .from("profiles").select("subscription_tier").eq("user_id", userId).maybeSingle();
    const tier = (profile?.subscription_tier || "free") as string;
    if (tier !== "elite") {
      return new Response(JSON.stringify({ error: "elite_required", message: "Sacred Kundali PDF is an Elite ritual." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve chart
    let chartRow: any = null;
    if (chartId) {
      const { data } = await supabase.from("birth_charts")
        .select("id, full_name, date_of_birth, birth_time, birthplace, latitude, longitude, chart_data")
        .eq("id", chartId).eq("user_id", userId).maybeSingle();
      chartRow = data;
    }
    if (!chartRow) {
      const { data } = await supabase.from("birth_charts")
        .select("id, full_name, date_of_birth, birth_time, birthplace, latitude, longitude, chart_data")
        .eq("user_id", userId).eq("is_primary", true).maybeSingle();
      chartRow = data;
    }
    if (!chartRow?.chart_data) {
      return new Response(JSON.stringify({ error: "no_chart", message: "No birth chart found. Generate one first." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const native = shapeNative(chartRow.chart_data, chartRow);

    // Build PDF
    const fb = await loadFontBytes();
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit as any);
    const fonts: Fonts = {
      body:        await pdf.embedFont(fb.body, { subset: true }),
      bodyBold:    await pdf.embedFont(fb.bodyBold, { subset: true }),
      bodyItalic:  await pdf.embedFont(fb.bodyItalic, { subset: true }),
      display:     await pdf.embedFont(fb.body, { subset: true }),
      displayBold: await pdf.embedFont(fb.bodyBold, { subset: true }),
      mono:        await pdf.embedFont(StandardFonts.Courier),
      san:         await pdf.embedFont(fb.devanagari, { subset: true }),
      sanBold:     await pdf.embedFont(fb.devanagariBold, { subset: true }),
    };

    const pages = [pageCover, pageInvocation, pageBirthDetails, pageKundaliChart, pagePlanets, pageDasha, pageYogas, pageMantras, pageClosing];
    for (const renderer of pages) {
      const page = pdf.addPage([W, H]);
      renderer(page, native, fonts);
    }

    const bytes = await pdf.save();
    const firstName = (native.name || "Kundali").trim().split(/\s+/)[0].replace(/[^A-Za-z0-9]+/g, "") || "Kundali";
    const dateTag = (chartRow.date_of_birth || "").replace(/-/g, "");
    const filename = `Kundali-${firstName}-${dateTag || "chart"}.pdf`;

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[generate-kundali-pdf] error", err);
    return new Response(JSON.stringify({ error: "internal", message: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
