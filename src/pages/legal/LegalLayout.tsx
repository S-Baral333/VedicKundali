import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import KundaliMark from "@/components/KundaliMark";
import { LEGAL } from "@/lib/legal";

/**
 * Shared shell for the Privacy Policy and Terms of Service.
 *
 * These routes are deliberately public — they sit outside ProtectedRoute so
 * that anyone can read them without an account, which is both the point of a
 * legal notice and a requirement of Google's OAuth consent screen review.
 */
export default function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      <div className="relative z-10 max-w-[720px] mx-auto px-5 py-10 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:text-[hsl(var(--gold))]"
          style={{ color: "hsl(var(--text-muted))" }}
        >
          <ArrowLeft className="h-4 w-4" /> {LEGAL.entity}
        </Link>

        <header className="mb-10">
          <KundaliMark size={44} glow />
          <h1
            className="mt-5 text-3xl sm:text-4xl"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}
          >
            {title}
          </h1>
          <p className="mt-2 text-xs" style={{ color: "hsl(var(--text-muted))" }}>
            {LEGAL.lastUpdated}
          </p>
          <p
            className="mt-5 text-[15px] leading-relaxed"
            style={{ color: "hsl(var(--text-secondary))" }}
          >
            {intro}
          </p>
        </header>

        <div className="legal-prose space-y-8">{children}</div>

        <footer
          className="mt-14 pt-6 text-[13px] leading-relaxed"
          style={{ borderTop: "0.5px solid hsl(var(--gold) / 0.16)", color: "hsl(var(--text-muted))" }}
        >
          <p>
            Questions about this document? Write to{" "}
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              style={{ color: "hsl(var(--gold))" }}
            >
              {LEGAL.contactEmail}
            </a>
            .
          </p>
          <div className="mt-4 flex gap-5">
            <Link to="/privacy" className="hover:text-[hsl(var(--gold))] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[hsl(var(--gold))] transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** One numbered section of a legal document. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2
        className="text-xl mb-3"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--text-primary))" }}
      >
        {heading}
      </h2>
      <div
        className="space-y-3 text-[15px] leading-[1.75]"
        style={{ color: "hsl(var(--text-secondary))" }}
      >
        {children}
      </div>
    </section>
  );
}
