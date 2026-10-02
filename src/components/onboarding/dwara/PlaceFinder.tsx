import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Search } from "lucide-react";
import { searchPlaces, type ResolvedPlace } from "@/lib/geocode";

interface PlaceFinderProps {
  place: ResolvedPlace | null;
  onPlace: (place: ResolvedPlace | null) => void;
}

type Status = "idle" | "searching" | "results" | "none" | "error";

/**
 * Find the birth place and confirm it. The point of confirming — rather than
 * trusting whatever was typed — is that latitude and longitude are what the
 * chart is cast from, and a place that never resolved used to mean an account
 * that could not cast one.
 */
export default function PlaceFinder({ place, onPlace }: PlaceFinderProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0];
  const [query, setQuery] = useState(place?.label ?? "");
  const [results, setResults] = useState<ResolvedPlace[]>(place ? [place] : []);
  const [status, setStatus] = useState<Status>(place ? "results" : "idle");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const find = async () => {
    const q = query.trim();
    if (!q) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    onPlace(null);
    setStatus("searching");
    try {
      const found = await searchPlaces(q, lang, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setResults(found);
      if (found.length === 0) {
        setStatus("none");
      } else {
        setStatus("results");
        // One answer is the answer — the globe turns to it, and it can still be changed.
        if (found.length === 1) onPlace(found[0]);
      }
    } catch {
      if (ctrl.signal.aborted && abort.current !== ctrl) return;
      setResults([]);
      setStatus("error");
    }
  };

  return (
    <div className="dw-place">
      <div className="dw-place-row">
        <input
          className="dw-input"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          aria-label={t("pages:ui.profilePage.birthplace", "Birthplace")}
          placeholder={t("onboarding:placeholderBirthplace")}
          value={query}
          maxLength={80}
          onChange={(e) => {
            setQuery(e.target.value);
            if (place) onPlace(null);
            if (status !== "searching") setStatus("idle");
            setResults([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void find();
            }
          }}
        />
        <button
          type="button"
          className="dw-find"
          onClick={() => void find()}
          disabled={!query.trim() || status === "searching"}
        >
          {status === "searching" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          <span>{t("onboarding:dwara.placeFind")}</span>
        </button>
      </div>

      <div className="dw-place-status" aria-live="polite">
        {status === "searching" && <p>{t("onboarding:dwara.placeSearching")}</p>}
        {status === "none" && <p>{t("onboarding:dwara.placeNone")}</p>}
        {status === "error" && <p>{t("onboarding:dwara.placeError")}</p>}
        {status === "results" && results.length > 1 && <p>{t("onboarding:dwara.placePick")}</p>}
      </div>

      {results.length > 0 && (
        <div className="dw-results" role="radiogroup" aria-label={t("onboarding:dwara.placePick")}>
          {results.map((r) => {
            const active = place?.lat === r.lat && place?.lng === r.lng;
            return (
              <button
                key={`${r.lat},${r.lng}`}
                type="button"
                role="radio"
                aria-checked={active}
                className="dw-result"
                data-active={active}
                onClick={() => onPlace(r)}
              >
                <span className="dw-result-label">{r.label}</span>
                {r.fullName !== r.label && <span className="dw-result-full">{r.fullName}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
