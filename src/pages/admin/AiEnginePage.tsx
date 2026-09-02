import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Sparkles,
  FileText,
  Mic,
  Cpu,
  Scale,
  Save,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  CircleDashed,
  Flame,
  Lightbulb,
  Heart,
  Crown,
  Eye,
  BookOpen,
  TreePine,
  Volume2,
  Loader2,
} from "lucide-react";
import TopRefreshBar from "@/components/admin/TopRefreshBar";
import AiEngineErrorCard from "@/components/admin/AiEngineErrorCard";
import {
  HeaderSkeleton,
  RailSkeleton,
  EditorSkeleton,
  CodexSkeleton,
  PersonaSkeleton,
  VoiceSkeleton,
  EngineSkeleton,
} from "@/components/admin/AiEngineSkeleton";

type Layer = {
  id: string;
  layer_key: string;
  title: string;
  description: string | null;
  content: string;
  version: number;
  status: "draft" | "published" | "archived";
  updated_at: string;
};

type Rule = {
  id: string;
  roman_numeral: string;
  title: string;
  body: string;
  sort_order: number;
  is_active: boolean;
};

const LAYER_ORDER = [
  "identity",
  "knowledge",
  "voice",
  "engine",
  "emotional",
  "structure",
  "forbidden",
  "full_assembled",
];

const LAYER_LABELS: Record<string, string> = {
  identity: "Identity",
  knowledge: "Knowledge",
  voice: "Voice",
  engine: "Engine",
  emotional: "Emotional",
  structure: "Structure",
  forbidden: "Forbidden",
  full_assembled: "Full Assembled",
};

const LAYER_NUMERALS: Record<string, string> = {
  identity: "I",
  knowledge: "II",
  voice: "III",
  engine: "IV",
  emotional: "V",
  structure: "VI",
  forbidden: "VII",
  full_assembled: "∞",
};

const PERSONA_DIMENSIONS = [
  { name: "Wisdom", icon: BookOpen, body: "Vedic scriptures internalised — speaks from the chart, not from generic intuition." },
  { name: "Compassion", icon: Heart, body: "Warm, never cold; never fatalistic. Holds the seeker's nervous system gently." },
  { name: "Authority", icon: Crown, body: "Cited interpretations. No hedging. Names the planet, the house, the degree." },
  { name: "Mystic", icon: Eye, body: "Honours the unseen — karma, dharma, the soul's curriculum — without superstition." },
  { name: "Teacher", icon: Lightbulb, body: "Translates Sanskrit logic into modern feeling. Always closes with a practice." },
  { name: "Sage", icon: TreePine, body: "Speaks as an elder who has watched a thousand charts unfold. No urgency, only truth." },
];

const VOICE_DEMOS = [
  {
    mode: "Wealth",
    q: "Will I become wealthy?",
    a: "Wealth visits you through Jupiter's grace in your 2nd from Moon — but only after Saturn's patience is honoured. Build slowly, save in silver, and the 11th house promise will mature in your 38th year.",
  },
  {
    mode: "Career",
    q: "Should I switch jobs?",
    a: "Mars in your 10th burns hot for change, yet the current Rahu mahadasha rewards endurance over leaps. Hold ninety more days; a door opens between mid-October and the next new moon.",
  },
  {
    mode: "Love",
    q: "Will I find my person?",
    a: "Venus stationed in your 7th sign-lord's nakshatra speaks of a meeting through a teacher or a journey. Your heart is ready; your chart is preparing the room. Stay open in the late afternoons.",
  },
];

const CONSUMERS = [
  { name: "generate-decision", label: "Oracle", phase: 4 },
  { name: "generate-reading", label: "Reading", phase: 5 },
  { name: "generate-predictions", label: "Predictions", phase: 5 },
  { name: "generate-timeline", label: "Timeline", phase: 5 },
  { name: "generate-remedies", label: "Remedies", phase: 5 },
  { name: "generate-horoscope", label: "Horoscope", phase: 5 },
  { name: "interpret-dream", label: "Dreams", phase: 5 },
  { name: "generate-compatibility", label: "Compatibility", phase: 5 },
];

const TABS = [
  { value: "persona", label: "Persona", icon: Sparkles },
  { value: "layers", label: "Prompt Layers", icon: FileText },
  { value: "voice", label: "Voice Demo", icon: Mic },
  { value: "engine", label: "Engine", icon: Cpu },
  { value: "rules", label: "12 Laws", icon: Scale },
];

// Shared glass card style
const GLASS = "bg-background/40 backdrop-blur-[14px] border border-primary/20 rounded-[20px]";

// Module-level cache so tab switches don't refetch.
type CachedBundle = { layers: Layer[]; rules: Rule[]; at: number };
let CACHE: CachedBundle | null = null;
const CACHE_TTL = 60_000;

export default function AiEnginePage() {
  const [layers, setLayers] = useState<Layer[]>(CACHE?.layers ?? []);
  const [rules, setRules] = useState<Rule[]>(CACHE?.rules ?? []);
  const hasFreshCache = !!CACHE && Date.now() - CACHE.at < CACHE_TTL;
  const [initialLoading, setInitialLoading] = useState(!hasFreshCache);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("identity");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [savingLayer, setSavingLayer] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [pendingRuleIds, setPendingRuleIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("layers");
  const markRulePending = (id: string, on: boolean) =>
    setPendingRuleIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setInitialLoading(true);
    else setRefreshing(true);
    setLoadError(null);
    const [layersRes, rulesRes] = await Promise.all([
      supabase.from("ai_prompt_layers").select("*").order("layer_key").order("version", { ascending: false }),
      supabase.from("ai_persona_rules").select("*").order("sort_order"),
    ]);
    const err = layersRes.error || rulesRes.error;
    if (err) {
      setLoadError(err.message);
      if (mode === "initial") setInitialLoading(false);
      else setRefreshing(false);
      return;
    }
    const nextLayers = (layersRes.data as Layer[]) || [];
    const nextRules = (rulesRes.data as Rule[]) || [];
    setLayers(nextLayers);
    setRules(nextRules);
    CACHE = { layers: nextLayers, rules: nextRules, at: Date.now() };
    setInitialLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!hasFreshCache) void load("initial");
    else void load("refresh"); // silent revalidation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revalidate-on-focus
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && CACHE && Date.now() - CACHE.at > CACHE_TTL) {
        void load("refresh");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const versionsForKey = useMemo(
    () => layers.filter((l) => l.layer_key === selectedKey).sort((a, b) => b.version - a.version),
    [layers, selectedKey],
  );

  useEffect(() => {
    if (versionsForKey.length === 0) {
      setSelectedVersionId(null);
      setEditorContent("");
      return;
    }
    const pub = versionsForKey.find((v) => v.status === "published");
    const target = pub ?? versionsForKey[0];
    setSelectedVersionId(target.id);
    setEditorContent(target.content);
  }, [selectedKey, layers]);

  const selectedLayer = layers.find((l) => l.id === selectedVersionId) || null;
  const isDirty = !!selectedLayer && editorContent !== selectedLayer.content;

  const publishedCount = useMemo(() => {
    const set = new Set(layers.filter((l) => l.status === "published").map((l) => l.layer_key));
    return set.size;
  }, [layers]);

  const lastPublishedAt = useMemo(() => {
    const pubs = layers.filter((l) => l.status === "published").map((l) => l.updated_at).sort().reverse();
    if (!pubs[0]) return null;
    const d = new Date(pubs[0]);
    const diffH = Math.floor((Date.now() - d.getTime()) / 36e5);
    if (diffH < 1) return "just now";
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  }, [layers]);

  const totalKeys = LAYER_ORDER.length;
  const activeRulesCount = rules.filter((r) => r.is_active).length;

  // ── Layer mutations ───────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!selectedLayer) return;
    setSavingLayer(true);
    const maxVersion = Math.max(0, ...versionsForKey.map((v) => v.version));
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("ai_prompt_layers").insert({
      layer_key: selectedLayer.layer_key,
      title: selectedLayer.title,
      description: selectedLayer.description,
      content: editorContent,
      version: maxVersion + 1,
      status: "draft",
      created_by: userData.user?.id,
    });
    setSavingLayer(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Draft saved", description: `${LAYER_LABELS[selectedLayer.layer_key]} v${maxVersion + 1}` });
    await load("refresh");
  };

  const handlePublish = async () => {
    if (!selectedVersionId || !selectedLayer) return;
    setPublishing(true);
    // Optimistic status flip
    const prevStatus = selectedLayer.status;
    setLayers((prev) => prev.map((l) => (l.id === selectedVersionId ? { ...l, status: "published" } : l)));
    if (isDirty && prevStatus !== "published") {
      const { error: updErr } = await supabase
        .from("ai_prompt_layers")
        .update({ content: editorContent })
        .eq("id", selectedVersionId);
      if (updErr) {
        setLayers((prev) => prev.map((l) => (l.id === selectedVersionId ? { ...l, status: prevStatus } : l)));
        setPublishing(false);
        toast({ title: "Could not stage edits", description: updErr.message, variant: "destructive" });
        return;
      }
    }
    const { error } = await supabase.rpc("publish_prompt_layer", { p_id: selectedVersionId });
    setPublishing(false);
    if (error) {
      setLayers((prev) => prev.map((l) => (l.id === selectedVersionId ? { ...l, status: prevStatus } : l)));
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Published", description: "This version is now live across AI consumers." });
    await load("refresh");
  };

  const handleRevert = () => {
    if (!selectedLayer) return;
    setEditorContent(selectedLayer.content);
  };

  // ── Rule mutations (optimistic) ───────────────────────────────
  const updateRule = async (id: string, patch: Partial<Rule>) => {
    const prev = rules.find((r) => r.id === id);
    if (!prev) return;
    markRulePending(id, true);
    setRules((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("ai_persona_rules").update(patch).eq("id", id);
    markRulePending(id, false);
    if (error) {
      // rollback
      setRules((p) => p.map((r) => (r.id === id ? prev : r)));
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
  };

  const addRule = async () => {
    setAddingRule(true);
    const nextOrder = rules.length === 0 ? 1 : Math.max(...rules.map((r) => r.sort_order)) + 1;
    const { data, error } = await supabase
      .from("ai_persona_rules")
      .insert({ roman_numeral: "—", title: "New rule", body: "", sort_order: nextOrder, is_active: true })
      .select("*")
      .single();
    setAddingRule(false);
    if (error) {
      toast({ title: "Add failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setRules((prev) => [...prev, data as Rule]);
      toast({ title: "Law added", description: "Edit the numeral, title and body." });
    }
  };

  const deleteRule = async (id: string) => {
    const prev = rules;
    setRules((p) => p.filter((r) => r.id !== id));
    const { error } = await supabase.from("ai_persona_rules").delete().eq("id", id);
    if (error) {
      setRules(prev);
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Law removed" });
  };

  const moveRule = async (id: string, dir: -1 | 1) => {
    const sorted = [...rules].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((r) => r.id === id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    const a = sorted[idx];
    const aOrder = a.sort_order;
    const bOrder = swapWith.sort_order;
    const snapshot = rules;
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === a.id) return { ...r, sort_order: bOrder };
        if (r.id === swapWith.id) return { ...r, sort_order: aOrder };
        return r;
      }),
    );
    const results = await Promise.all([
      supabase.from("ai_persona_rules").update({ sort_order: bOrder }).eq("id", a.id),
      supabase.from("ai_persona_rules").update({ sort_order: aOrder }).eq("id", swapWith.id),
    ]);
    if (results.some((r) => r.error)) {
      setRules(snapshot);
      toast({ title: "Reorder failed", description: "Restored previous order.", variant: "destructive" });
    }
  };

  // ─── Early error state ───
  if (loadError && layers.length === 0 && rules.length === 0) {
    return (
      <div className="space-y-6 pb-12 pt-8">
        <AiEngineErrorCard
          message={loadError}
          onRetry={() => void load("initial")}
          retrying={initialLoading}
        />
      </div>
    );
  }

  // ─── Initial skeleton state ───
  if (initialLoading) {
    return (
      <div className="space-y-6 pb-12">
        <TopRefreshBar show />
        <HeaderSkeleton />
        <div className={`${GLASS} p-1.5 flex gap-1 overflow-x-auto`}>
          {TABS.map((t) => (
            <div
              key={t.value}
              className="h-9 w-28 rounded-full bg-primary/5 animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <RailSkeleton />
          <EditorSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <TopRefreshBar show={refreshing} />
      {/* ─── Hero header ─── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`${GLASS} relative overflow-hidden p-5 sm:p-6`}
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.10), hsl(var(--background) / 0.55))",
          boxShadow: "0 0 40px hsl(var(--primary) / 0.08), inset 0 0 0 1px hsl(var(--primary) / 0.08)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {/* Sigil */}
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 rounded-full blur-xl animate-pulse"
                style={{ background: "hsl(var(--primary) / 0.35)" }}
              />
              <div
                className="relative h-12 w-12 rounded-full flex items-center justify-center border"
                style={{
                  borderColor: "hsl(var(--primary) / 0.5)",
                  background: "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.25), transparent 70%)",
                }}
              >
                <Flame className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="min-w-0">
              <h1
                className="text-2xl sm:text-3xl leading-tight"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(45 70% 78%) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI Engine — Rishi Guru Protocol
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                The single source of truth that speaks through every reading.
              </p>
            </div>
          </div>

          {/* Status strip */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip icon={<FileText className="h-3 w-3" />} label="Layers" value={`${publishedCount}/${totalKeys}`} />
            <StatusChip icon={<Scale className="h-3 w-3" />} label="Laws" value={`${activeRulesCount}/12`} />
            {lastPublishedAt && (
              <StatusChip icon={<Upload className="h-3 w-3" />} label="Last published" value={lastPublishedAt} />
            )}
          </div>
        </div>
      </motion.header>

      {/* ─── Pill tabs ─── */}
      <div className={`${GLASS} p-1.5 flex gap-1 overflow-x-auto`}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="ai-engine-pill"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "hsl(var(--primary) / 0.12)",
                    border: "1px solid hsl(var(--primary) / 0.4)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="relative h-3.5 w-3.5" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Tab content ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {activeTab === "persona" && <PersonaGrid />}

          {activeTab === "layers" && (
            <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
              <LayerRail
                layers={layers}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
              />
              <EditorFrame
                loading={false}
                selectedKey={selectedKey}
                selectedLayer={selectedLayer}
                versionsForKey={versionsForKey}
                selectedVersionId={selectedVersionId}
                editorContent={editorContent}
                setEditorContent={setEditorContent}
                onSelectVersion={(id) => {
                  setSelectedVersionId(id);
                  const row = versionsForKey.find((x) => x.id === id);
                  if (row) setEditorContent(row.content);
                }}
                isDirty={isDirty}
                savingDraft={savingLayer}
                publishing={publishing}
                onRevert={handleRevert}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
              />
            </div>
          )}

          {activeTab === "voice" && <VoiceDemoView />}

          {activeTab === "engine" && <EngineView />}

          {activeTab === "rules" && (
            <CodexView
              rules={rules}
              setRules={setRules}
              loading={false}
              addingRule={addingRule}
              pendingRuleIds={pendingRuleIds}
              onAdd={addRule}
              onMove={moveRule}
              onUpdate={updateRule}
              onDelete={deleteRule}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Subcomponents
// ════════════════════════════════════════════════════════════════

function StatusChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
      style={{
        background: "hsl(var(--primary) / 0.06)",
        border: "1px solid hsl(var(--primary) / 0.3)",
      }}
    >
      <span className="text-primary/80">{icon}</span>
      <span className="text-muted-foreground uppercase tracking-[0.14em] text-[10px]">{label}</span>
      <span className="text-foreground font-mono">{value}</span>
    </div>
  );
}

function PersonaGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PERSONA_DIMENSIONS.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className={`${GLASS} p-5 group transition-shadow hover:shadow-[0_8px_32px_hsl(var(--primary)/0.15)]`}
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-full mb-4 mx-auto"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)",
                border: "1px solid hsl(var(--primary) / 0.3)",
              }}
            >
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3
              className="text-center text-xl mb-2 text-foreground"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {p.name}
            </h3>
            <p className="text-sm text-center text-foreground/75 leading-relaxed" style={{ fontFamily: "'Jost', sans-serif" }}>
              {p.body}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function LayerRail({
  layers, selectedKey, onSelect,
}: { layers: Layer[]; selectedKey: string; onSelect: (k: string) => void }) {
  return (
    <div className={`${GLASS} p-3`}>
      <div className="px-2 pb-2.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
        Manuscript
      </div>
      <div className="relative pl-3">
        {/* manuscript thread */}
        <div className="absolute left-[14px] top-1 bottom-1 w-px" style={{ background: "hsl(var(--primary) / 0.15)" }} />
        <div className="space-y-1">
          {LAYER_ORDER.map((key) => {
            const versions = layers.filter((l) => l.layer_key === key);
            const hasPublished = versions.some((v) => v.status === "published");
            const hasDraft = versions.some((v) => v.status === "draft");
            const isActive = selectedKey === key;
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className={`relative w-full text-left pl-6 pr-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/10"
                    : "hover:bg-background/60"
                }`}
                style={isActive ? { boxShadow: "inset 2px 0 0 hsl(var(--primary))" } : undefined}
              >
                {/* status dot on the thread */}
                <span
                  className="absolute left-[10px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
                  style={{
                    background: hasPublished ? "hsl(var(--primary))" : "transparent",
                    border: hasPublished ? "none" : `1px solid hsl(var(--primary) / ${hasDraft ? 0.6 : 0.25})`,
                    boxShadow: hasPublished ? "0 0 8px hsl(var(--primary) / 0.6)" : "none",
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span
                      className="text-primary/80 text-xs w-6 shrink-0 font-mono"
                    >
                      {LAYER_NUMERALS[key]}
                    </span>
                    <span className={`truncate text-sm ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                      {LAYER_LABELS[key]}
                    </span>
                  </div>
                  {hasPublished ? (
                    <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                  ) : hasDraft ? (
                    <CircleDashed className="h-3 w-3 text-amber-400 shrink-0" />
                  ) : null}
                </div>
                <div className="text-[10px] text-muted-foreground/70 pl-8 mt-0.5">
                  {versions.length === 0 ? "Not seeded" : `${versions.length} version${versions.length > 1 ? "s" : ""}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EditorFrame(props: {
  loading: boolean;
  selectedKey: string;
  selectedLayer: Layer | null;
  versionsForKey: Layer[];
  selectedVersionId: string | null;
  editorContent: string;
  setEditorContent: (s: string) => void;
  onSelectVersion: (id: string) => void;
  isDirty: boolean;
  savingDraft: boolean;
  publishing: boolean;
  onRevert: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const { selectedKey, selectedLayer, versionsForKey, selectedVersionId, editorContent, setEditorContent, isDirty, savingDraft, publishing, loading } = props;
  const busy = savingDraft || publishing;
  const statusColor = selectedLayer?.status === "published"
    ? "hsl(var(--primary))"
    : selectedLayer?.status === "draft" ? "rgb(251 191 36)" : "hsl(var(--muted-foreground))";

  return (
    <div className={`${GLASS} flex flex-col`}>
      {/* Header / breadcrumb */}
      <div className="px-5 py-4 border-b border-primary/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              Rishi Guru <span className="text-primary/60">/</span> Layer {LAYER_NUMERALS[selectedKey]} · {LAYER_LABELS[selectedKey]}
              {selectedLayer && <> <span className="text-primary/60">/</span> v{selectedLayer.version}</>}
            </div>
            <h2
              className="text-xl text-foreground mt-1"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {selectedLayer?.title || LAYER_LABELS[selectedKey]}
            </h2>
            {selectedLayer?.description && (
              <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "'Jost', sans-serif" }}>
                {selectedLayer.description}
              </p>
            )}
          </div>
          {versionsForKey.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {isDirty && (
                <span
                  className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full"
                  style={{ background: "rgb(251 191 36 / 0.15)", color: "rgb(251 191 36)", border: "1px solid rgb(251 191 36 / 0.4)" }}
                >
                  Unsaved
                </span>
              )}
              <span
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-mono"
                style={{ background: `${statusColor.replace("hsl(", "hsla(").replace(")", " / 0.12)")}`, color: statusColor, border: `1px solid ${statusColor.replace("hsl(", "hsla(").replace(")", " / 0.4)")}` }}
              >
                {selectedLayer?.status}
              </span>
              <Label className="text-xs text-muted-foreground sr-only">Version</Label>
              <Select
                value={selectedVersionId ?? undefined}
                onValueChange={props.onSelectVersion}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versionsForKey.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      v{v.version} · {v.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1">
        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading the manuscript…</div>
        ) : versionsForKey.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">No versions seeded for this layer.</div>
        ) : (
          <div
            className="relative rounded-xl p-1"
            style={{
              background: "hsl(var(--primary) / 0.04)",
              border: "1px solid hsl(var(--primary) / 0.25)",
              boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.08)",
            }}
          >
            <Textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="font-mono text-xs min-h-[480px] border-0 bg-transparent focus-visible:ring-0 resize-none"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Action bar */}
      {!loading && versionsForKey.length > 0 && (
        <div className="px-5 py-3 border-t border-primary/15 flex flex-wrap gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={props.onRevert} disabled={!isDirty || busy}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Revert
          </Button>
          <Button variant="outline" size="sm" onClick={props.onSaveDraft} disabled={busy || !isDirty}>
            {savingDraft ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            {savingDraft ? "Saving…" : "Save as new draft"}
          </Button>
          <Button
            size="sm"
            onClick={props.onPublish}
            disabled={busy || !selectedVersionId}
            className="relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(45 70% 60%) 100%)",
              color: "hsl(var(--background))",
            }}
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1.5" />
            )}
            {publishing
              ? "Publishing…"
              : selectedLayer?.status === "published" ? "Re-publish" : "Publish"}
          </Button>
        </div>
      )}
    </div>
  );
}

function VoiceDemoView() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {VOICE_DEMOS.map((d, i) => (
          <motion.div
            key={d.mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={`${GLASS} p-5 space-y-3`}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full font-mono"
                style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}
              >
                {d.mode}
              </span>
              <button
                title="Read aloud (coming soon)"
                className="text-muted-foreground/60 hover:text-primary transition-colors"
                disabled
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Q bubble */}
            <div
              className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-foreground/80 max-w-[85%]"
              style={{ background: "hsl(var(--muted) / 0.5)", fontFamily: "'Jost', sans-serif" }}
            >
              {d.q}
            </div>
            {/* A bubble */}
            <div
              className="rounded-2xl rounded-tr-sm px-3.5 py-3 text-sm leading-relaxed ml-auto max-w-[92%] italic"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))",
                border: "1px solid hsl(var(--primary) / 0.25)",
                color: "hsl(var(--foreground))",
                fontFamily: "'Cormorant Garamond', serif",
              }}
            >
              "{d.a}"
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Reference responses for tone calibration. Live model playground arrives in Phase 6.
      </p>
    </div>
  );
}

function EngineView() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Pipeline */}
      <div className={`${GLASS} p-5`}>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">
          Assembly pipeline
        </div>
        <h3 className="text-lg text-foreground mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          From source to system prompt
        </h3>
        <pre className="text-[11px] font-mono text-foreground/85 bg-background/40 border border-primary/15 rounded-lg p-4 overflow-x-auto leading-relaxed">
{`[Layers I–VII published]──┐
[chart_data.llm_summary]──┼──► assemble ──► system prompt ──► LLM
[12 active Laws]──────────┘`}
        </pre>
      </div>

      {/* Constellation */}
      <div className={`${GLASS} p-5`}>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">
          Consumers
        </div>
        <h3 className="text-lg text-foreground mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Where the Guru speaks
        </h3>
        <ConsumerConstellation />
      </div>
    </div>
  );
}

function ConsumerConstellation() {
  const n = CONSUMERS.length;
  const radius = 130;
  const cx = 180;
  const cy = 160;
  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox="0 0 360 320" className="w-full h-auto">
        {/* lines */}
        {CONSUMERS.map((c, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          return (
            <line
              key={c.name}
              x1={cx} y1={cy} x2={x} y2={y}
              stroke="hsl(var(--primary))"
              strokeOpacity={0.2}
              strokeDasharray="2 3"
            />
          );
        })}
        {/* center node */}
        <circle cx={cx} cy={cy} r={28} fill="hsl(var(--primary) / 0.18)" stroke="hsl(var(--primary))" strokeOpacity={0.6} />
        <circle cx={cx} cy={cy} r={36} fill="none" stroke="hsl(var(--primary))" strokeOpacity={0.2} />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="hsl(var(--primary))" fontSize={11} fontFamily="'Cormorant Garamond', serif">
          Guru
        </text>
        {/* satellites */}
        {CONSUMERS.map((c, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          return (
            <g key={c.name}>
              <rect
                x={x - 42} y={y - 11} width={84} height={22} rx={11}
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeOpacity={0.35}
              />
              <text x={x} y={y + 3} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={10} fontFamily="'Jost', sans-serif">
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CodexView(props: {
  rules: Rule[];
  setRules: React.Dispatch<React.SetStateAction<Rule[]>>;
  loading: boolean;
  addingRule: boolean;
  pendingRuleIds: Set<string>;
  onAdd: () => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onUpdate: (id: string, patch: Partial<Rule>) => void;
  onDelete: (id: string) => void;
}) {
  const { rules, setRules, loading, addingRule, pendingRuleIds, onAdd, onMove, onUpdate, onDelete } = props;
  const sorted = [...rules].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-3">
      <div className={`${GLASS} p-4 flex flex-wrap items-center justify-between gap-3`}>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Jost', sans-serif" }}>
          The hard rules every Guru response must obey. Lamp lit = active.
        </p>
        <Button size="sm" variant="outline" onClick={onAdd} disabled={addingRule}>
          {addingRule ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1.5" />
          )}
          {addingRule ? "Adding…" : "Add law"}
        </Button>
      </div>

      <div className={`${GLASS} divide-y divide-primary/10`}>
        {sorted.map((r, idx) => {
          const pending = pendingRuleIds.has(r.id);
          return (
          <div
            key={r.id}
            className={`group p-5 transition-opacity relative ${r.is_active ? "" : "opacity-50"} ${pending ? "opacity-70" : ""}`}
          >
            <div className="flex items-start gap-4">
              {/* Roman numeral margin */}
              <div className="w-14 shrink-0 text-right pt-1">
                <Input
                  value={r.roman_numeral}
                  onChange={(e) => setRules((p) => p.map((x) => (x.id === r.id ? { ...x, roman_numeral: e.target.value } : x)))}
                  onBlur={(e) => onUpdate(r.id, { roman_numeral: e.target.value })}
                  className="text-center text-2xl text-primary border-0 bg-transparent h-auto px-0 focus-visible:ring-0"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  value={r.title}
                  onChange={(e) => setRules((p) => p.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))}
                  onBlur={(e) => onUpdate(r.id, { title: e.target.value })}
                  className="font-medium border-0 bg-transparent px-0 h-auto focus-visible:ring-0 text-base text-foreground"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                />
                <Textarea
                  value={r.body}
                  onChange={(e) => setRules((p) => p.map((x) => (x.id === r.id ? { ...x, body: e.target.value } : x)))}
                  onBlur={(e) => onUpdate(r.id, { body: e.target.value })}
                  className="text-sm min-h-[64px] border border-primary/10 bg-background/40 focus-visible:ring-1 focus-visible:ring-primary/30 resize-none"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                />
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-1.5 pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                {/* Lamp toggle */}
                <button
                  onClick={() => onUpdate(r.id, { is_active: !r.is_active })}
                  title={r.is_active ? "Active" : "Inactive"}
                  className="h-7 w-7 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: r.is_active ? "hsl(var(--primary) / 0.15)" : "transparent",
                    border: `1px solid hsl(var(--primary) / ${r.is_active ? 0.5 : 0.2})`,
                    boxShadow: r.is_active ? "0 0 12px hsl(var(--primary) / 0.5)" : "none",
                  }}
                >
                  <Lightbulb className="h-3.5 w-3.5" style={{ color: r.is_active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                </button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(r.id, -1)} disabled={idx === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onMove(r.id, 1)} disabled={idx === sorted.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this law?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{r.title}" will be removed from the active law set. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(r.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
          );
        })}
        {sorted.length === 0 && !loading && (
          <div className="text-sm text-muted-foreground text-center py-12">No laws yet.</div>
        )}
      </div>
    </div>
  );
}
