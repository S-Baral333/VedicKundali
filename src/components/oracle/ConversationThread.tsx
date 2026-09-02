import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Turn {
  question: string;
  verdict: string;
  verdictColor: string;
}

interface Props {
  turns: Turn[];
}

export default function ConversationThread({ turns }: Props) {
  const [open, setOpen] = useState(false);
  if (turns.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border/60 bg-card/30 backdrop-blur-[14px] overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wider">Thread</span>
              <span className="text-foreground/70">{turns.length} previous turn{turns.length > 1 ? "s" : ""}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2 border-t border-border/40 pt-2">
            {turns.map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-muted-foreground shrink-0 mt-0.5">Q{i + 1}.</span>
                <span className="text-foreground/85 flex-1 line-clamp-2">{t.question}</span>
                <span className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold ${t.verdictColor}`}>
                  {t.verdict}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
