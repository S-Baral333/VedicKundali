import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useActiveChart } from "@/hooks/useActiveChart";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import ReadingAsChip from "@/components/ReadingAsChip";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Gem, BookOpen, Flame, Loader2, Star, Crown, Lock } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import TwinkleText from "@/components/TwinkleText";
import PrescriptionRemedies from "@/components/PrescriptionRemedies";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";

interface Remedy {
  id: string;
  title: string;
  description: string;
  category: string;
  planet: string | null;
  mantra: string | null;
  gemstone: string | null;
  ritual: string | null;
}

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  mantra: BookOpen,
  gemstone: Gem,
  ritual: Flame,
  general: Sparkles,
};

const PLANET_EMOJI: Record<string, string> = {
  Sun: "☀️", Moon: "🌙", Mars: "♂️", Mercury: "☿️", Jupiter: "♃",
  Venus: "♀️", Saturn: "♄", Rahu: "🐍", Ketu: "🔥",
};

export default function RemediesPage() {
  const { t } = useTranslation("pages");
  const { user, isLoading: authLoading } = useAuth();
  const { activeChart } = useActiveChart();
  const { tier, isPremium, isLoading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [remedies, setRemedies] = useState<Remedy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashaLord, setDashaLord] = useState<string | null>(null);
  const [afflictedPlanets, setAfflictedPlanets] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"prescription" | "library">(isPremium ? "prescription" : "library");

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeChart?.id]);

  useEffect(() => {
    // Default premium users to prescription view once tier is known
    if (!subLoading && isPremium) setView("prescription");
  }, [subLoading, isPremium]);

  async function loadData() {
    setLoading(true);
    const remediesRes = await supabase.from("remedies").select("*");

    const chartData = activeChart?.chart_data as any;
    if (chartData) {
      setDashaLord(chartData.dasha?.maha_dasha || null);
      const weak = (chartData.planets || [])
        .filter((p: any) => p.dignity === "debilitated" || p.is_combust)
        .map((p: any) => p.name);
      setAfflictedPlanets(weak);
    } else {
      setDashaLord(null);
      setAfflictedPlanets([]);
    }

    setRemedies((remediesRes.data as Remedy[]) || []);
    setLoading(false);
  }

  if (authLoading) return <RemediesSkeleton />;
  if (!user) return <Navigate to="/login" replace />;

  // Sort: dasha lord remedies first, then afflicted planets, then rest
  const sorted = [...remedies].sort((a, b) => {
    const aScore = a.planet === dashaLord ? 3 : afflictedPlanets.includes(a.planet || "") ? 2 : 0;
    const bScore = b.planet === dashaLord ? 3 : afflictedPlanets.includes(b.planet || "") ? 2 : 0;
    return bScore - aScore;
  });

  const filtered = filter === "all" ? sorted : sorted.filter(r => r.category === filter || r.planet === filter);

  const categories = [...new Set(remedies.map(r => r.category))];
  const relevantPlanets = [dashaLord, ...afflictedPlanets].filter(Boolean) as string[];

  return (
    <SacredPageShell
      leftRail={<PageNavRail title={t("remediesPage.navTitle")} hint={t("remediesPage.navHint")} />}
      rightRail={<CosmicFieldCard />}
      className="space-y-6"
    >
      <CosmicBackground />

      <div className="relative z-10 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="h-6 w-6 text-primary" />
          <TwinkleText as="h1" intensity="aura" className="text-3xl font-serif font-bold text-foreground">
            {t("remediesPage.heading")}
          </TwinkleText>
        </div>
        <p className="text-muted-foreground text-sm">
          {view === "prescription"
            ? t("remediesPage.subheadingPrescription")
            : t("remediesPage.subheadingLibrary")}
        </p>
        <div className="mt-3"><ReadingAsChip /></div>
      </div>

      {/* Tab strip — Prescription (premium) vs Library (free) */}
      <div className="relative z-10 flex gap-2 p-1 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm w-fit animate-fade-in-up" style={{ animationDelay: "0.03s" }}>
        <button
          onClick={() => {
            if (!isPremium) { navigate("/pricing"); return; }
            setView("prescription");
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
            view === "prescription"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {isPremium ? <Crown className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {t("remediesPage.tab.prescription")}
        </button>
        <button
          onClick={() => setView("library")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
            view === "library"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("remediesPage.tab.library")}
        </button>
      </div>

      {/* PRESCRIPTION VIEW (Premium / Elite) */}
      {view === "prescription" && (
        <div className="relative z-10 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
          {!isPremium ? (
            <Card className="!border-[rgba(201,168,76,0.4)] bg-gradient-to-br from-card via-card to-primary/5">
              <CardContent className="p-8 text-center space-y-5">
                <div className="inline-flex relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative bg-gradient-to-br from-primary/30 to-primary/10 p-5 rounded-full border border-primary/40">
                    <Crown className="h-9 w-9 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                    {t("remediesPage.upsell.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {t("remediesPage.upsell.description")}
                  </p>
                </div>
                <ul className="text-left text-sm text-foreground space-y-2 max-w-sm mx-auto">
                  <li className="flex gap-2"><Gem className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t("remediesPage.upsell.feature1")}</li>
                  <li className="flex gap-2"><BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t("remediesPage.upsell.feature2")}</li>
                  <li className="flex gap-2"><Flame className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t("remediesPage.upsell.feature3")}</li>
                  <li className="flex gap-2"><Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t("remediesPage.upsell.feature4")}</li>
                </ul>
                <Button size="lg" onClick={() => navigate("/pricing")} className="gap-2">
                  <Crown className="h-4 w-4" />
                  {t("remediesPage.upsell.upgradeButton")}
                </Button>
              </CardContent>
            </Card>
          ) : !activeChart?.id ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                {t("remediesPage.prescription.noChart")}
              </CardContent>
            </Card>
          ) : (
            <PrescriptionRemedies chartId={activeChart.id} tier={tier} />
          )}
        </div>
      )}

      {/* LIBRARY VIEW (free + everyone) */}
      {view === "library" && (
        <>
          {/* Context badges */}
          {(dashaLord || afflictedPlanets.length > 0) && (
            <div className="flex flex-wrap gap-2 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
              {dashaLord && (
                <Badge variant="secondary" className="text-xs">
                  {PLANET_EMOJI[dashaLord] || "🪐"} {t("remediesPage.badge.dashaLord")}: {dashaLord}
                </Badge>
              )}
              {afflictedPlanets.map(p => (
                <Badge key={p} variant="outline" className="text-xs border-destructive/30 text-destructive">
                  {PLANET_EMOJI[p] || "⚠️"} {t("remediesPage.badge.afflicted")}: {p}
                </Badge>
              ))}
            </div>
          )}

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <Badge
              variant={filter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("all")}
            >
              {t("remediesPage.filter.all")}
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={filter === cat ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => setFilter(cat)}
              >
                {cat}
              </Badge>
            ))}
            {relevantPlanets.map(p => (
              <Badge
                key={p}
                variant={filter === p ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilter(p)}
              >
                {PLANET_EMOJI[p] || ""} {p}
              </Badge>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">{t("remediesPage.noResults")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((remedy, i) => {
                const Icon = CATEGORY_ICONS[remedy.category] || Sparkles;
                const isRelevant = remedy.planet === dashaLord || afflictedPlanets.includes(remedy.planet || "");

                return (
                  <Card
                    key={remedy.id}
                    className={`animate-fade-in-up ${isRelevant ? "!border-[rgba(201,168,76,0.32)]" : ""}`}
                    style={{ animationDelay: `${0.05 * i}s` }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base font-serif">
                        <Icon className="h-4 w-4 text-primary" />
                        {remedy.title}
                        {isRelevant && (
                          <Badge variant="secondary" className="text-[10px] ml-auto">
                            <Star className="h-3 w-3 mr-1" /> {t("remediesPage.badge.recommended")}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{remedy.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {remedy.planet && (
                          <Badge variant="outline" className="text-xs">
                            {PLANET_EMOJI[remedy.planet] || "🪐"} {remedy.planet}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">{remedy.category}</Badge>
                      </div>

                      {remedy.mantra && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">{t("remediesPage.label.mantra")}</p>
                          <p className="text-sm font-serif text-foreground italic">{remedy.mantra}</p>
                        </div>
                      )}

                      {remedy.gemstone && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">{t("remediesPage.label.gemstone")}</p>
                          <p className="text-sm text-foreground">{remedy.gemstone}</p>
                        </div>
                      )}

                      {remedy.ritual && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">{t("remediesPage.label.ritual")}</p>
                          <p className="text-sm text-foreground">{remedy.ritual}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </SacredPageShell>
  );
}

function RemediesSkeleton() {
  return (
    <SacredPageShell
      leftRail={<PageNavRail title={t("remediesPage.navTitle")} hint={t("remediesPage.navHint")} />}
      rightRail={<CosmicFieldCard />}
      className="space-y-6"
    >
      <Skeleton className="h-9 w-60" />
      <Skeleton className="h-5 w-40" />
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </SacredPageShell>
  );
}
