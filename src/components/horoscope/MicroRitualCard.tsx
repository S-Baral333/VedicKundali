import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Flame, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hapticConfirm, hapticUndo } from "@/lib/haptics";
import { toast } from "@/hooks/use-toast";

interface Props {
  text?: string;
  userId?: string;
  validDate?: string;
  period?: string;
}

export default function MicroRitualCard({ text, userId, validDate, period }: Props) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Drives the one-shot celebration; cleared so re-renders don't replay it. */
  const [justDone, setJustDone] = useState(false);
  const mounted = useRef(true);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(celebrateTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!userId || !validDate || !period) return;
    (async () => {
      const { data } = await supabase
        .from("horoscope_reactions")
        .select("ritual_completed")
        .eq("user_id", userId)
        .eq("valid_date", validDate)
        .eq("period", period)
        .maybeSingle();
      if (!mounted.current) return;
      if (data?.ritual_completed) setDone(true);
    })();
  }, [userId, validDate, period]);

  const toggle = async () => {
    if (busy) return;
    const next = !done;
    setDone(next);

    // Fire the feedback off the tap, not off the round trip: the ritual is
    // already done in the world, and the save is optimistic anyway.
    if (next) {
      hapticConfirm();
      setJustDone(true);
      clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => {
        if (mounted.current) setJustDone(false);
      }, 650);
    } else {
      hapticUndo();
      setJustDone(false);
    }

    if (!userId || !validDate || !period) return; // local-only fallback
    setBusy(true);
    const { error } = await supabase
      .from("horoscope_reactions")
      .upsert(
        { user_id: userId, valid_date: validDate, period, ritual_completed: next },
        { onConflict: "user_id,valid_date,period" }
      );
    if (!mounted.current) return;
    setBusy(false);
    if (error) {
      toast({ title: t("pages:ui.microRitualCard.saveFailed", "Couldn't save ritual status"), variant: "destructive" });
      setDone(!next);
      setJustDone(false); // the celebration would be a lie once the save failed
    }
  };

  if (!text) return null;
  return (
    // The card sits inside nested padding and is only ~278px on a phone. Beside
    // the text, the fixed-width button left ~100px for the ritual itself, which
    // wrapped to one word per line — so it drops below the text when narrow.
    <div
      className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start gap-3 transition-all"
      style={{
        background: done ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.04)",
        border: "0.5px solid hsl(var(--gold) / 0.28)",
      }}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Flame className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(var(--gold))" }} />
        <div className="min-w-0 flex-1">
        <p className="text-[11px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "hsl(var(--gold))" }}>
          {t("pages:ui.microRitualCard.title", "60-Second Ritual")}
        </p>
        {/* The strike is always applied and only its colour changes, so it can
            transition — and unlike a drawn bar it crosses every wrapped line. */}
        <p
          className="text-[15px] leading-[1.6]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "hsl(var(--text-primary))",
            textDecorationLine: "line-through",
            textDecorationThickness: "1px",
            textDecorationColor: done ? "hsl(var(--gold) / 0.75)" : "transparent",
            opacity: done ? 0.6 : 1,
            transition: "text-decoration-color 420ms ease-out, opacity 420ms ease-out",
          }}
        >
          {text}
        </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`ritual-check shrink-0 self-end sm:self-auto inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] rounded-full text-[11px] tracking-wider uppercase border transition-colors disabled:opacity-60${justDone ? " is-celebrating" : ""}`}
        style={{
          color: done ? "hsl(var(--background))" : "hsl(var(--gold))",
          background: done ? "hsl(var(--gold))" : "transparent",
          borderColor: "hsl(var(--gold) / 0.4)",
        }}
        aria-label={done ? t("pages:ui.microRitualCard.markNotDone", "Mark not done") : t("pages:ui.microRitualCard.markDone", "Mark done")}
      >
        <Check className="ritual-check-icon h-3 w-3" />
        {done ? t("pages:ui.microRitualCard.done", "Done") : t("pages:ui.microRitualCard.markDone", "Mark done")}
      </button>
    </div>
  );
}
