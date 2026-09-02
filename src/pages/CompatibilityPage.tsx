import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useActiveChart } from "@/hooks/useActiveChart";
import ReadingAsChip from "@/components/ReadingAsChip";
import CosmicBackground from "@/components/CosmicBackground";
import TwinkleText from "@/components/TwinkleText";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLanguage } from "@/lib/i18nClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, AlertCircle, RefreshCw, Trash2, ChevronRight, Copy } from "lucide-react";
import { Navigate } from "react-router-dom";
import Paywall from "@/components/Paywall";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BirthChart {
  id: string;
  full_name: string;
  date_of_birth: string;
  birth_time: string;
  birthplace: string;
  chart_data: any;
}

interface CompatibilityReport {
  id: string;
  chart_a_id: string;
  chart_b_id: string;
  score: number | null;
  report: string | null;
  created_at: string;
  chart_a_name?: string;
  chart_b_name?: string;
}

function getScoreLabel(score: number, t: (k: string) => string): { label: string; color: string } {
  if (score >= 25) return { label: t("compatibility.score.excellent"), color: "text-green-500" };
  if (score >= 18) return { label: t("compatibility.score.good"), color: "text-primary" };
  if (score >= 12) return { label: t("compatibility.score.average"), color: "text-yellow-500" };
  return { label: t("compatibility.score.challenging"), color: "text-destructive" };
}

export default function CompatibilityPage() {
  const { t } = useTranslation("pages");
  const { user, session, isLoading: authLoading } = useAuth();
  const { activeChart } = useActiveChart();
  const { toast } = useToast();

  const [charts, setCharts] = useState<BirthChart[]>([]);
  const [chartAId, setChartAId] = useState("");
  const [chartBId, setChartBId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [reports, setReports] = useState<CompatibilityReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CompatibilityReport | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const [chartsRes, reportsRes] = await Promise.all([
        supabase.from("birth_charts").select("id, full_name, date_of_birth, birth_time, birthplace, chart_data").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("compatibility_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      const chartsData = (chartsRes.data || []) as unknown as BirthChart[];
      setCharts(chartsData);

      // Pre-fill Chart A with the active chart ("compatibility from my perspective").
      // Chart B is left blank for the user to choose, unless exactly one other chart exists.
      const preferredA = activeChart?.id && chartsData.some(c => c.id === activeChart.id)
        ? activeChart.id
        : chartsData[0]?.id || "";
      setChartAId((prev) => prev || preferredA);
      if (chartsData.length === 2 && preferredA) {
        const other = chartsData.find(c => c.id !== preferredA);
        if (other) setChartBId((prev) => prev || other.id);
      }

      // Enrich reports with chart names
      const reportsData = (reportsRes.data || []) as unknown as CompatibilityReport[];
      const chartMap = new Map(chartsData.map(c => [c.id, c.full_name]));
      const enriched = reportsData.map(r => ({
        ...r,
        chart_a_name: chartMap.get(r.chart_a_id) || "Unknown",
        chart_b_name: chartMap.get(r.chart_b_id) || "Unknown",
      }));
      setReports(enriched);
      setIsLoadingData(false);
    };
    loadData();
  }, [user, activeChart?.id]);

  if (authLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-8 mx-auto rounded-full" />
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const handleGenerate = async () => {
    if (!chartAId || !chartBId) {
      toast({ title: t("compatibility.toast.selectBothTitle"), description: t("compatibility.toast.selectBothDesc"), variant: "destructive" });
      return;
    }
    if (chartAId === chartBId) {
      toast({ title: t("compatibility.toast.differentChartsTitle"), description: t("compatibility.toast.differentChartsDesc"), variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setSelectedReport(null);
    setGenerationStep(t("compatibility.step.analyzing"));

    try {
      setGenerationStep(t("compatibility.step.computing"));
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-compatibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ chart_a_id: chartAId, chart_b_id: chartBId, language: getCurrentLanguage() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate compatibility report");
      }

      setGenerationStep(t("compatibility.step.preparing"));
      const report = await res.json();
      const chartMap = new Map(charts.map(c => [c.id, c.full_name]));
      const enriched: CompatibilityReport = {
        ...report,
        chart_a_name: chartMap.get(report.chart_a_id) || "Unknown",
        chart_b_name: chartMap.get(report.chart_b_id) || "Unknown",
      };
      setReports(prev => [enriched, ...prev]);
      setSelectedReport(enriched);
      sessionStorage.removeItem("dashboard-data");
      toast({ title: t("compatibility.toast.generatedTitle"), description: t("compatibility.toast.generatedDesc") });
    } catch (e: any) {
      toast({ title: t("compatibility.toast.errorTitle"), description: e.message, variant: "destructive" });
      setGenerationError(e.message);
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    const { error } = await supabase.from("compatibility_reports").delete().eq("id", reportId);
    if (error) {
      toast({ title: t("compatibility.toast.deleteErrorTitle"), description: t("compatibility.toast.deleteErrorDesc"), variant: "destructive" });
      return;
    }
    setReports(prev => prev.filter(r => r.id !== reportId));
    if (selectedReport?.id === reportId) setSelectedReport(null);
    sessionStorage.removeItem("dashboard-data");
    toast({ title: t("compatibility.toast.deletedTitle"), description: t("compatibility.toast.deletedDesc") });
  };

  const chartA = charts.find(c => c.id === chartAId);
  const chartB = charts.find(c => c.id === chartBId);

  return (
    <Paywall
      feature={t("compatibility.paywallFeature")}
      description={t("compatibility.paywallDescription")}
    >
      <div className="min-h-screen relative sacred-page">
        <CosmicBackground />
      <SacredPageShell
        leftRail={<PageNavRail title={t("compatibility.navTitle")} hint={t("compatibility.navHint")} />}
        rightRail={<CosmicFieldCard />}
        className="space-y-6"
      >
        <div className="text-center space-y-2 animate-fade-in-up">
          <Heart className="h-8 w-8 mx-auto text-primary mb-2" />
          <TwinkleText as="h1" intensity="aura" className="text-3xl font-serif font-bold text-foreground">
            {t("compatibility.heading")}
          </TwinkleText>
          <p className="text-muted-foreground">{t("compatibility.subheading")}</p>
          <div className="flex justify-center pt-1"><ReadingAsChip label={t("compatibility.primaryLabel")} /></div>
        </div>

        {/* Chart Selection */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" /> {t("compatibility.selectCharts.title")}
            </CardTitle>
            <CardDescription>{t("compatibility.selectCharts.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingData ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : charts.length < 2 ? (
              <div className="text-center py-8 space-y-3">
                <Heart className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <h3 className="font-serif font-semibold text-foreground">{t("compatibility.selectCharts.emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t("compatibility.selectCharts.emptyBody")}
                </p>
                <Button variant="outline" onClick={() => window.location.href = "/chart"}>
                  {t("compatibility.selectCharts.createButton")}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("compatibility.selectCharts.personA")}</label>
                    <Select value={chartAId} onValueChange={setChartAId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("compatibility.selectCharts.selectFirstChart")} />
                      </SelectTrigger>
                      <SelectContent>
                        {charts.filter(c => c.id !== chartBId).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name} — {c.birthplace}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("compatibility.selectCharts.personB")}</label>
                    <Select value={chartBId} onValueChange={setChartBId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("compatibility.selectCharts.selectSecondChart")} />
                      </SelectTrigger>
                      <SelectContent>
                        {charts.filter(c => c.id !== chartAId).map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name} — {c.birthplace}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !chartAId || !chartBId}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {generationStep}
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4" />
                      {t("compatibility.selectCharts.generateButton")}
                    </>
                  )}
                </Button>

                {generationError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{generationError}</p>
                    <Button variant="ghost" size="sm" onClick={handleGenerate} className="ml-auto shrink-0">
                      <RefreshCw className="h-4 w-4" /> {t("compatibility.selectCharts.retryButton")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Report Display */}
        {selectedReport && selectedReport.score != null && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Score Card */}
            <Card className="border-primary/20">
              <CardContent className="p-6 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  title="Copy report"
                  onClick={async () => {
                    if (!selectedReport) return;
                    const { label } = getScoreLabel(selectedReport.score!, t);
                    let text = `Kundali Milan: ${selectedReport.chart_a_name} & ${selectedReport.chart_b_name}\n`;
                    text += `Score: ${selectedReport.score}/36 (${label})\n\n`;
                    if (selectedReport.report) text += selectedReport.report;
                    await navigator.clipboard.writeText(text);
                    toast({ title: t("compatibility.report.copiedToast") });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <div className="text-center space-y-3">
                  <h2 className="text-xl font-serif font-semibold text-foreground twinkle-aura">
                    {selectedReport.chart_a_name} & {selectedReport.chart_b_name}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-primary twinkle-star">{selectedReport.score}</span>
                    <span className="text-lg text-muted-foreground">/36</span>
                  </div>
                  <Badge className={getScoreLabel(selectedReport.score, t).color}>
                    {getScoreLabel(selectedReport.score, t).label}
                  </Badge>
                  <Progress value={(selectedReport.score / 36) * 100} className="h-3 max-w-xs mx-auto" />
                </div>

                {/* Mini chart summaries */}
                {chartA && chartB && (
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {[chartA, chartB].map((c) => {
                      const cd = c.chart_data;
                      return (
                        <div key={c.id} className="text-center p-3 rounded-lg bg-secondary/50 border border-border/50">
                          <p className="font-medium text-foreground text-sm">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {cd?.ascendant?.sign} Asc · {cd?.moon_sign} Moon
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Text */}
            {selectedReport.report && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">{t("compatibility.report.detailedAnalysisTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none text-foreground">
                    {selectedReport.report.split("\n").map((line, i) => {
                      if (!line.trim()) return <br key={i} />;
                      if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-serif font-semibold text-foreground mt-4 mb-2">{line.replace("## ", "")}</h2>;
                      if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.replace("### ", "")}</h3>;
                      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold text-foreground">{line.replace(/\*\*/g, "")}</p>;
                      if (line.startsWith("- ")) return <li key={i} className="text-sm text-muted-foreground ml-4">{line.replace("- ", "")}</li>;
                      return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Saved Reports */}
        {reports.length > 0 && (
          <Card className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t("compatibility.savedReports.title")} <Badge variant="secondary">{reports.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reports.map(r => {
                const isSelected = selectedReport?.id === r.id;
                const scoreInfo = r.score != null ? getScoreLabel(r.score, t) : null;
                return (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected ? "border-primary bg-accent" : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => setSelectedReport(r)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {r.chart_a_name} & {r.chart_b_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {scoreInfo && r.score != null && (
                        <Badge variant="secondary" className={scoreInfo.color}>
                          {r.score}/36
                        </Badge>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("compatibility.savedReports.deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("compatibility.savedReports.deleteDescription", { names: `${r.chart_a_name} & ${r.chart_b_name}` })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("compatibility.savedReports.deleteCancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteReport(r.id)}>{t("compatibility.savedReports.deleteConfirm")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </SacredPageShell>
    </div>
    </Paywall>
  );
}
