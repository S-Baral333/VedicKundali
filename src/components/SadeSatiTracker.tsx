import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Lock, BookOpen, Gem, Flame, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SIGNS_ORDER = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SATURN_INGRESS: { sign: string; start: Date }[] = [
  { sign: "Capricorn", start: new Date("2020-01-24") },
  { sign: "Aquarius", start: new Date("2023-01-17") },
  { sign: "Pisces", start: new Date("2025-03-29") },
  { sign: "Aries", start: new Date("2027-06-08") },
  { sign: "Taurus", start: new Date("2029-10-22") },
  { sign: "Gemini", start: new Date("2032-01-28") },
  { sign: "Cancer", start: new Date("2034-05-05") },
  { sign: "Leo", start: new Date("2036-08-07") },
];

function getSaturnSign(date: Date = new Date()) {
  for (let i = SATURN_INGRESS.length - 1; i >= 0; i--) {
    if (date >= SATURN_INGRESS[i].start) {
      const end = SATURN_INGRESS[i + 1]?.start || new Date("2038-01-01");
      return { sign: SATURN_INGRESS[i].sign, start: SATURN_INGRESS[i].start, end };
    }
  }
  return null;
}

type SadeSatiPhase = "rising" | "peak" | "setting" | null;

interface SadeSatiStatus {
  phase: SadeSatiPhase;
  phaseLabel: string;
  saturnSign: string;
  saturnStart: Date;
  saturnEnd: Date;
  guidance: string;
  progressPercent: number;
}

function getSadeSatiStatus(moonSign: string): SadeSatiStatus | null {
  const saturn = getSaturnSign();
  if (!saturn) return null;
  const moonIdx = SIGNS_ORDER.indexOf(moonSign);
  const saturnIdx = SIGNS_ORDER.indexOf(saturn.sign);
  if (moonIdx === -1 || saturnIdx === -1) return null;
  const dist = ((saturnIdx - moonIdx) + 12) % 12;
  let phase: SadeSatiPhase = null;
  let phaseLabel = "Not Active";
  let guidance = "Saturn is not transiting near your Moon sign. Enjoy this period of relative ease.";
  if (dist === 11) { phase = "rising"; phaseLabel = "Rising Phase"; guidance = "Saturn approaches your Moon — a time of inner transformation. Focus on spiritual practices, simplify commitments, and build resilience."; }
  else if (dist === 0) { phase = "peak"; phaseLabel = "Peak Phase"; guidance = "Saturn sits on your Moon — the most intense period. Practice patience, avoid major risks, and lean into discipline."; }
  else if (dist === 1) { phase = "setting"; phaseLabel = "Setting Phase"; guidance = "Saturn moves past your Moon — lessons consolidate. Harvest the wisdom gained and rebuild with renewed clarity."; }
  const now = new Date();
  const totalMs = saturn.end.getTime() - saturn.start.getTime();
  const elapsedMs = now.getTime() - saturn.start.getTime();
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  return { phase, phaseLabel, saturnSign: saturn.sign, saturnStart: saturn.start, saturnEnd: saturn.end, guidance, progressPercent };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface Remedy { id: string; title: string; description: string; mantra: string | null; gemstone: string | null; ritual: string | null; }

interface SadeSatiTrackerProps { moonSign: string; isElite: boolean; }

export default function SadeSatiTracker({ moonSign, isElite }: SadeSatiTrackerProps) {
  const status = getSadeSatiStatus(moonSign);
  const [remedies, setRemedies] = useState<Remedy[]>([]);
  const isActive = status?.phase !== null;

  useEffect(() => {
    if (!isElite || !isActive) return;
    supabase.from("remedies").select("id, title, description, mantra, gemstone, ritual").eq("planet", "Saturn").limit(2).then(({ data }) => { if (data) setRemedies(data); });
  }, [isElite, isActive]);

  if (!status) return null;

  if (!isElite) {
    return (
      <div className="glass-card-premium flex items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-lg" style={{ background: "hsl(var(--gold) / 0.2)" }} />
          <div className="relative w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.15)", border: "0.5px solid hsl(var(--glass-border))" }}>
            <Lock className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium flex items-center gap-2" style={{ color: "hsl(var(--text-primary))" }}>
            Sade Sati Tracker
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ background: "linear-gradient(90deg, hsl(var(--gold) / 0.2), hsl(var(--gold) / 0.1))", border: "0.5px solid hsl(var(--gold) / 0.35)", color: "hsl(var(--gold-light))" }}>
              <Zap className="h-3 w-3" /> Elite
            </span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: "hsl(var(--text-muted))" }}>
            Track Saturn's 7.5-year transit relative to your Moon sign.
          </p>
        </div>
        <Link to="/pricing">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" style={{ borderColor: "hsl(var(--gold) / 0.3)", color: "hsl(var(--gold))", background: "transparent" }}>
            <Zap className="h-3.5 w-3.5" /> Unlock
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card-premium elite-card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontWeight: 500, color: "hsl(var(--gold-light) / 0.9)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "hsl(var(--gold) / 0.12)", border: "0.5px solid hsl(var(--gold) / 0.10)" }}>♄</div>
          Sade Sati Tracker
        </div>
        {isActive && (
          <span className="text-[11px] px-3 py-1 rounded-full capitalize" style={{
            background: "hsl(var(--gold) / 0.10)",
            border: "0.5px solid hsl(var(--gold) / 0.22)",
            color: status.phase === "peak" ? "hsl(var(--gold))" : "hsl(var(--gold-light))",
            fontWeight: status.phase === "peak" ? 500 : 400,
          }}>
            {status.phaseLabel}
          </span>
        )}
      </div>
      <p className="mb-5" style={{ fontSize: "12.5px", letterSpacing: "0.02em", color: "hsl(var(--text-muted))" }}>
        Saturn transit relative to your Moon in {moonSign}
      </p>

      {/* Status grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Saturn In", value: status.saturnSign, variant: "" },
          { label: "Your Moon", value: moonSign, variant: "" },
          { label: "Status", value: isActive ? status.phaseLabel : "Inactive", variant: status.phase === "peak" ? "peak" : isActive ? "" : "inactive" },
        ].map((cell, i) => (
          <div key={i} className="p-3.5 rounded-xl" style={{ background: "hsl(0 0% 100% / 0.025)", border: "0.5px solid hsl(var(--gold) / 0.08)" }}>
            <p className="mb-1.5" style={{ fontSize: "9.5px", letterSpacing: "0.22em", textTransform: "uppercase", color: "hsl(var(--text-muted))" }}>{cell.label}</p>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "20px",
              fontWeight: cell.variant === "peak" ? 500 : 400,
              letterSpacing: "0.01em",
              color: cell.variant === "peak" ? "hsl(var(--gold))" : cell.variant === "inactive" ? "hsl(var(--text-secondary))" : "hsl(var(--gold-light))",
            }}>{cell.value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-[11px] tracking-wide mb-2" style={{ color: "hsl(var(--text-muted))" }}>
          <span>{formatDate(status.saturnStart)}</span>
          <span>Saturn in {status.saturnSign}</span>
          <span>{formatDate(status.saturnEnd)}</span>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.06)" }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${status.progressPercent}%`, background: "linear-gradient(90deg, hsl(var(--gold)), hsl(var(--gold-light)))" }} />
        </div>
      </div>

      {/* Guidance note */}
      <div className="mt-4 p-3 rounded-lg text-[13px] leading-relaxed" style={{
        background: "hsl(0 0% 100% / 0.02)",
        borderLeft: "2px solid hsl(var(--gold) / 0.25)",
        color: "hsl(var(--text-secondary))",
      }}>
        {status.guidance}
      </div>

      {/* Remedies */}
      {isActive && remedies.length > 0 && (
        <div className="space-y-3 pt-4 mt-4" style={{ borderTop: "0.5px solid hsl(var(--glass-border-soft))" }}>
          <p className="text-sm" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, color: "hsl(var(--text-primary))" }}>♄ Saturn Pacification Remedies</p>
          {remedies.map((r) => (
            <div key={r.id} className="rounded-xl p-3 space-y-2" style={{ border: "0.5px solid hsl(var(--glass-border-soft))", background: "hsl(0 0% 100% / 0.02)" }}>
              <p className="text-sm font-medium" style={{ color: "hsl(var(--text-primary))" }}>{r.title}</p>
              <p className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>{r.description}</p>
              <div className="grid gap-2">
                {r.mantra && (
                  <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--gold) / 0.04)", border: "0.5px solid hsl(var(--glass-border-soft))" }}>
                    <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
                    <div>
                      <p className="sacred-label mb-1">Mantra</p>
                      <p className="text-xs italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}>{r.mantra}</p>
                    </div>
                  </div>
                )}
                {r.gemstone && (
                  <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--gold) / 0.04)", border: "0.5px solid hsl(var(--glass-border-soft))" }}>
                    <Gem className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
                    <div>
                      <p className="sacred-label mb-1">Gemstone</p>
                      <p className="text-xs" style={{ color: "hsl(var(--text-primary))" }}>{r.gemstone}</p>
                    </div>
                  </div>
                )}
                {r.ritual && (
                  <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--gold) / 0.04)", border: "0.5px solid hsl(var(--glass-border-soft))" }}>
                    <Flame className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
                    <div>
                      <p className="sacred-label mb-1">Ritual</p>
                      <p className="text-xs" style={{ color: "hsl(var(--text-primary))" }}>{r.ritual}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <Link to="/remedies" className="view-link">View all remedies</Link>
        </div>
      )}
    </div>
  );
}
