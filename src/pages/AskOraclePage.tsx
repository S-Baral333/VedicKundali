import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLanguage } from "@/lib/i18nClient";
import { useAuth } from "@/hooks/useAuth";
import { useActiveChart } from "@/hooks/useActiveChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Clock, Lightbulb, ShieldAlert, History, Waves, ChevronDown, Trash2, MessageSquare, RotateCcw, Send, Gem, Star, Sparkles, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CosmicBackground from "@/components/CosmicBackground";
import SacredPageShell from "@/components/layout/SacredPageShell";
import PageNavRail from "@/components/layout/PageNavRail";
import CosmicFieldCard from "@/components/layout/CosmicFieldCard";
import PaywallModal from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";
import { getModelForTier } from "@/hooks/useSubscription";
import { useRishiGuru } from "@/hooks/useRishiGuru";
import LiveOracleStream from "@/components/oracle/LiveOracleStream";
import GuruWatchingPanel from "@/components/oracle/GuruWatchingPanel";
import ChartContextPreview from "@/components/oracle/ChartContextPreview";
import ResultActions from "@/components/oracle/ResultActions";
import FollowUpChips from "@/components/oracle/FollowUpChips";
import ConversationThread from "@/components/oracle/ConversationThread";
import CitedLawsStrip from "@/components/oracle/CitedLawsStrip";
import HistoryToolbar, { type HistoryFilter } from "@/components/oracle/HistoryToolbar";
import GuruPortrait from "@/components/oracle/GuruPortrait";
import OracleInput from "@/components/oracle/OracleInput";
import { detectIntent } from "@/lib/oracle-intent";

const CATEGORIES = [
  { id: "career", label: "Career", emoji: "💼" },
  { id: "relationships", label: "Relationships", emoji: "💕" },
  { id: "finance", label: "Finance", emoji: "💰" },
  { id: "health", label: "Health", emoji: "🌿" },
  { id: "spiritual", label: "Spiritual", emoji: "🕉️" },
  { id: "general", label: "General", emoji: "🔮" },
];

type Mode = "insight" | "prediction" | "guidance";



interface EvidenceFactor {
  factor: string;
  value: string | number | null;
  weight: number;
}

interface Decision {
  astrologer_greeting: string;
  verdict: "favorable" | "nuanced" | "neutral" | "unfavorable";
  confidence: number;
  strength_score?: number;
  question_type?: "superlative" | "binary_factual" | "temporal" | "directional";
  confidence_note: string;
  direct_answer: string;
  narrative_reading: string;
  planetary_insight: string;
  current_energy: string;
  timing: string;
  reasoning_simple: string[];
  technical_details: string[];
  evidence_factors?: EvidenceFactor[];
  suggested_action: string;
  remedial_suggestion: string;
  caution: string | null;
}

interface HistoryEntry {
  id: string;
  question: string;
  category: string;
  decision: Decision;
  created_at: string;
}

// Legacy OracleJob interface removed — the page now uses a direct SSE token
// stream instead of the oracle_jobs polling channel.

const verdictConfig = {
  favorable:   { icon: CheckCircle2,  label: "Favorable",   color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", ring: "hsl(152, 69%, 40%)" },
  nuanced:     { icon: Sparkles,      label: "Nuanced",     color: "text-primary",     bg: "bg-primary/10 border-primary/30",         ring: "hsl(43, 74%, 55%)" },
  neutral:     { icon: AlertTriangle, label: "Neutral",     color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/30",     ring: "hsl(38, 92%, 50%)" },
  unfavorable: { icon: XCircle,       label: "Unfavorable", color: "text-red-500",     bg: "bg-red-500/10 border-red-500/30",         ring: "hsl(0, 72%, 50%)" },
} as const;

type VerdictKey = keyof typeof verdictConfig;
const safeVerdict = (v: string): VerdictKey => (v in verdictConfig ? (v as VerdictKey) : "neutral");

/* ─── Dual Ring: Strength + Confidence (separate, honest metrics) ─── */
function MetricRing({ value, label, color, icon: Icon }: { value: number; label: string; color: string; icon: React.ComponentType<{ className?: string }> }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={radius} fill="none" stroke="hsl(var(--muted) / 0.3)" strokeWidth="5" />
        <circle cx="38" cy="38" r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-bold mt-0.5">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mt-1">{label}</p>
    </div>
  );
}

/* ─── Cosmic Divider ─── */
function CosmicDivider() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <span className="px-3 text-primary/30 text-xs">✦</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}

/* Loader moved to src/components/oracle/CosmicScanLoader.tsx */


/* Oracle Input moved to src/components/oracle/OracleInput.tsx */


/* ─── Resonance Feedback ─── */
function ResonanceFeedback({ readingId }: { readingId: string | null }) {
  const { t } = useTranslation("pages");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { toast } = useToast();

  const submit = async (feedback: string) => {
    setSubmitted(feedback);
    if (readingId) {
      await supabase
        .from("oracle_readings" as any)
        .update({ feedback } as any)
        .eq("id", readingId);
    }
    toast({ title: t("askOracle.resonance.toastThankYou") });
  };

  if (submitted) {
    return (
      <div className="text-center py-3 text-sm text-muted-foreground animate-in fade-in duration-300">
        {t("askOracle.resonance.submittedMessage")}
      </div>
    );
  }

  return (
    <Card className="glass-card border-primary/10">
      <CardContent className="py-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground font-medium">{t("askOracle.resonance.prompt")}</p>
        <div className="flex items-center justify-center gap-3">
          {[
            { labelKey: "askOracle.resonance.veryAccurate", emoji: "🔥", value: "accurate" },
            { labelKey: "askOracle.resonance.somewhat", emoji: "🤔", value: "somewhat" },
            { labelKey: "askOracle.resonance.notReally", emoji: "❌", value: "not_really" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => submit(opt.value)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <span className="text-lg">{opt.emoji}</span>
              <span className="text-xs text-muted-foreground">{t(opt.labelKey)}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Oracle Result with staggered animations ─── */
function OracleResult({ decision, readingId, godMode }: { decision: Decision; readingId: string | null; godMode: boolean }) {
  const { t } = useTranslation("pages");
  const vc = verdictConfig[safeVerdict(decision.verdict)];
  const stagger = (i: number) => ({ animationDelay: `${i * 120}ms` });

  return (
    <div className="space-y-5">
      {/* Astrologer Greeting */}
      {decision.astrologer_greeting && (
        <div className="px-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={stagger(0)}>
          <p className="text-lg md:text-xl font-serif italic text-foreground/90 leading-relaxed">
            "{decision.astrologer_greeting}"
          </p>
        </div>
      )}

      {/* Verdict + Dual Rings (Strength = chart power, Confidence = data certainty) */}
      <div
        className={`flex flex-wrap items-center gap-5 px-5 py-4 rounded-xl border ${vc.bg} animate-in fade-in zoom-in-95 duration-500`}
        style={stagger(1)}
      >
        <div className="flex items-center gap-4">
          <MetricRing value={decision.strength_score ?? decision.confidence} label={t("askOracle.metric.strength")} color={vc.ring} icon={Sparkles} />
          <MetricRing value={decision.confidence} label={t("askOracle.metric.confidence")} color="hsl(var(--primary))" icon={ShieldCheck} />
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("askOracle.result.verdictLabel")}</p>
          <p className={`text-xl font-bold ${vc.color}`}>{t(`askOracle.verdict.${safeVerdict(decision.verdict)}`)}</p>
          {decision.confidence_note && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{decision.confidence_note}</p>
          )}
        </div>
      </div>

      {/* Evidence Used — auditable factors that drove the verdict */}
      {decision.evidence_factors && decision.evidence_factors.length > 0 && (
        <Collapsible>
          <Card className="glass-card border-primary/20 animate-in fade-in slide-in-from-bottom-3 duration-500" style={stagger(2)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {t("askOracle.result.evidenceUsed", { n: decision.evidence_factors.length })}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ul className="space-y-1.5">
                  {decision.evidence_factors.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className={`font-mono font-bold tabular-nums shrink-0 w-10 text-right ${e.weight >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {e.weight >= 0 ? "+" : ""}{e.weight}
                      </span>
                      <span className="text-foreground/80 flex-1">
                        {e.factor}
                        {e.value != null && <span className="text-muted-foreground"> = {String(e.value)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Direct Answer */}
      <div className="px-2 animate-in fade-in slide-in-from-bottom-3 duration-500" style={stagger(2)}>
        <p className="text-foreground text-lg leading-relaxed font-medium twinkle-subtle">{decision.direct_answer}</p>
      </div>

      <CosmicDivider />

      {/* Narrative Reading */}
      {decision.narrative_reading && (
        <Card className="glass-card border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(3)}>
          <CardContent className="pt-6">
            <p className="text-foreground/85 leading-[1.85] text-[0.95rem]">{decision.narrative_reading}</p>
          </CardContent>
        </Card>
      )}

      {/* Planetary Insight */}
      {decision.planetary_insight && (
        <div className="flex gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(4)}>
          <Star className="h-4 w-4 text-primary mt-1 shrink-0" />
          <p className="text-sm text-foreground/80 leading-relaxed">{decision.planetary_insight}</p>
        </div>
      )}

      {/* Current Energy */}
      {decision.current_energy && (
        <>
          <CosmicDivider />
          <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(5)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Waves className="h-4 w-4 text-primary" />
                {t("askOracle.result.currentEnergy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{decision.current_energy}</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Timing */}
      <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(6)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {t("askOracle.result.timing")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{decision.timing}</p>
        </CardContent>
      </Card>

      {/* Why This Reading */}
      {decision.reasoning_simple.length > 0 && (
        <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(7)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("askOracle.result.whyThisReading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {decision.reasoning_simple.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <CosmicDivider />

      {/* Advice */}
      <Card className="glass-card border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(8)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            {t("askOracle.result.adviceTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{decision.suggested_action}</p>
        </CardContent>
      </Card>

      {/* Remedial Suggestion */}
      {decision.remedial_suggestion && (
        <div className="flex gap-3 px-4 py-3 rounded-lg bg-accent/30 border border-accent/40 animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(9)}>
          <Gem className="h-4 w-4 text-primary mt-1 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-1">{t("askOracle.result.vedicRemedy")}</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{decision.remedial_suggestion}</p>
          </div>
        </div>
      )}

      {/* Caution */}
      {decision.caution && (
        <Card className="glass-card border-destructive/20 animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(10)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              {t("askOracle.result.caution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{decision.caution}</p>
          </CardContent>
        </Card>
      )}

      {/* What Was Used In This Reading */}
      {decision.technical_details.length > 0 && (
        <Collapsible>
          <Card className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-600" style={stagger(11)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {t("askOracle.result.whatWasUsed")}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{t("askOracle.result.thisReadingConsidered")}</p>
                <ul className="space-y-2">
                  {decision.technical_details.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Cited Laws — God Mode only */}
      {godMode && <CitedLawsStrip />}

      {/* Resonance Feedback */}
      <ResonanceFeedback readingId={readingId} />
    </div>
  );
}

/* ─── History Sheet ─── */
function groupByDate(entries: HistoryEntry[]) {
  const now = Date.now();
  const day = 86400000;
  const groups: Record<string, HistoryEntry[]> = { Today: [], "This Week": [], Earlier: [] };
  for (const e of entries) {
    const age = now - new Date(e.created_at).getTime();
    if (age < day) groups.Today.push(e);
    else if (age < 7 * day) groups["This Week"].push(e);
    else groups.Earlier.push(e);
  }
  return groups;
}

function OracleHistorySheet({ history, onSelect, onDelete, open, onOpenChange }: {
  history: HistoryEntry[]; onSelect: (e: HistoryEntry) => void; onDelete: (id: string) => void;
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation("pages");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const filtered = useMemo(() => {
    return history.filter((e) => {
      if (filter !== "all" && safeVerdict(e.decision.verdict) !== filter) return false;
      if (search.trim() && !e.question.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [history, search, filter]);

  const grouped = groupByDate(filtered);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {t("askOracle.history.title")}
          </SheetTitle>
        </SheetHeader>
        <HistoryToolbar search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
        <div className="space-y-5">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t("askOracle.history.noMatching")}</p>
          )}
          {Object.entries(grouped).map(([label, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={label} className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground px-1">{label === "Today" ? t("askOracle.history.groupToday") : label === "This Week" ? t("askOracle.history.groupThisWeek") : t("askOracle.history.groupEarlier")}</p>
                <div className="space-y-2">
                  {items.map((entry) => {
                    const hvc = verdictConfig[safeVerdict(entry.decision.verdict)];
                    return (
                      <div key={entry.id} className="relative group">
                        <button onClick={() => { onSelect(entry); onOpenChange(false); }} className="w-full text-left">
                          <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
                            <CardContent className="py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{entry.question}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {CATEGORIES.find(c => c.id === entry.category)?.emoji} {t(`askOracle.categories.${entry.category}`)} · {new Date(entry.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline" className={`shrink-0 ${hvc.color} border-current`}>
                                {hvc.label}
                              </Badge>
                            </CardContent>
                          </Card>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10"
                          title={t("askOracle.history.deleteReading")}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}


/* ─── Follow-Up Input ─── */
function FollowUpInput({ onSubmit, loading }: { onSubmit: (q: string) => void; loading: boolean }) {
  const { t } = useTranslation("pages");
  const [followUp, setFollowUp] = useState("");
  return (
    <Card className="glass-card border-primary/20">
      <CardContent className="py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary shrink-0" />
          <Input
            placeholder={t("askOracle.followUp.placeholder")}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => { if (e.key === "Enter" && followUp.trim().length >= 5) { onSubmit(followUp.trim()); setFollowUp(""); } }}
            className="flex-1 transition-shadow duration-300 focus:shadow-[0_0_16px_hsl(var(--primary)/0.12)]"
          />
          <Button size="sm" disabled={loading || followUp.trim().length < 5} onClick={() => { onSubmit(followUp.trim()); setFollowUp(""); }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
export default function AskOraclePage() {
  const { t } = useTranslation("pages");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("general");
  const [mode, setMode] = useState<Mode>("insight");
  const [engineLoading, setEngineLoading] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [lastReadingId, setLastReadingId] = useState<string | null>(null);
  const [activeReading, setActiveReading] = useState<{ question: string; category: string; decision: Decision } | null>(null);

  // Live SSE state (replaces oracle_jobs polling)
  const [streamingQuestion, setStreamingQuestion] = useState<string | null>(null);
  const [liveBuffer, setLiveBuffer] = useState("");
  const [liveSection, setLiveSection] = useState("");
  const [streamElapsedMs, setStreamElapsedMs] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [chamberFocused, setChamberFocused] = useState(false);
  const [thread, setThread] = useState<{ question: string; verdict: string; verdictColor: string }[]>([]);
  const { toast } = useToast();
  const { enabled: godMode } = useRishiGuru();
  const loading = engineLoading;
  const displayQuestion = streamingQuestion ?? activeReading?.question ?? "";

  useEffect(() => {
    setQuestionExpanded(false);
  }, [activeReading?.question]);

  // PWA share-target receiver: pre-fill the question from ?title/?text/?url
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get("title");
    const text = params.get("text");
    const url = params.get("url");
    const shared = [title, text, url].filter(Boolean).join(" — ").trim();
    if (shared) {
      setQuestion((prev) => (prev ? prev : shared));
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  const { canUseOracle, refreshUsage, tier } = useSubscription();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { user } = useAuth();
  const { activeChart } = useActiveChart();

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("oracle_readings" as any)
        .select("id, question, category, response, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) {
        setHistory(
          (data as any[]).map((row) => ({
            id: row.id,
            question: row.question,
            category: row.category,
            decision: row.response as Decision,
            created_at: row.created_at,
          }))
        );
      }
    };
    fetchHistory();
  }, [user]);

  // Honest elapsed-seconds ticker while a stream is in flight
  useEffect(() => {
    if (!engineLoading) return;
    const id = window.setInterval(() => {
      setStreamElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
    return () => window.clearInterval(id);
  }, [engineLoading]);

  // Cancel any in-flight stream on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const askOracle = async (
    previousContext?: { question: string; answer: Decision },
    overrideQuestion?: string,
    overrideCategory?: string,
  ) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q || q.length < 5) {
      toast({ title: t("askOracle.error.emptyQuestion"), variant: "destructive" });
      return;
    }
    const intent = detectIntent(q);
    const effectiveCategory = overrideCategory ?? intent.category;
    const effectiveMode: Mode = previousContext ? mode : intent.mode;
    setCategory(effectiveCategory);
    setMode(effectiveMode);

    // Reset live state
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    startedAtRef.current = Date.now();
    setEngineLoading(true);
    setDecision(null);
    setLastReadingId(null);
    setLiveBuffer("");
    setLiveSection("");
    setStreamElapsedMs(0);
    setStreamError(null);
    setStreamingQuestion(q);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-decision`;
      const body: any = {
        question: q,
        category: effectiveCategory,
        mode: effectiveMode,
        ai_model: getModelForTier(tier),
        chart_id: activeChart?.id,
        stream: true,
        language: getCurrentLanguage(),
      };
      if (previousContext) body.previous_context = previousContext;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        let msg = t("askOracle.error.failedToStart");
        try { msg = JSON.parse(errText).error || msg; } catch { /* ignore */ }
        if (resp.status === 402) msg = t("askOracle.error.creditsExhausted");
        if (resp.status === 429) msg = t("askOracle.error.tooManyRequests");
        throw new Error(msg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let buffer = "";
      let detectedSection = "";
      let finalDecision: Decision | null = null;
      let finalReadingId: string | null = null;
      let finalCreatedAt: string | null = null;
      let streamError: string | null = null;

      const flushLine = (line: string) => {
        if (!line.startsWith("data: ")) return false;
        const payload = line.slice(6).trim();
        if (!payload) return false;
        try {
          const evt = JSON.parse(payload);
          if (typeof evt.t === "string") {
            buffer += evt.t;
            setLiveBuffer(buffer);
          }
          if (typeof evt.section === "string") {
            detectedSection = evt.section;
            setLiveSection(detectedSection);
          }
          if (evt.error) {
            streamError = evt.error;
          }
          if (evt.done) {
            finalDecision = evt.final as Decision;
            finalReadingId = evt.reading_id ?? null;
            finalCreatedAt = evt.created_at ?? null;
          }
        } catch {
          // ignore unparseable frames
        }
        return true;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line) flushLine(line);
        }
      }
      // Flush any trailing line without a newline
      if (textBuffer.trim()) flushLine(textBuffer);

      if (streamError) throw new Error(streamError);
      if (!finalDecision) throw new Error(t("askOracle.error.noResult"));

      setDecision(finalDecision);
      setActiveReading({ question: q, category: effectiveCategory, decision: finalDecision });
      setLastReadingId(finalReadingId);
      setStreamingQuestion(null);
      setEngineLoading(false);
      setHistory((prev) => {
        if (!finalReadingId || prev.some((entry) => entry.id === finalReadingId)) return prev;
        return [{
          id: finalReadingId,
          question: q,
          category: effectiveCategory,
          decision: finalDecision!,
          created_at: finalCreatedAt ?? new Date().toISOString(),
        }, ...prev];
      });
      await refreshUsage();
    } catch (e: any) {
      if (e?.name === "AbortError") {
        // User cancelled — silently reset
        setEngineLoading(false);
        setStreamingQuestion(null);
        setLiveBuffer("");
        setLiveSection("");
        return;
      }
      setEngineLoading(false);
      setStreamError(e?.message || t("askOracle.error.failedToGetAnswer"));
      toast({ title: t("askOracle.error.guruErrorTitle"), description: e?.message || t("askOracle.error.failedToGetAnswer"), variant: "destructive" });
    }
  };

  const cancelStream = () => {
    abortRef.current?.abort();
  };


  const askFollowUp = async (followUpQuestion: string) => {
    if (!activeReading) return;
    // Push the prior turn into the thread for visual continuity.
    const priorVc = verdictConfig[safeVerdict(activeReading.decision.verdict)];
    setThread((prev) => [
      ...prev,
      { question: activeReading.question, verdict: priorVc.label, verdictColor: priorVc.color },
    ]);
    setQuestion(followUpQuestion);
    await askOracle({ question: activeReading.question, answer: activeReading.decision }, followUpQuestion, activeReading.category);
  };

  const resetToNewQuestion = () => {
    abortRef.current?.abort();
    setStreamingQuestion(null);
    setLiveBuffer("");
    setLiveSection("");
    setStreamError(null);
    setEngineLoading(false);
    setActiveReading(null);
    setDecision(null);
    setQuestion("");
    setCategory("general");
    setLastReadingId(null);
    setThread([]);
  };

  const deleteReading = async (id: string) => {
    const { error } = await supabase.from("oracle_readings" as any).delete().eq("id", id);
    if (!error) {
      setHistory((prev) => prev.filter((e) => e.id !== id));
      toast({ title: t("askOracle.toast.readingDeleted") });
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    abortRef.current?.abort();
    setQuestion(entry.question);
    setCategory(entry.category);
    setStreamingQuestion(null);
    setLiveBuffer("");
    setLiveSection("");
    setStreamError(null);
    setEngineLoading(false);
    setDecision(entry.decision);
    setActiveReading({ question: entry.question, category: entry.category, decision: entry.decision });
    setLastReadingId(entry.id);
  };

  return (
    <div className="relative min-h-screen sacred-page">
      <CosmicBackground />
      <SacredPageShell
        leftRail={<PageNavRail title={t("askOracle.navTitle")} hint={t("askOracle.navHint")} />}
        rightRail={godMode ? <GuruWatchingPanel /> : <CosmicFieldCard />}
        className="space-y-5 md:space-y-8 relative z-10"
      >
        {/* ─── Oracle Chamber ─── */}
        {!displayQuestion && (
          <div className="oracle-vignette-active" data-focused={chamberFocused}>
            {/* Thin top strip — history + chart chip */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2 min-w-0">
                {godMode && (
                  <span className="text-[9px] uppercase tracking-[0.20em] text-primary/90 border border-primary/40 rounded-full px-2 py-0.5 shrink-0">
                    {t("askOracle.godModeLabel")}
                  </span>
                )}
                <ChartContextPreview godMode={godMode} />
              </div>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                  className="text-muted-foreground hover:text-primary shrink-0"
                  title={t("askOracle.pastReadingsButton")}
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* The Chamber */}
            <div className="flex flex-col items-center gap-6 py-4 md:py-8">
              <GuruPortrait
                intensity={engineLoading ? "consulting" : chamberFocused ? "focused" : "idle"}
                size={220}
              />

              <div className="text-center space-y-2 max-w-xl">
                <h1
                  className="text-4xl md:text-5xl font-serif font-bold text-foreground twinkle-aura"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("askOracle.heading")}
                </h1>
                <p
                  className="text-sm md:text-base italic text-muted-foreground"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {t("askOracle.subheading")}
                </p>
              </div>

              <div className="w-full max-w-xl">
                <OracleInput
                  value={question}
                  onChange={setQuestion}
                  onFocusChange={setChamberFocused}
                  onSubmit={() => { if (!canUseOracle) { setPaywallOpen(true); return; } askOracle(); }}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={() => { if (!canUseOracle) { setPaywallOpen(true); return; } askOracle(); }}
                disabled={loading || question.trim().length < 5}
                size="lg"
                className="px-10 h-12 rounded-full text-base shadow-[0_0_30px_hsl(var(--primary)/0.35)]"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("askOracle.button.consulting")}</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />{t("askOracle.button.revealInsight")}</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Conversation thread (collapsed prior turns) */}
        {thread.length > 0 && <ConversationThread turns={thread} />}

        {/* Active reading bar (when a question is in flight or already answered) */}
        {displayQuestion && (
          <Card className="glass-card gradient-border-top overflow-hidden">
            <CardContent className="py-4 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setQuestionExpanded((v) => !v)}
                aria-expanded={questionExpanded}
                className="min-w-0 flex-1 text-left group"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  {t("askOracle.activeBar.currentQuestion")}
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${questionExpanded ? "rotate-180" : ""}`}
                  />
                </p>
                <p
                  className={`text-sm font-medium text-foreground group-hover:text-primary transition-colors ${
                    questionExpanded ? "whitespace-pre-wrap break-words" : "truncate"
                  }`}
                >
                  📌 {displayQuestion}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {engineLoading ? (
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px] py-0">
                      {streamError ? t("askOracle.activeBar.retryNeeded") : t("askOracle.activeBar.guruInProgress")}
                    </Badge>
                  ) : activeReading ? (
                    <Badge
                      variant="outline"
                      className={`${verdictConfig[safeVerdict(activeReading.decision.verdict)].color} border-current text-[10px] py-0`}
                    >
                      {t(`askOracle.verdict.${safeVerdict(activeReading.decision.verdict)}`)}
                    </Badge>
                  ) : null}
                  {activeReading?.decision.timing && !engineLoading && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {activeReading.decision.timing.slice(0, 60)}
                      {activeReading.decision.timing.length > 60 ? "…" : ""}
                    </span>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {history.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
                    <History className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={resetToNewQuestion}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  {t("askOracle.activeBar.newButton")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Live Oracle Stream (true SSE token stream — replaces the old layer-pip loader) */}
        {(engineLoading || streamError) && (
          <LiveOracleStream
            liveBuffer={liveBuffer}
            section={liveSection}
            status={streamError ? "error" : "streaming"}
            elapsedMs={streamElapsedMs}
            error={streamError}
            onCancel={engineLoading && !streamError ? cancelStream : undefined}
            onRetry={streamError ? () => { setStreamError(null); askOracle(); } : undefined}
          />
        )}

        {/* Result */}
        {decision && !engineLoading && (
          <>
            <OracleResult decision={decision} readingId={lastReadingId} godMode={godMode} />
            <ResultActions
              question={activeReading?.question ?? ""}
              text={`${decision.direct_answer}\n\n${decision.narrative_reading ?? ""}`}
            />
            <FollowUpChips mode={mode} onPick={askFollowUp} disabled={loading} />
          </>
        )}

        {/* Follow-up */}
        {activeReading && !engineLoading && <FollowUpInput onSubmit={askFollowUp} loading={loading} />}

        {/* History Sheet */}
        <OracleHistorySheet
          history={history}
          onSelect={loadFromHistory}
          onDelete={deleteReading}
          open={showHistory}
          onOpenChange={setShowHistory}
        />
        <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} feature="oracle" />
      </SacredPageShell>
    </div>
  );
}
