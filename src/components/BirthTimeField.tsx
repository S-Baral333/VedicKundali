import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import { BIRTH_PERIODS, precisionNote, type BirthTimeAccuracy } from "@/lib/birth-time";

interface Props {
  accuracy: BirthTimeAccuracy;
  time: string;
  period: string;
  onChange: (next: { accuracy: BirthTimeAccuracy; time: string; period: string }) => void;
  /** The note explains what the precision costs; onboarding shows it only once chosen. */
  showNote?: boolean;
  labelKey?: string;
  labelFallback?: string;
}

/**
 * Birth time, with an honest fallback when it is not known.
 *
 * Shared by onboarding and the profile so the two cannot drift — they were
 * duplicating this markup, and the wording here is the part that has to stay
 * consistent, because it is what tells someone their ascendant is a guess.
 *
 * The "don't know" path exists because generate-chart rejects a missing
 * birth_time outright, so the old skip checkbox produced accounts that could
 * never cast a chart at all.
 */
export default function BirthTimeField({
  accuracy,
  time,
  period,
  onChange,
  showNote = true,
  labelKey = "pages:ui.profilePage.birthTime",
  labelFallback = "Birth Time",
}: Props) {
  const { t } = useTranslation();
  const note = precisionNote(accuracy);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="birthTime">{t(labelKey, labelFallback)}</Label>
        <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {t("pages:ui.birthTime.dontKnow", "I don't know it")}
          </span>
          <Switch
            checked={accuracy !== "exact"}
            onCheckedChange={(checked) =>
              onChange({
                accuracy: checked ? (period ? "period" : "unknown") : "exact",
                time: checked ? "" : time,
                period,
              })
            }
          />
        </label>
      </div>

      {accuracy === "exact" ? (
        <Input
          id="birthTime"
          type="time"
          value={time}
          onChange={(e) => onChange({ accuracy: "exact", time: e.target.value, period })}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {t("pages:ui.birthTime.pickPeriod", "Roughly when were you born?")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BIRTH_PERIODS.map((bp) => {
              const active = period === bp.key;
              return (
                <button
                  key={bp.key}
                  type="button"
                  onClick={() => onChange({ accuracy: "period", time: "", period: bp.key })}
                  className={`rounded-lg border px-3 py-2 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border/40 bg-card/40 hover:border-primary/30"
                  }`}
                >
                  <span className="block text-[13px] text-foreground">
                    {t(`pages:ui.birthTime.${bp.labelKey}`, bp.label)}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {bp.sanskrit} · {bp.from}–{bp.to}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showNote && note && (
        <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-card/40 p-2.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t(`pages:ui.birthTime.note_${accuracy}`, note)}
          </p>
        </div>
      )}
    </div>
  );
}
