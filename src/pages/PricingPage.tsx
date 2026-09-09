import { Check, X, Sparkles, Crown, Zap, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "react-router-dom";
import CosmicBackground from "@/components/CosmicBackground";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";
import { TIERS, type Tier } from "@/lib/tiers";

const VISIBLE: Tier[] = ["darshana", "sadhaka", "grihastha"]; // Jyotisha held for v2

const TIER_ICONS: Record<Tier, typeof Sparkles> = {
  darshana: Sparkles, sadhaka: Sparkles, grihastha: Crown, jyotisha: Zap,
};

interface FeatureRow {
  name: string;
  values: Record<Tier, string | boolean>;
}

const FEATURES: FeatureRow[] = [
  { name: "birthCharts",         values: { darshana: "1",          sadhaka: "3",          grihastha: "7",          jyotisha: "Unlimited" } },
  { name: "fullVedicReading",    values: { darshana: "Preview",    sadhaka: true,         grihastha: true,         jyotisha: true } },
  { name: "dailyHoroscope",      values: { darshana: true,         sadhaka: true,         grihastha: true,         jyotisha: true } },
  { name: "guruQuestions",       values: { darshana: "3 preview",  sadhaka: "30",         grihastha: "50",         jyotisha: "Unlimited" } },
  { name: "dreamInterpretations",values: { darshana: "3 / mo",     sadhaka: "20 / mo",    grihastha: "50 / mo",    jyotisha: "Unlimited" } },
  { name: "sacredKundaliPdf",    values: { darshana: false,        sadhaka: true,         grihastha: true,         jyotisha: "White-label" } },
  { name: "destinyTimeline",     values: { darshana: false,        sadhaka: true,         grihastha: true,         jyotisha: true } },
  { name: "muhurtaCalculator",   values: { darshana: false,        sadhaka: true,         grihastha: true,         jyotisha: true } },
  { name: "navamsha",            values: { darshana: false,        sadhaka: true,         grihastha: true,         jyotisha: true } },
  { name: "allDivisional",       values: { darshana: false,        sadhaka: false,        grihastha: true,         jyotisha: true } },
  { name: "kundaliMilan",        values: { darshana: false,        sadhaka: false,        grihastha: true,         jyotisha: true } },
  { name: "sadeSatiTracker",     values: { darshana: false,        sadhaka: false,        grihastha: true,         jyotisha: true } },
  { name: "transitOverlays",     values: { darshana: false,        sadhaka: false,        grihastha: true,         jyotisha: true } },
  { name: "hindiGuru",           values: { darshana: false,        sadhaka: false,        grihastha: true,         jyotisha: true } },
];

function Cell({ v }: { v: string | boolean }) {
  if (typeof v === "string") return <span className="text-sm font-medium">{v}</span>;
  return v ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
}

export default function PricingPage() {
  const { tier } = useSubscription();
  const { t } = useTranslation("pages");
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      <SacredPageShell
        leftRail={<PageNavRail title="Pricing" hint="Choose the cosmic path that fits your journey." showChartSwitcher={false} sections={[{ id: "tiers", label: "Tiers" }, { id: "compare", label: "Compare" }, { id: "faq", label: "FAQ" }]} />}
        rightRail={<CosmicFieldCard />}
        className="space-y-12"
      >
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t("pricing.backToDashboard")}
        </Link>

        {/* Header */}
        <section id="tiers" className="text-center space-y-4">
          <h1 className="font-serif text-4xl md:text-5xl text-primary">{t("pricing.heading")}</h1>
          <p className="italic text-muted-foreground">{t("pricing.subheading")}</p>

          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-primary/20 bg-card/40 backdrop-blur">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >{t("pricing.monthly")}</button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all flex items-center gap-2 ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >{t("pricing.annual")} <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t("pricing.saveBadge")}</Badge></button>
          </div>
        </section>

        {/* Tier cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {VISIBLE.map((tierKey) => {
            const cfg = TIERS[tierKey];
            const Icon = TIER_ICONS[tierKey];
            const isCurrent = tier === tierKey;
            const isPopular = tierKey === "grihastha";
            const price = annual ? cfg.priceAnnualAud / 12 : cfg.priceMonthlyAud;

            return (
              <Card
                key={tierKey}
                className={`relative ${isPopular ? "border-primary/50 shadow-xl shadow-primary/10" : "border-border/60"}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] uppercase tracking-widest">
                    {t("pricing.mostPopular")}
                  </div>
                )}
                <CardHeader className="text-center pb-3">
                  <div className="mx-auto mb-2 inline-flex p-2.5 rounded-full bg-primary/10 border border-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-2xl">{cfg.sanskrit}</CardTitle>
                  <div className="text-lg text-primary/90 font-serif">{cfg.devanagari}</div>
                  <p className="text-xs text-muted-foreground italic">{cfg.meaning}</p>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                  <div>
                    <div className="text-4xl font-serif text-primary">
                      {price === 0 ? t("pricing.free") : `AUD $${price.toFixed(2)}`}
                    </div>
                    {price > 0 && <div className="text-xs text-muted-foreground">{annual ? t("pricing.perMonthBilledYearly") : t("pricing.perMonth")}</div>}
                    {annual && cfg.priceAnnualAud > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-1">${cfg.priceAnnualAud}/yr</div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    disabled={isCurrent || price > 0}
                    title={price > 0 ? "Payments open soon — admin can grant access in the meantime" : undefined}
                  >
                    {isCurrent ? t("pricing.currentPlan") : price === 0 ? t("pricing.startFree") : t("pricing.paymentsSoon")}
                  </Button>
                  <ul className="text-left text-sm space-y-2 pt-2">
                    {(tierKey === "darshana"
                      ? ["1 birth chart", "Daily horoscope", "Reading preview", "3 Guru questions to try"]
                      : tierKey === "sadhaka"
                      ? ["Up to 3 charts", "Full Vedic reading", "Destiny Timeline & Muhurta", "30 Guru / 20 dreams per month", "Sacred Kundali PDF"]
                      : ["Up to 7 charts", "All divisional charts", "Kundali Milan & Sade Sati", "50 Guru / 50 dreams per month", "Hindi Guru, transit overlays"]
                    ).map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Comparison */}
        <section id="compare" className="space-y-4">
          <h2 className="font-serif text-2xl text-center text-primary">{t("pricing.comparisonTitle")}</h2>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40 backdrop-blur">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left p-3 font-medium text-muted-foreground">{t("pricing.featureColLabel")}</th>
                  {VISIBLE.map((tierKey) => (
                    <th key={tierKey} className="text-center p-3 font-serif text-primary">{TIERS[tierKey].sanskrit}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row) => (
                  <tr key={row.name} className="border-b border-border/30 last:border-0">
                    <td className="p-3">{t(`pricing.features.${row.name}`)}</td>
                    {VISIBLE.map((tierKey) => (
                      <td key={tierKey} className="text-center p-3">
                        <Cell v={row.values[tierKey]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-muted-foreground italic">
            {t("pricing.jyotishaNote")}
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="space-y-3 max-w-2xl mx-auto">
          <h2 className="font-serif text-2xl text-center text-primary mb-4">{t("pricing.faqTitle")}</h2>
          {(["1","2","3","4"] as const).map((n) => {
            const q = t(`pricing.faq.q${n}`);
            const a = t(`pricing.faq.a${n}`);
            return (
              <details key={n} className="rounded-lg border border-border/60 bg-card/40 backdrop-blur p-4 group">
                <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
                  {q}<span className="text-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{a}</p>
              </details>
            );
          })}
        </section>

        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            {t("pricing.faqFreeNote")}
          </p>
        </div>
      </SacredPageShell>
    </div>
  );
}
