import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Gem, BookOpen, Flame, HandCoins, Sparkles, Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import MantraInfo from "@/components/MantraInfo";
import { planetLabel } from "@/lib/panchanga-i18n";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface GemstoneSpec {
  primary: string; sanskrit: string; substitute: string;
  metal: string; finger: string; day: string; hora: string;
  carat_min: number; carat_max: number;
  mantra_for_energizing: string; japa_count: number;
  caution?: string;
}
interface MantraSpec { name: string; beej: string; long: string; japa_daily: number; japa_total: number; best_time: string; mala: string; }
interface FastingSpec { vara: string; tithi: string; food: string; abstain: string; duration: string; }
interface DaanSpec { items: string[]; recipient: string; day: string; time: string; quantity_guidance: string; }
interface Affliction { planet: string; severity: number; reasons: string[]; is_dasha_lord: boolean; is_lagna_lord: boolean; }
interface Prescription {
  planet: string;
  affliction: Affliction;
  gemstone: GemstoneSpec;
  mantra: MantraSpec;
  fasting: FastingSpec;
  daan: DaanSpec;
  rationale: string;
  priority: "primary" | "secondary" | "supportive";
}
interface PrescriptionResult {
  chart_id: string;
  tier: string;
  generated_at: string;
  dasha_lord: string;
  afflictions_summary: Affliction[];
  prescriptions: Prescription[];
  ai_synthesis: string;
  ai_skipped?: boolean;
  disclaimer: string;
  from_cache?: boolean;
}

const PRIORITY_LABEL: Record<string, { labelKey: string; label: string; color: string }> = {
  primary:    { labelKey: "ui.prescriptionRemedies.priorityPrimary", label: "Primary Remedy",    color: "bg-primary/15 text-primary border-primary/40" },
  secondary:  { labelKey: "ui.prescriptionRemedies.prioritySecondary", label: "Secondary Remedy",  color: "bg-secondary/30 text-foreground border-border" },
  supportive: { labelKey: "ui.prescriptionRemedies.prioritySupportive", label: "Supportive Remedy", color: "bg-muted/50 text-muted-foreground border-border/50" },
};

const PLANET_EMOJI: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "🔴", Mercury: "🟢", Jupiter: "🟡",
  Venus: "💎", Saturn: "🪐", Rahu: "🐍", Ketu: "🔥",
};

/** Row label (used as identifier) → translation key. */
const ROW_KEYS: Record<string, string> = {
  Stone: "rowStone", Substitute: "rowSubstitute", Weight: "rowWeight", Metal: "rowMetal",
  Finger: "rowFinger", "First wear": "rowFirstWear", "Energizing japa": "rowEnergizingJapa",
  Beej: "rowBeej", Vedic: "rowVedic", "Daily count": "rowDailyCount", "Total anushthana": "rowTotalAnushthana",
  "Best time": "rowBestTime", Mala: "rowMala", Day: "rowDay", Tithi: "rowTithi",
  "Permitted food": "rowPermittedFood", Avoid: "rowAvoid", Duration: "rowDuration",
  Items: "rowItems", Quantity: "rowQuantity", Recipient: "rowRecipient", Time: "rowTime",
};

interface Props {
  chartId: string;
  tier: string;
}

export default function PrescriptionRemedies({ chartId, tier }: Props) {
  const [data, setData] = useState<PrescriptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { t } = useTranslation();

  async function generate(force = false) {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: invokeErr } = await supabase.functions.invoke("generate-remedies", {
        body: withLanguage({ chart_id: chartId, force_refresh: force }),
      });
      if (invokeErr) throw invokeErr;
      if ((res as any)?.error) throw new Error((res as any).message || (res as any).error);
      setData(res as PrescriptionResult);
      if (force) toast({ title: t("pages:ui.prescriptionRemedies.refreshed", "Prescription refreshed"), description: t("pages:ui.prescriptionRemedies.refreshedDesc", "Fresh classical analysis generated.") });
    } catch (e: any) {
      const msg = e?.message || t("pages:ui.prescriptionRemedies.genericError", "Could not generate prescription.");
      setError(msg);
      toast({ title: t("pages:ui.prescriptionRemedies.unavailable", "Prescription unavailable"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // Initial state — premium user but hasn't generated yet
  if (!data && !loading) {
    return (
      <Card className="!border-[rgba(201,168,76,0.35)] bg-gradient-to-br from-card via-card to-primary/5 m-sheet-card">
        <CardContent className="p-8 text-center space-y-5">
          <div className="inline-flex relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary/30 to-primary/10 p-5 rounded-full border border-primary/40">
              <Sparkles className="h-9 w-9 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-foreground mb-2">
              {t("pages:ui.prescriptionRemedies.heading", "Prescription-Grade Remedies")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("pages:ui.prescriptionRemedies.intro", "Your personalized classical prescription synthesizing dasha lord, afflictions, and shadbala — with exact gemstone carats, mantra japa counts, fasting tithis, and daan recipients.")}
            </p>
          </div>
          <Button size="lg" onClick={() => generate(false)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {t("pages:ui.prescriptionRemedies.generate", "Generate My Prescription")}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="m-sheet-card">
        <CardContent className="p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("pages:ui.prescriptionRemedies.loading", "Synthesizing classical prescription from your natal chart…")}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {t("pages:ui.prescriptionRemedies.loadingSub", "Analyzing dignities, dasha lord, shadbala, and dusthana placements")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Header with tier badge + refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-primary/30 to-primary/10 text-primary border-primary/40 gap-1">
            <Crown className="h-3 w-3" /> {tier === "elite" ? t("pages:ui.prescriptionRemedies.elitePrescription", "Elite Prescription") : t("pages:ui.prescriptionRemedies.premiumPrescription", "Premium Prescription")}
          </Badge>
          {data.dasha_lord && (
            <Badge variant="outline" className="text-xs">
              {PLANET_EMOJI[data.dasha_lord] || "🪐"} {t("pages:remediesPage.badge.dashaLord", "Dasha Lord")}: {planetLabel(t, data.dasha_lord)}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("pages:ui.prescriptionRemedies.resynthesize", "Re-synthesize")}
        </Button>
      </div>

      {/* AI synthesis */}
      {data.ai_synthesis ? (
        <Card className="!border-[rgba(201,168,76,0.32)] m-sheet-card">
          <CardContent className="p-5">
            <p className="text-sm leading-relaxed font-serif text-foreground italic">
              {data.ai_synthesis}
            </p>
          </CardContent>
        </Card>
      ) : data.ai_skipped ? (
        <p className="text-xs text-muted-foreground/60 italic">{t("pages:ui.prescriptionRemedies.aiSkipped", "AI synthesis unavailable — configure AI_GATEWAY_API_KEY to enable.")}</p>
      ) : null}

      {/* Prescriptions */}
      {data.prescriptions.map((p) => {
        const isOpen = expanded[p.planet] ?? p.priority === "primary";
        const meta = PRIORITY_LABEL[p.priority];
        return (
          <Card key={p.planet} className={`m-sheet-card ${p.priority === "primary" ? "!border-[rgba(201,168,76,0.5)] shadow-lg" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                    {t("pages:" + meta.labelKey, meta.label)}
                  </Badge>
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <span className="text-2xl">{PLANET_EMOJI[p.planet] || "🪐"}</span>
                    {planetLabel(t, p.planet)}
                    {p.affliction.is_dasha_lord && (
                      <Badge variant="secondary" className="text-[10px]">{t("pages:ui.prescriptionRemedies.activeDasha", "Active Dasha")}</Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.rationale}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExpanded(s => ({ ...s, [p.planet]: !isOpen }))}
                  className="shrink-0"
                  aria-label={isOpen ? t("pages:ui.prescriptionRemedies.collapse", "Collapse") : t("pages:ui.prescriptionRemedies.expand", "Expand")}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-4 pt-0">
                {/* Gemstone */}
                <PrescriptionBlock
                  icon={<Gem className="h-4 w-4 text-primary" />}
                  title={t("pages:ui.prescriptionRemedies.gemstone", "Gemstone")}
                  rows={[
                    ["Stone", `${p.gemstone.primary} (${p.gemstone.sanskrit})`],
                    ["Substitute", p.gemstone.substitute],
                    ["Weight", t("pages:ui.prescriptionRemedies.carats", "{{min}}–{{max}} carats", { min: p.gemstone.carat_min, max: p.gemstone.carat_max })],
                    ["Metal", p.gemstone.metal],
                    ["Finger", t("pages:ui.prescriptionRemedies.fingerHand", "{{finger}} finger, right hand", { finger: p.gemstone.finger })],
                    ["First wear", t("pages:ui.prescriptionRemedies.dayDuringHora", "{{day}} during {{hora}}", { day: p.gemstone.day, hora: p.gemstone.hora })],
                    ["Energizing japa", t("pages:ui.prescriptionRemedies.repetitionsOf", "{{n}} repetitions of: {{mantra}}", { n: p.gemstone.japa_count.toLocaleString(), mantra: p.gemstone.mantra_for_energizing })],
                  ]}
                />
                {p.gemstone.caution && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{p.gemstone.caution}</p>
                  </div>
                )}

                <Separator className="opacity-30" />

                {/* Mantra */}
                <PrescriptionBlock
                  icon={<BookOpen className="h-4 w-4 text-primary" />}
                  title={t("pages:ui.prescriptionRemedies.mantraTitle", "Mantra — {{name}}", { name: p.mantra.name })}
                  rows={[
                    ["Beej", p.mantra.beej],
                    ["Vedic", p.mantra.long],
                    ["Daily count", t("pages:ui.prescriptionRemedies.dailyMala", "{{count}} (1 mala)", { count: p.mantra.japa_daily })],
                    ["Total anushthana", t("pages:ui.prescriptionRemedies.repetitions", "{{n}} repetitions", { n: p.mantra.japa_total.toLocaleString() })],
                    ["Best time", p.mantra.best_time],
                    ["Mala", p.mantra.mala],
                  ]}
                  highlight={["Beej", "Vedic"]}
                  mantraRows={{
                    Beej: { meaningKey: `${p.planet.toLowerCase()}.beej` },
                    Vedic: { meaningKey: `${p.planet.toLowerCase()}.vedic` },
                  }}
                />


                <Separator className="opacity-30" />

                {/* Fasting */}
                <PrescriptionBlock
                  icon={<Flame className="h-4 w-4 text-primary" />}
                  title={t("pages:ui.prescriptionRemedies.fasting", "Fasting (Vrata)")}
                  rows={[
                    ["Day", p.fasting.vara],
                    ["Tithi", p.fasting.tithi],
                    ["Permitted food", p.fasting.food],
                    ["Avoid", p.fasting.abstain],
                    ["Duration", p.fasting.duration],
                  ]}
                />

                <Separator className="opacity-30" />

                {/* Daan */}
                <PrescriptionBlock
                  icon={<HandCoins className="h-4 w-4 text-primary" />}
                  title={t("pages:ui.prescriptionRemedies.daan", "Daan (Charity)")}
                  rows={[
                    ["Items", p.daan.items.join(", ")],
                    ["Quantity", p.daan.quantity_guidance],
                    ["Recipient", p.daan.recipient],
                    ["Day", p.daan.day],
                    ["Time", p.daan.time],
                  ]}
                />
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground/70 text-center px-4 leading-relaxed">
        {data.disclaimer}
      </p>
    </div>
  );
}

function PrescriptionBlock({
  icon, title, rows, highlight = [], mantraRows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: [string, string][];
  highlight?: string[];
  /** Map of row label → mantra metadata. If provided, the row's value renders with a MantraInfo ⓘ icon. */
  mantraRows?: Record<string, { meaningKey?: string }>;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      {/* Phones drop the indent and narrow the label column: the values are
          long (carats, japa counts, whole mantras) and 110px + pl-6 crowds them. */}
      <div className="space-y-1.5 pl-0 sm:pl-6">
        {rows.map(([k, v]) => {
          const mantraMeta = mantraRows?.[k];
          return (
            <div key={k} className="grid grid-cols-[88px_1fr] sm:grid-cols-[110px_1fr] gap-2 text-xs">
              <span className="text-muted-foreground">{ROW_KEYS[k] ? t(`pages:ui.prescriptionRemedies.${ROW_KEYS[k]}`, k) : k}</span>
              {mantraMeta ? (
                <MantraInfo mantra={v} meaningKey={mantraMeta.meaningKey} />
              ) : (
                <span className={highlight.includes(k) ? "font-serif italic text-foreground" : "text-foreground"}>
                  {v}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
