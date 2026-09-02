import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface Rule {
  id: string;
  roman_numeral: string;
  title: string;
  body: string;
}

export default function CitedLawsStrip() {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    supabase
      .from("ai_persona_rules")
      .select("id, roman_numeral, title, body")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setRules((data ?? []) as Rule[]));
  }, []);

  if (rules.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-[14px] p-4 space-y-2.5"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-primary/80">
        <ScrollText className="h-3 w-3" />
        <span>Cited Laws · Rishi Guru Protocol</span>
      </div>
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap gap-1.5">
          {rules.map((r) => (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <span className="text-[10px] font-mono rounded-full border border-primary/30 bg-background/40 text-primary px-2 py-0.5 cursor-help">
                  {r.roman_numeral}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs">
                <p className="font-medium mb-1">{r.roman_numeral}. {r.title}</p>
                <p className="text-muted-foreground">{r.body}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </motion.div>
  );
}
