import { useEffect, useRef, useState } from "react";
import { Flame, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  text?: string;
  userId?: string;
  validDate?: string;
  period?: string;
}

export default function MicroRitualCard({ text, userId, validDate, period }: Props) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
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
      toast({ title: "Couldn't save ritual status", variant: "destructive" });
      setDone(!next);
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
          60-Second Ritual
        </p>
        <p
          className="text-[15px] leading-[1.6]"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            color: "hsl(var(--text-primary))",
            textDecoration: done ? "line-through" : "none",
            opacity: done ? 0.6 : 1,
          }}
        >
          {text}
        </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className="shrink-0 self-end sm:self-auto inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] rounded-full text-[11px] tracking-wider uppercase border transition-colors disabled:opacity-60"
        style={{
          color: done ? "hsl(var(--background))" : "hsl(var(--gold))",
          background: done ? "hsl(var(--gold))" : "transparent",
          borderColor: "hsl(var(--gold) / 0.4)",
        }}
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        <Check className="h-3 w-3" />
        {done ? "Done" : "Mark done"}
      </button>
    </div>
  );
}
