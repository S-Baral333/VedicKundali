import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, X } from "lucide-react";

// Detected JSON key → human-readable phase label
const SECTION_COPY: Record<string, string> = {
  astrologer_greeting:   "Composing the greeting",
  direct_answer:         "Writing the direct answer",
  narrative_reading:     "Weaving the narrative",
  planetary_insight:     "Naming the strongest planet",
  current_energy:        "Reading the active dasha",
  timing:                "Locking the timing window",
  reasoning_simple:      "Listing reasons in plain words",
  technical_details:     "Citing classical factors",
  evidence_factors:      "Stamping the evidence",
  suggested_action:      "Forming the guidance",
  remedial_suggestion:   "Selecting a Vedic remedy",
  caution:               "Checking for cautions",
};

// Try to pull a human-readable string from in-flight JSON. We ignore field
// names, brace/quote scaffolding and JSON delimiters so what the user sees
// is real prose, not raw markup.
function extractReadable(buffer: string): string {
  if (!buffer) return "";

  // Collect every quoted string value, in order.
  const out: string[] = [];
  let i = 0;
  let lastKey = "";
  let stringIsKey = false; // true when the next quoted string is a property name

  while (i < buffer.length) {
    const ch = buffer[i];

    if (ch === "{" || ch === ",") {
      stringIsKey = true; // next quoted string will be a key
      i++;
      continue;
    }
    if (ch === ":") {
      stringIsKey = false;
      i++;
      continue;
    }

    if (ch === '"') {
      // Read string contents, honoring escapes
      let j = i + 1;
      let buf = "";
      let closed = false;
      while (j < buffer.length) {
        const c = buffer[j];
        if (c === "\\" && j + 1 < buffer.length) {
          const n = buffer[j + 1];
          if (n === "n") buf += "\n";
          else if (n === "t") buf += "  ";
          else if (n === '"') buf += '"';
          else if (n === "\\") buf += "\\";
          else buf += n;
          j += 2;
          continue;
        }
        if (c === '"') { closed = true; j++; break; }
        buf += c;
        j++;
      }

      if (stringIsKey && closed) {
        lastKey = buf;
        stringIsKey = false;
      } else if (!stringIsKey) {
        // Skip key-only structural fields that are noisy in prose
        if (lastKey !== "verdict" && lastKey !== "confidence_note") {
          out.push(buf + (closed ? "\n\n" : ""));
        } else if (lastKey === "confidence_note" && closed) {
          out.push(buf + "\n\n");
        }
      }

      i = j;
      continue;
    }

    i++;
  }
  return out.join("").trim();
}

interface Props {
  liveBuffer: string;
  section: string;
  status: "streaming" | "error";
  elapsedMs: number;
  error?: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

export default function LiveOracleStream({
  liveBuffer,
  section,
  status,
  elapsedMs,
  error,
  onCancel,
  onRetry,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const text = extractReadable(liveBuffer);
  const phaseLabel = SECTION_COPY[section] || (text ? "The Guru is writing" : "Opening the Guru channel");
  const isFailed = status === "error";
  const seconds = Math.floor(elapsedMs / 1000);

  // Auto-scroll to bottom as tokens arrive (unless the user scrolled up)
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text, autoScroll]);

  return (
    <Card
      className="glass-card overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--background) / 0.55))",
        boxShadow: "0 0 28px hsl(var(--primary) / 0.10), inset 0 0 0 1px hsl(var(--primary) / 0.18)",
      }}
    >
      <CardContent className="py-6 space-y-4">
        {/* Header: sigil + phase + timer */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 70%)",
                animation: "glow-pulse 2.4s ease-in-out infinite",
              }}
            />
            <span
              className="relative text-2xl"
              style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.7))" }}
            >
              🔱
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={phaseLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-sm font-medium text-foreground/90 truncate"
              >
                {isFailed ? "Guru channel interrupted" : `${phaseLabel}…`}
              </motion.p>
            </AnimatePresence>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Live · {seconds}s elapsed
            </p>
          </div>
          {onCancel && !isFailed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-destructive shrink-0"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Live text */}
        {isFailed ? (
          <div className="flex items-start gap-2 text-sm text-destructive/90 border border-destructive/30 rounded-md p-3 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error || "The Guru reading could not complete. Try again in a moment."}</span>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onWheel={(e) => {
              // If user scrolls up, pause auto-scroll; resume when near bottom
              const el = e.currentTarget;
              const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              setAutoScroll(nearBottom);
            }}
            className="max-h-[420px] overflow-y-auto pr-2 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {text ? (
              <>
                {text}
                <span className="inline-block w-[8px] h-[18px] ml-0.5 align-middle bg-primary/80 animate-pulse" />
              </>
            ) : (
              <span className="text-muted-foreground italic">
                Consulting your chart{".".repeat(((seconds % 3) + 1))}
              </span>
            )}
          </div>
        )}

        {/* Retry on failure */}
        {isFailed && onRetry && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry reading
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
