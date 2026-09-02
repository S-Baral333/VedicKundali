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
    <div
      className="rounded-2xl p-4 flex items-start gap-3 transition-all"
      style={{
        background: done ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.04)",
        border: "0.5px solid hsl(var(--gold) / 0.28)",
      }}
    >
      <div className="mt-0.5">
        <Flame className="h-4 w-4" style={{ color: "hsl(var(--gold))" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] tracking-[0.18em] uppercase mb-1.5" style={{ color: "hsl(var(--gold))" }}>
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
      <button
        onClick={toggle}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase border transition-colors disabled:opacity-60"
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
