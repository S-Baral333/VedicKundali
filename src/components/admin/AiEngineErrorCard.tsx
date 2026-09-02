import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}

/**
 * Error state for the AI Engine page. Replaces silent-empty UI when the
 * initial fetch fails. Follows the project's inline retry pattern.
 */
export default function AiEngineErrorCard({ message, onRetry, retrying }: Props) {
  return (
    <div
      className="bg-background/40 backdrop-blur-[14px] border border-destructive/40 rounded-[20px] p-8 text-center max-w-xl mx-auto"
      style={{
        boxShadow:
          "0 0 30px hsl(var(--destructive) / 0.10), inset 0 0 0 1px hsl(var(--destructive) / 0.12)",
      }}
    >
      <div
        className="mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center"
        style={{
          background: "hsl(var(--destructive) / 0.12)",
          border: "1px solid hsl(var(--destructive) / 0.4)",
        }}
      >
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <h3
        className="text-xl text-foreground mb-2"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        The manuscript wouldn't open
      </h3>
      <p
        className="text-sm text-muted-foreground mb-5"
        style={{ fontFamily: "'Jost', sans-serif" }}
      >
        {message || "We couldn't reach the Guru protocol. Please retry."}
      </p>
      <Button onClick={onRetry} disabled={retrying} variant="outline" size="sm">
        <RotateCw
          className={`h-3.5 w-3.5 mr-1.5 ${retrying ? "animate-spin" : ""}`}
        />
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
