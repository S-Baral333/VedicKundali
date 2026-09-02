import { useEffect, useState } from "react";
import { Flame, MessageCircle, CloudOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Reaction = "resonated" | "sort_of" | "not_really";

interface Props {
  userId: string;
  validDate: string;
  period: string;
}

const OPTIONS: { value: Reaction; label: string; icon: typeof Flame; color: string }[] = [
  { value: "resonated",  label: "Spot on",    icon: Flame,         color: "#E0A23A" },
  { value: "sort_of",    label: "Sort of",    icon: MessageCircle, color: "#9C9C9C" },
  { value: "not_really", label: "Not really", icon: CloudOff,      color: "#6E8AB8" },
];

export default function ReactionStrip({ userId, validDate, period }: Props) {
  const [current, setCurrent] = useState<Reaction | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("horoscope_reactions")
        .select("reaction")
        .eq("user_id", userId)
        .eq("valid_date", validDate)
        .eq("period", period)
        .maybeSingle();
      setCurrent((data?.reaction as Reaction) || null);
    })();
  }, [userId, validDate, period]);

  const choose = async (value: Reaction) => {
    if (busy) return;
    setBusy(true);
    const prev = current;
    const next = current === value ? null : value;
    setCurrent(next);
    const { error } = next === null
      ? await supabase
          .from("horoscope_reactions")
          .update({ reaction: null })
          .eq("user_id", userId)
          .eq("valid_date", validDate)
          .eq("period", period)
      : await supabase
          .from("horoscope_reactions")
          .upsert(
            { user_id: userId, valid_date: validDate, period, reaction: next },
            { onConflict: "user_id,valid_date,period" }
          );
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't save your reaction", variant: "destructive" });
      setCurrent(prev);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "hsl(var(--text-muted))" }}>
        Did this reading resonate?
      </p>
      <div className="flex items-center gap-2">
        {OPTIONS.map(({ value, label, icon: Icon, color }) => {
          const active = current === value;
          return (
            <button
              key={value}
              onClick={() => choose(value)}
              disabled={busy}
              className="px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300 flex items-center gap-1.5 hover:scale-105 disabled:opacity-50"
              style={{
                background: active ? `${color}22` : "rgba(255,255,255,0.03)",
                color: active ? color : "hsl(var(--text-secondary))",
                border: `0.5px solid ${active ? `${color}66` : "hsl(var(--gold) / 0.15)"}`,
              }}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
