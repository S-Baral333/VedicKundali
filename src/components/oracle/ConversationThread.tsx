import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  if (turns.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border/60 bg-card/30 backdrop-blur-[14px] overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-wider">{t("pages:ui.conversationThread.thread", "Thread")}</span>
              <span className="text-foreground/70">{turns.length > 1 ? t("pages:ui.conversationThread.previousTurns", "{{count}} previous turns", { count: turns.length }) : t("pages:ui.conversationThread.previousTurn", "{{count}} previous turn", { count: turns.length })}</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2 border-t border-border/40 pt-2">
            {turns.map((turn, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-muted-foreground shrink-0 mt-0.5">{t("pages:ui.conversationThread.q", "Q{{n}}.", { n: i + 1 })}</span>
                <span className="text-foreground/85 flex-1 line-clamp-2">{turn.question}</span>
                <span className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold ${turn.verdictColor}`}>
                  {turn.verdict}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
