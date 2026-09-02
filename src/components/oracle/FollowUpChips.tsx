import { MessageCircle } from "lucide-react";
import { FOLLOW_UP_CHIPS_BY_MODE } from "@/lib/oracle-suggestions";

interface Props {
  mode: string;
  onPick: (q: string) => void;
  disabled?: boolean;
}

export default function FollowUpChips({ mode, onPick, disabled }: Props) {
  const chips = FOLLOW_UP_CHIPS_BY_MODE[mode] ?? FOLLOW_UP_CHIPS_BY_MODE.insight;
  return (
    <div className="space-y-1.5 px-2">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <MessageCircle className="h-3 w-3" />
        Go deeper:
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-foreground/85 hover:border-primary/60 hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
