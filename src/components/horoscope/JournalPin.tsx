import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  validDate: string;
  period: string;
}

export default function JournalPin({ userId, validDate, period }: Props) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<number | null>(null);
  const savedTimer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounce.current) window.clearTimeout(debounce.current);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("horoscope_reactions")
        .select("journal_entry")
        .eq("user_id", userId)
        .eq("valid_date", validDate)
        .eq("period", period)
        .maybeSingle();
      if (!mounted.current) return;
      if (data?.journal_entry) {
        setText(data.journal_entry);
        setSaved(true);
        setOpen(true);
      }
    })();
  }, [userId, validDate, period]);

  const save = async (next: string) => {
    const { error } = await supabase
      .from("horoscope_reactions")
      .upsert(
        { user_id: userId, valid_date: validDate, period, journal_entry: next || null },
        { onConflict: "user_id,valid_date,period" }
      );
    if (!mounted.current) return;
    if (error) {
      toast({ title: "Couldn't save your note", variant: "destructive" });
      return;
    }
    setSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => {
      if (mounted.current) setSaved(false);
    }, 1800);
  };

  const handleChange = (v: string) => {
    setText(v);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => save(v), 800);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase hover:opacity-80 transition-opacity"
        style={{ color: "hsl(var(--mood-accent, 42 65% 55%))" }}
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        This happened today…
      </button>
    );
  }

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: "var(--mood-tint, rgba(201,168,76,0.04))", border: "0.5px solid hsl(var(--mood-accent, 42 65% 55%) / 0.22)" }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] tracking-[0.16em] uppercase" style={{ color: "hsl(var(--mood-accent))" }}>
          Today's note
        </p>
        {saved && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "hsl(var(--mood-accent))" }}>
            <Check className="h-3 w-3" /> saved
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="One line about what actually happened today…"
        className="w-full bg-transparent text-sm resize-none outline-none placeholder:opacity-60 leading-snug"
        style={{ color: "hsl(var(--text-primary))", fontFamily: "'Jost', sans-serif", fontWeight: 300, minHeight: "44px" }}
        maxLength={280}
        rows={2}
      />
    </div>
  );
}
