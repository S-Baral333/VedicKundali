import React from "react";
import { astroGlossary, astroTermsRegex } from "@/lib/astro-glossary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AstroTextProps {
  text: string;
  className?: string;
}

const AstroText: React.FC<AstroTextProps> = ({ text, className }) => {
  if (!text) return null;

  // Reset regex state
  astroTermsRegex.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // Track which terms we've already tooltipped to avoid repetition
  const seen = new Set<string>();

  while ((match = astroTermsRegex.exec(text)) !== null) {
    const term = match[0];
    const termLower = term.toLowerCase();
    const idx = match.index;

    // Add text before match
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }

    // Find glossary entry (case-insensitive lookup)
    const glossaryKey = Object.keys(astroGlossary).find(
      (k) => k.toLowerCase() === termLower
    );

    if (glossaryKey && !seen.has(termLower)) {
      seen.add(termLower);
      parts.push(
        <Tooltip key={key++}>
          <TooltipTrigger asChild>
            <span
              className="cursor-help"
              style={{
                borderBottom: "1px dotted hsl(38 78% 55% / 0.4)",
                color: "inherit",
              }}
            >
              {term}
            </span>
          </TooltipTrigger>
          <TooltipContent variant="astro">
            <p className="font-medium mb-0.5" style={{ color: "hsl(38 78% 55%)", fontSize: "12px", letterSpacing: "0.04em" }}>
              {glossaryKey}
            </p>
            <p style={{ color: "hsl(38 45% 90%)", fontSize: "13px", lineHeight: 1.5, fontWeight: 300 }}>
              {astroGlossary[glossaryKey]}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    } else {
      // Already shown tooltip for this term, just render plain
      parts.push(term);
    }

    lastIndex = idx + term.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <TooltipProvider delayDuration={200}>
      <span className={className}>{parts}</span>
    </TooltipProvider>
  );
};

export default AstroText;
