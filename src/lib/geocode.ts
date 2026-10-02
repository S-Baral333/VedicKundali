/**
 * Place lookup for the birth-place step.
 *
 * Onboarding used to geocode only at save time and swallow every failure, so a
 * mistyped city left latitude/longitude null — and generate-chart rejects a
 * null coordinate outright. Looking the place up while the person is still
 * typing it, and making them confirm the result, is what closes that hole.
 *
 * Nominatim's usage policy forbids per-keystroke autocomplete, so callers
 * search on an explicit action (Enter or the Find button), never on change.
 */

export interface ResolvedPlace {
  /** What gets stored as `profiles.birthplace`: place, region, country. */
  label: string;
  /** The full string the geocoder returned, for telling namesakes apart. */
  fullName: string;
  lat: number;
  lng: number;
}

interface NominatimHit {
  display_name?: string;
  lat?: string;
  lon?: string;
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 8000;

/**
 * "Kathmandu, Kathmandu Metropolitan City, Bagmati Province, 44600, Nepal"
 * → "Kathmandu, Bagmati Province, Nepal".
 *
 * Keeps the place, the nearest region that isn't a postal code, and the
 * country — enough to tell two Rampurs apart without a paragraph.
 */
export function shortPlaceLabel(displayName: string): string {
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(", ");
  const first = parts[0];
  const country = parts[parts.length - 1];
  const region = parts.slice(1, -1).reverse().find((p) => !/\d/.test(p));
  return region ? `${first}, ${region}, ${country}` : `${first}, ${country}`;
}

export async function searchPlaces(
  query: string,
  lang: string,
  signal?: AbortSignal
): Promise<ResolvedPlace[]> {
  const q = query.trim();
  if (!q) return [];

  // Our own timeout, folded together with the caller's abort.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const url = `${ENDPOINT}?format=jsonv2&limit=4&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const hits = (await res.json()) as NominatimHit[];

    const seen = new Set<string>();
    const out: ResolvedPlace[] = [];
    for (const h of hits) {
      const lat = parseFloat(h.lat ?? "");
      const lng = parseFloat(h.lon ?? "");
      if (!h.display_name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const label = shortPlaceLabel(h.display_name);
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({ label, fullName: h.display_name, lat, lng });
    }
    return out;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
