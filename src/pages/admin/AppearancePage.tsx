import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Save, Rocket, Trash2, RotateCcw, Plus, Upload, Download, Copy, X, Monitor, Tablet, Smartphone } from "lucide-react";
import UniverseBackground from "@/components/UniverseBackground";
import {
  AppearanceConfig,
  ConstellationSet,
  DEFAULT_APPEARANCE,
  DEFAULT_SCENE,
  DEFAULT_TEXT_LEGIBILITY,
  LayerKey,
  LumenLevel,
  PRESETS,
  SacredPattern,
  SceneOverride,
  TextLegibilitySettings,
  Viewport,
  normalizeConfig,
} from "@/lib/appearance-defaults";
import { invalidateAppearanceCache } from "@/hooks/useAppearanceConfig";

interface Row {
  id: string;
  route_pattern: string;
  name: string;
  config: AppearanceConfig;
  status: "draft" | "published" | "archived" | "preset";
  version: number;
  created_at: string;
}

const KNOWN_ROUTES = [
  "*", "/", "/dashboard", "/horoscope", "/ask", "/dreams",
  "/chart", "/timeline", "/compatibility", "/muhurta",
  "/remedies", "/profile", "/pricing", "/billing", "/onboarding", "/admin",
];

const LAYER_LABELS: Record<LayerKey, string> = {
  starFieldFar: "Star field (far)",
  starFieldMid: "Star field (mid)",
  nebula: "Nebula",
  milkyWay: "Milky Way",
  horizonGlow: "Horizon glow",
  cosmicDust: "Cosmic dust",
  shootingStars: "Shooting stars",
  aurora: "Aurora veil",
  spiralGalaxy: "Spiral galaxy",
  constellations: "Constellations",
  pulsars: "Pulsars",
  godRays: "God rays",
  sacredGeometry: "Sacred geometry",
  bokeh: "Foreground bokeh",
};

const CONSTELLATION_OPTS: { key: ConstellationSet; label: string }[] = [
  { key: "bigDipper", label: "Big Dipper" },
  { key: "orion", label: "Orion" },
  { key: "cassiopeia", label: "Cassiopeia" },
  { key: "triangle", label: "Triangle" },
];

const SACRED_PATTERNS: { key: SacredPattern; label: string }[] = [
  { key: "flowerOfLife", label: "Flower of Life" },
  { key: "sriYantra", label: "Sri Yantra" },
  { key: "metatron", label: "Metatron's Cube" },
  { key: "merkaba", label: "Merkaba" },
];

export default function AppearancePage() {
  const { user } = useAuth();
  const [route, setRoute] = useState("/");
  const [customRoute, setCustomRoute] = useState("");
  const [name, setName] = useState("Untitled");
  const [config, setConfig] = useState<AppearanceConfig>(DEFAULT_APPEARANCE);
  const [versions, setVersions] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<Viewport>("desktop");
  const [editingDevice, setEditingDevice] = useState<Viewport>("desktop");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVersions = async (r: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_appearance_config")
      .select("*")
      .eq("route_pattern", r)
      .order("version", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load versions", description: error.message, variant: "destructive" });
      return;
    }
    const rows = (data ?? []).map((d: any) => ({ ...d, config: normalizeConfig(d.config) })) as Row[];
    setVersions(rows);
    const published = rows.find((d) => d.status === "published");
    if (published) {
      setConfig(published.config);
      setName(published.name);
    } else {
      setConfig(DEFAULT_APPEARANCE);
      setName("Untitled");
    }
  };

  useEffect(() => { loadVersions(route); }, [route]);

  const updateLayer = (key: LayerKey, patch: Partial<AppearanceConfig["layers"][LayerKey]>) => {
    setConfig((c) => ({ ...c, layers: { ...c.layers, [key]: { ...c.layers[key], ...patch } } }));
  };
  const updateScene = (patch: Partial<NonNullable<AppearanceConfig["scene"]>>) => {
    setConfig((c) => ({ ...c, scene: { ...DEFAULT_SCENE, ...(c.scene ?? {}), ...patch } }));
  };
  const updateDeviceOverride = (device: Viewport, patch: Partial<SceneOverride>) => {
    if (device === "desktop") {
      // Desktop edits the base scene values directly.
      updateScene(patch);
      return;
    }
    setConfig((c) => {
      const cur = (c.scene?.[device] ?? {}) as SceneOverride;
      const next = { ...cur, ...patch };
      // Strip undefined values so the override stays minimal.
      const cleaned: SceneOverride = {};
      (Object.keys(next) as (keyof SceneOverride)[]).forEach((k) => {
        if (next[k] !== undefined) (cleaned as any)[k] = next[k];
      });
      return { ...c, scene: { ...DEFAULT_SCENE, ...(c.scene ?? {}), [device]: cleaned } };
    });
  };
  const clearDeviceOverride = (device: Viewport) => {
    if (device === "desktop") return;
    setConfig((c) => ({ ...c, scene: { ...DEFAULT_SCENE, ...(c.scene ?? {}), [device]: undefined } }));
  };
  const updateText = (patch: Partial<TextLegibilitySettings>) => {
    setConfig((c) => ({ ...c, text: { ...DEFAULT_TEXT_LEGIBILITY, ...(c.text ?? {}), ...patch } }));
  };
  const updateTextDevice = (device: Viewport, patch: Partial<TextLegibilitySettings>) => {
    if (device === "desktop") { updateText(patch); return; }
    setConfig((c) => {
      const cur = (c.text?.[device] ?? {}) as Partial<TextLegibilitySettings>;
      const next = { ...cur, ...patch };
      const cleaned: Partial<TextLegibilitySettings> = {};
      (Object.keys(next) as (keyof TextLegibilitySettings)[]).forEach((k) => {
        if (next[k] !== undefined) (cleaned as any)[k] = next[k];
      });
      return { ...c, text: { ...DEFAULT_TEXT_LEGIBILITY, ...(c.text ?? {}), [device]: cleaned } };
    });
  };
  const clearTextDevice = (device: Viewport) => {
    if (device === "desktop") return;
    setConfig((c) => ({ ...c, text: { ...DEFAULT_TEXT_LEGIBILITY, ...(c.text ?? {}), [device]: undefined } }));
  };
  const resetLayer = (key: LayerKey) =>
    setConfig((c) => ({ ...c, layers: { ...c.layers, [key]: DEFAULT_APPEARANCE.layers[key] } }));

  const saveDraft = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("site_appearance_config").insert([{
      route_pattern: route, name, config: config as any, status: "draft", created_by: user.id,
    }]);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Draft saved" });
    loadVersions(route);
  };

  const publish = async (cfg: AppearanceConfig = config, nameOverride?: string) => {
    if (!user) return;
    if (!confirm(`Publish this look to ${route}? Current published version will be archived.`)) return;
    setBusy(true);
    await supabase.from("site_appearance_config").update({ status: "archived" })
      .eq("route_pattern", route).eq("status", "published");
    const { error } = await supabase.from("site_appearance_config").insert([{
      route_pattern: route, name: nameOverride ?? name, config: cfg as any, status: "published", created_by: user.id,
    }]);
    setBusy(false);
    if (error) { toast({ title: "Publish failed", description: error.message, variant: "destructive" }); return; }
    invalidateAppearanceCache();
    toast({ title: "Published live", description: `${route} now uses this look.` });
    loadVersions(route);
  };

  const restoreVersion = (v: Row) => {
    setConfig(v.config);
    setName(v.name + " (restored)");
    toast({ title: "Restored to editor", description: `Version ${v.version} loaded as draft.` });
  };

  const publishVersion = (v: Row) => publish(v.config, v.name);

  const deleteVersion = async (v: Row) => {
    if (!confirm(`Delete version ${v.version}?`)) return;
    const { error } = await supabase.from("site_appearance_config").delete().eq("id", v.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    loadVersions(route);
  };

  // Import / Export JSON
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ name, route, config }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name.replace(/\s+/g, "-")}-${route.replace(/[^\w]+/g, "_")}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const cfg = normalizeConfig(parsed.config ?? parsed);
      setConfig(cfg);
      if (parsed.name) setName(parsed.name);
      toast({ title: "Imported", description: "Loaded into editor as draft." });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  };

  const previewBgConfig = useMemo(() => config, [config]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Appearance Studio</h1>
          <p className="text-sm text-muted-foreground">
            Curate the cosmic background per route. Every control is live — drag a slider and watch it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfig(DEFAULT_APPEARANCE)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={busy}>
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save draft
          </Button>
          <Button size="sm" onClick={() => publish()} disabled={busy}>
            <Rocket className="w-3.5 h-3.5 mr-1.5" /> Publish to {route}
          </Button>
        </div>
      </header>

      {/* Route + name */}
      <Card className="p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Route target</Label>
            <Select value={route} onValueChange={setRoute}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KNOWN_ROUTES.map((r) => (
                  <SelectItem key={r} value={r}>{r === "*" ? "* (global fallback)" : r}</SelectItem>
                ))}
                {customRoute && !KNOWN_ROUTES.includes(customRoute) && (
                  <SelectItem value={customRoute}>{customRoute}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Custom route (supports glob, e.g. /horoscope/*)</Label>
            <div className="flex gap-2">
              <Input value={customRoute} onChange={(e) => setCustomRoute(e.target.value)}
                placeholder="/some/path or /area/*" />
              <Button variant="outline" size="icon" onClick={() => customRoute && setRoute(customRoute)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Look name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sacred Cosmos v2" />
          </div>
        </div>
        {(() => {
          const pub = versions.find((v) => v.status === "published");
          return (
            <div className="text-xs flex items-center gap-2 pt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: pub ? "hsl(var(--gold))" : "hsl(var(--muted-foreground))" }}
              />
              {pub ? (
                <span className="text-muted-foreground">
                  <span className="text-foreground font-medium">{route}</span> is live as <span className="text-primary">{pub.name}</span> (v{pub.version}).
                </span>
              ) : (
                <span className="text-muted-foreground">
                  <span className="text-foreground font-medium">{route}</span> has no published look — it falls back to the global default. Publish a preset or save & publish a custom look to apply it here.
                </span>
              )}
            </div>
          );
        })()}
      </Card>

      {/* Live preview */}
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Label className="text-xs">Live preview</Label>
          <div className="inline-flex rounded-md border border-border/40 overflow-hidden">
            {([
              { key: "desktop", icon: Monitor, label: "Desktop" },
              { key: "tablet", icon: Tablet, label: "Tablet" },
              { key: "mobile", icon: Smartphone, label: "Phone" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPreviewDevice(opt.key)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs transition ${
                  previewDevice === opt.key
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={opt.label}
              >
                <opt.icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <div
            className={`relative rounded-xl overflow-hidden border border-border/50 bg-black ${
              previewDevice === "desktop"
                ? "w-full aspect-[16/9]"
                : previewDevice === "tablet"
                ? "w-[480px] max-w-full aspect-[4/3]"
                : "w-[260px] max-w-full aspect-[9/19]"
            }`}
          >
            <UniverseBackground configOverride={previewBgConfig} containerMode viewportOverride={previewDevice} />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* LEFT: Layers */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Layers</h3>
          <div className="space-y-3">
            {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => {
              const layer = config.layers[key];
              return (
                <div key={key} className="space-y-2 border-b border-border/30 pb-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{LAYER_LABELS[key]}</Label>
                    <div className="flex items-center gap-2">
                      <button title="Reset layer" onClick={() => resetLayer(key)}
                        className="text-muted-foreground hover:text-foreground text-xs">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <Switch checked={layer.enabled} onCheckedChange={(v) => updateLayer(key, { enabled: v })} />
                    </div>
                  </div>
                  {layer.enabled && (
                    <div className="space-y-2 pl-1">
                      {layer.density !== undefined && (
                        <SliderRow label="Density" value={layer.density} min={0} max={2} step={0.05}
                          onChange={(v) => updateLayer(key, { density: v })} />
                      )}
                      {layer.intensity !== undefined && (
                        <SliderRow label="Intensity" value={layer.intensity} min={0} max={1} step={0.05}
                          onChange={(v) => updateLayer(key, { intensity: v })} />
                      )}
                      {layer.opacity !== undefined && (
                        <SliderRow label="Opacity" value={layer.opacity} min={0} max={1} step={0.05}
                          onChange={(v) => updateLayer(key, { opacity: v })} />
                      )}
                      {layer.scale !== undefined && (
                        <SliderRow label="Scale" value={layer.scale} min={0.3} max={2} step={0.05}
                          onChange={(v) => updateLayer(key, { scale: v })} />
                      )}
                      {layer.count !== undefined && (
                        <SliderRow label="Count" value={layer.count} min={1} max={12} step={1}
                          onChange={(v) => updateLayer(key, { count: Math.round(v) })} />
                      )}
                      {layer.speed !== undefined && (
                        <SliderRow label="Speed" value={layer.speed} min={0} max={3} step={0.05}
                          onChange={(v) => updateLayer(key, { speed: v })} />
                      )}
                      {layer.size !== undefined && (
                        <SliderRow label="Size" value={layer.size} min={0.2} max={3} step={0.05}
                          onChange={(v) => updateLayer(key, { size: v })} />
                      )}
                      {layer.rotationSpeed !== undefined && (
                        <SliderRow label="Rotation" value={layer.rotationSpeed} min={0} max={3} step={0.05}
                          onChange={(v) => updateLayer(key, { rotationSpeed: v })} />
                      )}
                      {layer.armCount !== undefined && (
                        <SliderRow label="Arms" value={layer.armCount} min={2} max={6} step={1}
                          onChange={(v) => updateLayer(key, { armCount: Math.round(v) })} />
                      )}
                      {layer.driftSpeed !== undefined && (
                        <SliderRow label="Drift" value={layer.driftSpeed} min={0} max={3} step={0.05}
                          onChange={(v) => updateLayer(key, { driftSpeed: v })} />
                      )}
                      {layer.twinkle !== undefined && (
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Twinkle</Label>
                          <Switch checked={layer.twinkle} onCheckedChange={(v) => updateLayer(key, { twinkle: v })} />
                        </div>
                      )}
                      {layer.position && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-20">Position</Label>
                          <Select value={layer.position} onValueChange={(v) => updateLayer(key, { position: v as any })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top-left">Top-left</SelectItem>
                              <SelectItem value="top-right">Top-right</SelectItem>
                              <SelectItem value="bottom-left">Bottom-left</SelectItem>
                              <SelectItem value="bottom-right">Bottom-right</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {layer.frequency && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-20">Frequency</Label>
                          <Select value={layer.frequency} onValueChange={(v) => updateLayer(key, { frequency: v as any })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rare">Rare</SelectItem>
                              <SelectItem value="occasional">Occasional</SelectItem>
                              <SelectItem value="frequent">Frequent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {layer.pattern && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-20">Pattern</Label>
                          <Select value={layer.pattern} onValueChange={(v) => updateLayer(key, { pattern: v as SacredPattern })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SACRED_PATTERNS.map((p) => (
                                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {key === "constellations" && (
                        <div>
                          <Label className="text-xs mb-1 block">Sets</Label>
                          <div className="flex flex-wrap gap-1">
                            {CONSTELLATION_OPTS.map((opt) => {
                              const active = (layer.sets ?? []).includes(opt.key);
                              return (
                                <button key={opt.key} type="button"
                                  onClick={() => {
                                    const cur = new Set(layer.sets ?? []);
                                    if (cur.has(opt.key)) cur.delete(opt.key); else cur.add(opt.key);
                                    updateLayer(key, { sets: Array.from(cur) as ConstellationSet[] });
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-xs border ${
                                    active ? "bg-primary/20 border-primary text-primary" : "border-border/40 text-muted-foreground"
                                  }`}>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {(key === "starFieldFar" || key === "starFieldMid" || key === "cosmicDust" || key === "milkyWay" ||
                        key === "shootingStars" || key === "pulsars" || key === "constellations" || key === "sacredGeometry") && (
                        <ColorRow label="Tint" value={layer.color ?? ""} onChange={(v) => updateLayer(key, { color: v || undefined })} />
                      )}
                      {layer.palette && (
                        <PaletteRow palette={layer.palette}
                          onChange={(p) => updateLayer(key, { palette: p })} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-1">Presets</h3>
            <p className="text-xs text-muted-foreground mb-3">Click to load into editor, or publish directly to <span className="text-primary">{route}</span>.</p>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((p) => (
                <div key={p.name} className="flex items-stretch gap-2">
                  <button
                    onClick={() => { setConfig(normalizeConfig(p.config)); setName(p.name); }}
                    className="flex-1 text-left p-2 rounded-lg border border-border/40 hover:border-primary/40 transition">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.description}</div>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    title={`Publish "${p.name}" to ${route}`}
                    onClick={() => publish(normalizeConfig(p.config), p.name)}
                    disabled={busy}
                    className="shrink-0"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Color</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Base</Label>
                <Input value={config.color.base}
                  onChange={(e) => setConfig((c) => ({ ...c, color: { ...c.color, base: e.target.value } }))} />
              </div>
              <div>
                <Label className="text-xs">Accent</Label>
                <div className="flex gap-1">
                  <Input value={config.color.accent}
                    onChange={(e) => setConfig((c) => ({ ...c, color: { ...c.color, accent: e.target.value } }))} />
                  <input type="color" className="h-9 w-9 bg-transparent border border-border/40 rounded"
                    value={config.color.accent.startsWith("#") ? config.color.accent : "#C9A84C"}
                    onChange={(e) => setConfig((c) => ({ ...c, color: { ...c.color, accent: e.target.value } }))} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h3 className="text-sm font-medium">Scene</h3>
              <div className="inline-flex rounded-md border border-border/40 overflow-hidden text-xs">
                {([
                  { key: "desktop", icon: Monitor },
                  { key: "tablet", icon: Tablet },
                  { key: "mobile", icon: Smartphone },
                ] as const).map((opt) => {
                  const hasOverride = opt.key !== "desktop" && !!config.scene?.[opt.key];
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setEditingDevice(opt.key); setPreviewDevice(opt.key); }}
                      className={`flex items-center gap-1 px-2 py-1 transition relative ${
                        editingDevice === opt.key
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={`Edit ${opt.key}`}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      <span className="capitalize">{opt.key}</span>
                      {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {editingDevice !== "desktop" && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {config.scene?.[editingDevice]
                    ? `Editing ${editingDevice} override. Empty values fall back to auto-fit.`
                    : `No ${editingDevice} override yet. Move a slider to create one, or leave empty for auto-fit.`}
                </span>
                {config.scene?.[editingDevice] && (
                  <Button variant="ghost" size="sm" onClick={() => clearDeviceOverride(editingDevice)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset to auto
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {(() => {
                const ov = editingDevice === "desktop" ? null : (config.scene?.[editingDevice] ?? {}) as SceneOverride;
                const base = config.scene ?? DEFAULT_SCENE;
                const get = (k: keyof SceneOverride, fallback: number) =>
                  editingDevice === "desktop"
                    ? ((base as any)[k] ?? fallback)
                    : (ov?.[k] ?? (base as any)[k] ?? fallback);
                const set = (k: keyof SceneOverride, v: number) => updateDeviceOverride(editingDevice, { [k]: v } as any);
                return (
                  <>
                    <SliderRow label="Anim speed" value={get("animationSpeed", 1)} min={0.25} max={2} step={0.05}
                      onChange={(v) => set("animationSpeed", v)} />
                    <SliderRow label="Camera FOV" value={get("fov", 60)} min={40} max={95} step={1}
                      onChange={(v) => set("fov", Math.round(v))} />
                    <SliderRow label="Distance" value={get("cameraDistance", 5)} min={1} max={14} step={0.1}
                      onChange={(v) => set("cameraDistance", v)} />
                    <SliderRow label="Fog near" value={get("fogNear", 100)} min={10} max={500} step={5}
                      onChange={(v) => set("fogNear", Math.round(v))} />
                    <SliderRow label="Fog far" value={get("fogFar", 320)} min={10} max={500} step={5}
                      onChange={(v) => set("fogFar", Math.round(v))} />
                    <SliderRow label="Vignette" value={get("vignette", 0)} min={0} max={1} step={0.05}
                      onChange={(v) => set("vignette", v)} />
                    <SliderRow label="Grain" value={get("grain", 0)} min={0} max={0.4} step={0.02}
                      onChange={(v) => set("grain", v)} />
                    <SliderRow label="Blur (px)" value={get("blur", 0)} min={0} max={6} step={0.5}
                      onChange={(v) => set("blur", v)} />
                  </>
                );
              })()}
            </div>

            {editingDevice === "desktop" && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <Label className="text-xs">Auto-fit on smaller screens</Label>
                <Switch
                  checked={config.scene?.autoFit !== false}
                  onCheckedChange={(v) => updateScene({ autoFit: v })}
                />
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-medium">Text Legibility</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Make words brighter — adds a halo around glyphs in their own color, never repaints them.
                </p>
              </div>
              <div className="inline-flex rounded-md border border-border/40 overflow-hidden text-xs">
                {([
                  { key: "desktop", icon: Monitor },
                  { key: "tablet", icon: Tablet },
                  { key: "mobile", icon: Smartphone },
                ] as const).map((opt) => {
                  const hasOverride = opt.key !== "desktop" && !!config.text?.[opt.key];
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setEditingDevice(opt.key); setPreviewDevice(opt.key); }}
                      className={`flex items-center gap-1 px-2 py-1 transition relative ${
                        editingDevice === opt.key
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={`Edit ${opt.key}`}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      <span className="capitalize">{opt.key}</span>
                      {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {editingDevice !== "desktop" && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {config.text?.[editingDevice]
                    ? `Editing ${editingDevice} override.`
                    : `No ${editingDevice} override yet — falls back to desktop values.`}
                </span>
                {config.text?.[editingDevice] && (
                  <Button variant="ghost" size="sm" onClick={() => clearTextDevice(editingDevice)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                )}
              </div>
            )}

            {(() => {
              const baseT: TextLegibilitySettings = {
                legibility: config.text?.legibility ?? DEFAULT_TEXT_LEGIBILITY.legibility,
                scrim: config.text?.scrim ?? DEFAULT_TEXT_LEGIBILITY.scrim,
                weightBoost: config.text?.weightBoost ?? DEFAULT_TEXT_LEGIBILITY.weightBoost,
                twinkle: config.text?.twinkle ?? DEFAULT_TEXT_LEGIBILITY.twinkle,
              };
              const ovT = editingDevice === "desktop" ? null : (config.text?.[editingDevice] ?? {}) as Partial<TextLegibilitySettings>;
              const get = <K extends keyof TextLegibilitySettings>(k: K): TextLegibilitySettings[K] =>
                editingDevice === "desktop" ? baseT[k] : ((ovT?.[k] ?? baseT[k]) as TextLegibilitySettings[K]);
              const set = <K extends keyof TextLegibilitySettings>(k: K, v: TextLegibilitySettings[K]) =>
                updateTextDevice(editingDevice, { [k]: v } as Partial<TextLegibilitySettings>);

              return (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Brightness</Label>
                    <div className="inline-flex w-full rounded-md border border-border/40 overflow-hidden text-xs">
                      {(["off", "soft", "bright", "radiant"] as LumenLevel[]).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => set("legibility", lvl)}
                          className={`flex-1 px-2 py-1.5 capitalize transition ${
                            get("legibility") === lvl
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SliderRow
                    label="Scrim"
                    value={get("scrim") as number}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => set("scrim", v)}
                  />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Weight boost</Label>
                      <p className="text-[11px] text-muted-foreground">Smoother strokes — feels brighter without recoloring.</p>
                    </div>
                    <Switch checked={!!get("weightBoost")} onCheckedChange={(v) => set("weightBoost", v)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Heading twinkle</Label>
                      <p className="text-[11px] text-muted-foreground">Pulses opacity on h1/h2 — brightness only, no color shift.</p>
                    </div>
                    <Switch checked={!!get("twinkle")} onCheckedChange={(v) => set("twinkle", v)} />
                  </div>

                  {/* Auto-tuner — adjusts halo + scrim from real background luminance */}
                  <div className="rounded-lg border border-border/30 p-3 space-y-3 bg-background/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Auto-tune from background</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Samples the live cosmos 4×/sec and lifts halo + scrim when the backdrop gets bright (Milky Way, aurora, god-rays).
                        </p>
                      </div>
                      <Switch checked={get("auto") !== false} onCheckedChange={(v) => set("auto", v)} />
                    </div>

                    {get("auto") !== false && (
                      <>
                        <SliderRow
                          label="Strength"
                          value={(get("autoStrength") as number) ?? 1}
                          min={0}
                          max={1}
                          step={0.05}
                          onChange={(v) => set("autoStrength", v)}
                        />
                        <div>
                          <Label className="text-xs mb-1.5 block">Ceiling</Label>
                          <div className="inline-flex w-full rounded-md border border-border/40 overflow-hidden text-xs">
                            {(["soft", "bright", "radiant"] as LumenLevel[]).map((lvl) => (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => set("autoCeiling", lvl)}
                                className={`flex-1 px-2 py-1.5 capitalize transition ${
                                  ((get("autoCeiling") as LumenLevel) ?? "radiant") === lvl
                                    ? "bg-primary/20 text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                        <LumenReadout />
                      </>
                    )}
                  </div>


                  <div className="mt-2 rounded-lg border border-border/30 p-3 bg-background/40">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Preview</p>
                    <div
                      data-lumen={get("legibility")}
                      className={`${get("twinkle") ? "text-twinkle-on" : ""} ${get("weightBoost") ? "text-weight-boost" : ""}`}
                      style={{ ["--text-scrim" as any]: String(get("scrim")) }}
                    >
                      <h2 className="text-2xl font-cormorant lumen-target" style={{ color: "hsl(var(--gold))" }}>
                        Sacred Manuscript
                      </h2>
                      <p className="text-sm lumen-body mt-1" style={{ color: "hsl(var(--text-primary))" }}>
                        The same words, the same color — only their light has changed.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Interactions</h3>
            <div className="space-y-2">
              {(["mouseParallax", "deviceTilt", "clickRipples", "scrollDepth"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-sm capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</Label>
                  <Switch checked={config.interactions[k]}
                    onCheckedChange={(v) => setConfig((c) => ({ ...c, interactions: { ...c.interactions, [k]: v } }))} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Performance</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Mode</Label>
                <Select value={config.performance.mode}
                  onValueChange={(v) => setConfig((c) => ({ ...c, performance: { ...c.performance, mode: v as any } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (device tier)</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SliderRow label="Desktop budget" value={config.performance.maxParticleBudget}
                min={500} max={8000} step={100}
                onChange={(v) => setConfig((c) => ({ ...c, performance: { ...c.performance, maxParticleBudget: Math.round(v) } }))} />
              <SliderRow label="Tablet budget" value={config.performance.tabletBudget ?? 3000}
                min={300} max={6000} step={100}
                onChange={(v) => setConfig((c) => ({ ...c, performance: { ...c.performance, tabletBudget: Math.round(v) } }))} />
              <SliderRow label="Mobile budget" value={config.performance.mobileBudget ?? 1800}
                min={200} max={4000} step={100}
                onChange={(v) => setConfig((c) => ({ ...c, performance: { ...c.performance, mobileBudget: Math.round(v) } }))} />
              <div className="flex items-center justify-between">
                <Label className="text-sm">Respect reduced-motion</Label>
                <Switch checked={config.performance.respectReducedMotion}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, performance: { ...c.performance, respectReducedMotion: v } }))} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Versions for {route}</h3>
            {loading ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
              </div>
            ) : versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No versions yet for this route.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-auto">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between text-sm border border-border/30 rounded-lg p-2">
                    <div className="min-w-0">
                      <span className="font-medium">v{v.version}</span>
                      <span className="ml-2 text-xs uppercase tracking-wider text-muted-foreground">{v.status}</span>
                      <div className="text-xs text-muted-foreground truncate">{v.name}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" title="Restore to editor" onClick={() => restoreVersion(v)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      {v.status !== "published" && (
                        <Button variant="ghost" size="sm" title="Publish this version" onClick={() => publishVersion(v)}>
                          <Rocket className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteVersion(v)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function LumenReadout() {
  const [sample, setSample] = useState<{ avgY: number; variance: number; legibility: string; scrim: number } | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = (window as any).__lumenSample;
      if (s) setSample({ avgY: s.avgY, variance: s.variance, legibility: s.legibility, scrim: s.scrim });
      raf = window.setTimeout(tick, 250) as unknown as number;
    };
    tick();
    return () => clearTimeout(raf);
  }, []);
  if (!sample) {
    return (
      <div className="text-[11px] text-muted-foreground rounded-md border border-border/30 px-2 py-1.5">
        Sensor warming up — load a route with the universe background to see live readings.
      </div>
    );
  }
  return (
    <div className="text-[11px] text-muted-foreground rounded-md border border-border/30 px-2 py-1.5 font-mono">
      <span>luminance </span><span className="text-foreground">{sample.avgY.toFixed(3)}</span>
      <span> · variance </span><span className="text-foreground">{sample.variance.toFixed(3)}</span>
      <span> · applied </span><span className="text-primary">{sample.legibility}</span>
      <span> + scrim </span><span className="text-primary">{sample.scrim.toFixed(2)}</span>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs w-24 shrink-0">{label}</Label>
      <Slider className="flex-1" value={[value]} min={min} max={max} step={step}
        onValueChange={(v) => onChange(v[0])} />
      <span className="text-xs text-muted-foreground w-14 text-right tabular-nums">
        {step >= 1 ? value : value.toFixed(2)}
      </span>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-20">{label}</Label>
      <Input className="h-8 flex-1" placeholder="(default)" value={value} onChange={(e) => onChange(e.target.value)} />
      <input type="color" className="h-8 w-8 bg-transparent border border-border/40 rounded"
        value={value && value.startsWith("#") ? value : "#ffffff"}
        onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button onClick={() => onChange("")} className="text-muted-foreground"><X className="w-3 h-3" /></button>
      )}
    </div>
  );
}

function PaletteRow({ palette, onChange }: { palette: string[]; onChange: (p: string[]) => void }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">Palette</Label>
      <div className="flex flex-wrap gap-1 items-center">
        {palette.map((c, i) => (
          <div key={i} className="flex items-center gap-1 border border-border/40 rounded px-1 py-0.5">
            <input type="color" value={c.startsWith("#") ? c : "#ffffff"}
              onChange={(e) => { const next = [...palette]; next[i] = e.target.value; onChange(next); }}
              className="w-5 h-5 bg-transparent border-0" />
            <button onClick={() => onChange(palette.filter((_, j) => j !== i))} className="text-muted-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button onClick={() => onChange([...palette, "#ffffff"])}
          className="text-xs px-2 py-0.5 rounded border border-border/40 text-muted-foreground hover:text-foreground">
          + Add
        </button>
      </div>
    </div>
  );
}
