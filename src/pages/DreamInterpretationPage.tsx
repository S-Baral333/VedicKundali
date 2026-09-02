import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useActiveChart } from "@/hooks/useActiveChart";
import ReadingAsChip from "@/components/ReadingAsChip";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLanguage } from "@/lib/i18nClient";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Moon, Sparkles, Eye, ChevronDown, Loader2, Trash2, Copy, MoonStar, CloudMoon, Sunrise, type LucideIcon } from "lucide-react";
import UsageIndicator from "@/components/UsageIndicator";
import PaywallModal from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";
import { getModelForTier } from "@/hooks/useSubscription";
import TwinkleText from "@/components/TwinkleText";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";

interface DreamSymbol {
  name: string;
  context: string;
}

interface DreamRecord {
  id: string;
  dream_description: string;
  dream_time: string;
  emotions: string | null;
  clarity: string;
  is_recurring: boolean;
  is_lucid: boolean;
  life_context: string | null;
  birth_chart_id: string | null;
  extracted_symbols: DreamSymbol[] | null;
  interpretation: string | null;
  dream_category: string | null;
  created_at: string;
}

interface BirthChart {
  id: string;
  full_name: string;
}

const DREAM_TIMES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "pre_dawn", label: "Pre-dawn / Brahma Muhurta (3:30-5:30 AM)", icon: MoonStar },
  { value: "midnight", label: "Midnight (12:00-3:00 AM)", icon: Moon },
  { value: "early_night", label: "Early Night (9:00 PM - 12:00 AM)", icon: CloudMoon },
  { value: "after_sunrise", label: "After Sunrise", icon: Sunrise },
];

const CLARITY_OPTIONS = [
  { value: "vivid", label: "Vivid — Crystal clear" },
  { value: "partial", label: "Partial — Some parts clear" },
  { value: "blurry", label: "Blurry — Vague impressions" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Prophetic": "border-l-amber-500",
  "Warning": "border-l-red-500",
  "Spiritual": "border-l-violet-500",
  "Auspicious": "border-l-emerald-500",
  "Psychological": "border-l-blue-500",
};

function getCategoryBorderClass(category: string | null) {
  if (!category) return "border-l-border";
  for (const [key, cls] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return "border-l-primary/40";
}

export default function DreamInterpretationPage() {
  const { t } = useTranslation("pages");
  const { user, isLoading: authLoading } = useAuth();
  const { activeChart } = useActiveChart();
  const navigate = useNavigate();
  const { canUseDreams, refreshUsage, tier } = useSubscription();

  const [dreamDescription, setDreamDescription] = useState("");
  const [dreamTime, setDreamTime] = useState("");
  const [emotions, setEmotions] = useState("");
  const [clarity, setClarity] = useState("vivid");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isLucid, setIsLucid] = useState(false);
  const [lifeContext, setLifeContext] = useState("");
  const [birthChartId, setBirthChartId] = useState<string>("");

  const [charts, setCharts] = useState<BirthChart[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [extractedSymbols, setExtractedSymbols] = useState<DreamSymbol[]>([]);
  const [dreamCategory, setDreamCategory] = useState("");
  const [currentDreamId, setCurrentDreamId] = useState<string | null>(null);

  const [history, setHistory] = useState<DreamRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("birth_charts")
      .select("id, full_name")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setCharts(data);
      });

    loadHistory();
  }, [user]);

  // Auto-select active chart whenever it changes (and user hasn't picked a different one yet)
  useEffect(() => {
    if (activeChart && !birthChartId) setBirthChartId(activeChart.id);
  }, [activeChart, birthChartId]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("dream_interpretations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as unknown as DreamRecord[]);
    setHistoryLoading(false);
  };

  const handleDeleteDream = async (dreamId: string) => {
    const { error } = await supabase
      .from("dream_interpretations")
      .delete()
      .eq("id", dreamId);
    if (error) {
      toast({ title: t("dream.toast.deleteFailed"), variant: "destructive" });
    } else {
      setHistory((prev) => prev.filter((d) => d.id !== dreamId));
      sessionStorage.removeItem("dashboard-data");
      toast({ title: t("dream.toast.deleted") });
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!dreamDescription.trim() || !dreamTime) {
      toast({ title: t("dream.toast.missingFields"), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    setStreamedText("");
    setExtractedSymbols([]);
    setDreamCategory("");
    setCurrentDreamId(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interpret-dream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            dream_description: dreamDescription,
            dream_time: dreamTime,
            emotions: emotions || null,
            clarity,
            is_recurring: isRecurring,
            is_lucid: isLucid,
            life_context: lifeContext || null,
            birth_chart_id: birthChartId || null,
            ai_model: getModelForTier(tier),
            language: getCurrentLanguage(),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Request failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let interpretation = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ") || line.trim() === "") continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.type === "metadata") {
              setCurrentDreamId(parsed.dream_id);
              setExtractedSymbols(parsed.extracted_symbols || []);
              setDreamCategory(parsed.dream_category || "");
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              interpretation += content;
              setStreamedText(interpretation);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      sessionStorage.removeItem("dashboard-data");
      loadHistory();
      await refreshUsage();
    } catch (e) {
      console.error(e);
      toast({
        title: t("dream.toast.failed"),
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [dreamDescription, dreamTime, emotions, clarity, isRecurring, isLucid, lifeContext, birthChartId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen sacred-page">
      <SacredPageShell
        leftRail={<PageNavRail title={t("dream.navTitle")} hint={t("dream.navHint")} />}
        rightRail={<CosmicFieldCard />}
        className="space-y-8"
      >
        {/* Page header */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <Moon className="h-8 w-8 mx-auto text-primary mb-2" />
          <TwinkleText as="h1" intensity="aura" className="text-3xl font-serif font-bold text-foreground">
            {t("dream.heading")}
          </TwinkleText>
          <p className="text-muted-foreground">{t("dream.subheading")}</p>
          <div className="flex justify-center pt-1"><ReadingAsChip /></div>
        </div>

        {/* Dream Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t("dream.form.cardTitle")}
            </CardTitle>
            <CardDescription>
              {t("dream.form.cardDescription")}
            </CardDescription>
            <div className="pt-2">
              <UsageIndicator feature="dreams" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dream">{t("dream.form.dreamDescriptionLabel")}</Label>
              <Textarea
                id="dream"
                placeholder={t("dream.form.dreamDescriptionPlaceholder")}
                className="min-h-[120px]"
                value={dreamDescription}
                onChange={(e) => setDreamDescription(e.target.value)}
              />
            </div>

            {/* Dream Time Visual Grid */}
            <div className="space-y-2">
              <Label>{t("dream.form.dreamTimeLabel")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DREAM_TIMES.map((dt) => {
                  const dtKeyMap: Record<string, string> = {
                    pre_dawn: "preDawn", midnight: "midnight", early_night: "earlyNight", after_sunrise: "afterSunrise",
                  };
                  return (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => setDreamTime(dt.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left text-sm ${
                      dreamTime === dt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <dt.icon className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{t(`dream.dreamTime.${dtKeyMap[dt.value] ?? dt.value}`)}</span>
                  </button>
                  );
                })}
              </div>
            </div>

            {/* Clarity Visual Chips */}
            <div className="space-y-2">
              <Label>{t("dream.form.clarityLabel")}</Label>
              <div className="flex flex-wrap gap-2">
                {CLARITY_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setClarity(c.value)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      clarity === c.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t(`dream.clarity.${c.value}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emotions">{t("dream.form.emotionsLabel")}</Label>
              <Input
                id="emotions"
                placeholder={t("dream.form.emotionsPlaceholder")}
                value={emotions}
                onChange={(e) => setEmotions(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(c) => setIsRecurring(c === true)}
                />
                <Label htmlFor="recurring">{t("dream.form.recurringLabel")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lucid"
                  checked={isLucid}
                  onCheckedChange={(c) => setIsLucid(c === true)}
                />
                <Label htmlFor="lucid">{t("dream.form.lucidLabel")}</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">{t("dream.form.lifeContextLabel")}</Label>
              <Textarea
                id="context"
                placeholder={t("dream.form.lifeContextPlaceholder")}
                value={lifeContext}
                onChange={(e) => setLifeContext(e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            {charts.length > 0 && (
              <div className="space-y-2">
                <Label>{t("dream.form.birthChartLabel")}</Label>
                <Select value={birthChartId} onValueChange={setBirthChartId}>
                  <SelectTrigger><SelectValue placeholder={t("dream.form.birthChartPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {charts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={() => { if (!canUseDreams) { setPaywallOpen(true); return; } handleSubmit(); }} disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("dream.form.buttonInterpreting")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("dream.form.buttonSeek")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Streaming Skeleton */}
        {isSubmitting && !streamedText && !dreamCategory && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {(dreamCategory || streamedText) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-serif">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t("dream.result.title")}
                </CardTitle>
                {streamedText && !isSubmitting && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      let text = "";
                      if (dreamCategory) text += `Category: ${dreamCategory}\n`;
                      if (extractedSymbols.length > 0) {
                        text += `\nKey Symbols:\n`;
                        extractedSymbols.forEach((s) => { text += `- ${s.name}: ${s.context}\n`; });
                      }
                      text += `\n${streamedText}`;
                      await navigator.clipboard.writeText(text);
                      toast({ title: t("dream.result.copiedToast") });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {dreamCategory && (
                <Badge className="w-fit bg-primary/10 text-primary border border-primary/30">{dreamCategory}</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {extractedSymbols.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t("dream.result.extractedSymbols")}</p>
                  <div className="flex flex-wrap gap-2">
                    {extractedSymbols.map((s, i) => (
                      <Badge key={i} variant="outline" className="border-primary/30 text-primary">{s.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {streamedText && (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-serif">
                  {streamedText}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dream History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              {t("dream.history.title")}
            </CardTitle>
            <CardDescription>{t("dream.history.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-md border border-border/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Moon className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <h3 className="font-serif font-semibold text-foreground">{t("dream.history.emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t("dream.history.emptyBody")}
                </p>
                <Button variant="outline" size="sm" onClick={() => document.getElementById("dream")?.focus()}>
                  <Sparkles className="h-4 w-4 mr-1" /> {t("dream.history.emptyButton")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((dream) => (
                  <Collapsible key={dream.id}>
                    <CollapsibleTrigger className={`flex w-full items-center justify-between rounded-md border border-border/30 border-l-4 ${getCategoryBorderClass(dream.dream_category)} p-3 hover:border-primary/40 hover:bg-accent/30 transition-all text-left`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {new Date(dream.created_at).toLocaleDateString()}
                          </span>
                          {dream.dream_category && (
                            <Badge className="text-xs bg-primary/10 text-primary border border-primary/30">{dream.dream_category}</Badge>
                          )}
                          {dream.extracted_symbols && Array.isArray(dream.extracted_symbols) && (dream.extracted_symbols as DreamSymbol[]).length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {t("dream.history.symbolCount", { n: (dream.extracted_symbols as DreamSymbol[]).length })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {dream.dream_description.slice(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("dream.history.deleteTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("dream.history.deleteDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("dream.history.deleteCancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteDream(dream.id)}>
                                {t("dream.history.deleteConfirm")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border border-border/30 rounded-b-md border-t-0 p-4 space-y-3">
                      {dream.extracted_symbols && Array.isArray(dream.extracted_symbols) && (
                        <div className="flex flex-wrap gap-1">
                          {(dream.extracted_symbols as DreamSymbol[]).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-primary/30 text-primary">{s.name}</Badge>
                          ))}
                        </div>
                      )}
                      {dream.interpretation && (
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-serif">
                          {dream.interpretation}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SacredPageShell>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} feature="dreams" />
    </div>
  );
}
