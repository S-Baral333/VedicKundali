import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type HistoryFilter = "all" | "favorable" | "nuanced" | "neutral" | "unfavorable";

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "favorable", label: "Favorable" },
  { id: "nuanced", label: "Nuanced" },
  { id: "neutral", label: "Neutral" },
  { id: "unfavorable", label: "Unfavorable" },
];

interface Props {
  search: string;
  onSearch: (v: string) => void;
  filter: HistoryFilter;
  onFilter: (f: HistoryFilter) => void;
}

export default function HistoryToolbar({ search, onSearch, filter, onFilter }: Props) {
  return (
    <div className="space-y-2.5 pb-3 border-b border-border/40 mb-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search past readings…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilter(f.id)}
            className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
              filter === f.id
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-card/40 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
