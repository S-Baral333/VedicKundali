import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import KundaliMark from "@/components/KundaliMark";
import { LEGAL, LEGAL_CONTACTS } from "@/lib/legal";

export interface TocEntry {
  id: string;
  label: string;
}

const DOCS = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/refunds", label: "Refunds" },
];

/**
 * Shared shell for the three legal documents.
 *
 * These routes are deliberately public — they sit outside ProtectedRoute so
 * anyone can read them without an account, which is both the point of a legal
 * notice and a requirement of Google's OAuth consent screen review.
 *
 * The table of contents tracks the reader's position with an IntersectionObserver
 * rather than scroll maths, so it stays correct with sections of wildly
 * different heights. It is hidden below the desktop breakpoint, where the
 * document reads as one column.
 */
export default function LegalLayout({
  title,
  titleAccent,
  meta,
  toc,
  children,
}: {
  title: string;
  titleAccent: string;
  meta: { label: string; value: string }[];
  toc: TocEntry[];
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");
  const { pathname } = useLocation();

  useEffect(() => {
    const sections = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;

    // At the foot of the page the final section can never reach the observer's
    // band, so it would stay unhighlighted however far you scrolled. Bottoming
    // out is itself the signal that you have arrived at the last one.
    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48;

    const observer = new IntersectionObserver(
      (entries) => {
        if (atBottom()) {
          setActiveId(toc[toc.length - 1].id);
          return;
        }
        // The topmost intersecting section wins, so scrolling up highlights
        // the heading you are arriving at rather than the one you left.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { threshold: 0.1, rootMargin: "-80px 0px -55% 0px" }
    );
    sections.forEach((s) => observer.observe(s));

    const onScroll = () => {
      if (atBottom()) setActiveId(toc[toc.length - 1].id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [toc]);

  return (
    <div className="legal-root min-h-screen">
      {/* Document switcher */}
      <nav className="legal-nav">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <KundaliMark size={26} />
          <span className="legal-wordmark">{LEGAL.brand}</span>
        </Link>
        <div className="flex gap-1 sm:gap-4 overflow-x-auto">
          {DOCS.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              className={`legal-nav-link${pathname === d.to ? " is-active" : ""}`}
            >
              {d.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <header className="legal-hero">
        <span className="legal-tag">Legal Document</span>
        <h1 className="legal-title">
          {title} <em>{titleAccent}</em>
        </h1>
        <div className="legal-meta">
          {meta.map((m) => (
            <div key={m.label} className="legal-meta-item">
              <span className="legal-meta-label">{m.label}</span>
              <span className="legal-meta-value">{m.value}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="legal-layout">
        <aside className="legal-sidebar">
          <p className="legal-sidebar-label">Contents</p>
          <nav>
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className={`legal-toc-link${activeId === t.id ? " is-active" : ""}`}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="legal-content">{children}</main>
      </div>

      <footer className="legal-footer">
        <div>
          <span className="legal-wordmark">{LEGAL.brand}</span>
          <p className="legal-footer-copy">
            © {new Date().getFullYear()} {LEGAL.entity} · ABN {LEGAL.abn}
          </p>
        </div>
        <div className="legal-footer-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/refunds">Refund Policy</Link>
          <a href={`mailto:${LEGAL_CONTACTS.legal}`}>Legal Contact</a>
          <Link to="/">
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Back to app
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ── Building blocks ─────────────────────────────────────────────────────── */

/** A numbered section. `eyebrow` is the small label above the heading. */
export function Section({
  id,
  eyebrow,
  heading,
  children,
}: {
  id: string;
  eyebrow: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="legal-section">
      <p className="legal-eyebrow">{eyebrow}</p>
      <h2 className="legal-h2">{heading}</h2>
      <div className="legal-body">{children}</div>
    </section>
  );
}

/** Accent-bordered aside for a caveat or emphasis. */
export function Callout({ children }: { children: ReactNode }) {
  return <div className="legal-callout">{children}</div>;
}

/** The blue statutory banner that opens each document. */
export function StatuteNotice({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <div className="legal-statute">
      <p className="legal-statute-tag">{tag}</p>
      <p>{children}</p>
    </div>
  );
}

/** Grid of "what we collect"-style cards. */
export function DataGrid({ cards }: { cards: { title: string; items: string[] }[] }) {
  return (
    <div className="legal-grid-2">
      {cards.map((c) => (
        <div key={c.title} className="legal-card">
          <p className="legal-card-title">{c.title}</p>
          <div className="legal-card-items">
            {c.items.map((i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Three-across grid of short titled blocks (rights, contacts). */
export function TileGrid({ tiles }: { tiles: { title: string; desc: string }[] }) {
  return (
    <div className="legal-grid-3">
      {tiles.map((t) => (
        <div key={t.title} className="legal-card">
          <p className="legal-card-title">{t.title}</p>
          <p className="legal-card-desc">{t.desc}</p>
        </div>
      ))}
    </div>
  );
}

export type ScenarioVerdict = "yes" | "no" | "maybe";

/** Refund scenarios: a coloured stripe, a verdict badge and the detail. */
export function ScenarioList({
  scenarios,
}: {
  scenarios: { verdict: ScenarioVerdict; badge: string; title: string; detail: string }[];
}) {
  return (
    <div className="legal-scenarios">
      {scenarios.map((s) => (
        <div key={s.title} className={`legal-scenario is-${s.verdict}`}>
          <div className="legal-scenario-stripe" />
          <div className="legal-scenario-body">
            <span className={`legal-badge is-${s.verdict}`}>{s.badge}</span>
            <p className="legal-scenario-title">{s.title}</p>
            <p className="legal-scenario-detail">{s.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Numbered steps down a vertical rule. */
export function Timeline({ steps }: { steps: { step: string; desc: ReactNode }[] }) {
  return (
    <div className="legal-timeline">
      {steps.map((s) => (
        <div key={s.step} className="legal-timeline-item">
          <p className="legal-timeline-step">{s.step}</p>
          <p className="legal-timeline-desc">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

/** Label/value rows, e.g. refund method → processing time. */
export function PairRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="legal-pairs">
      {rows.map((r) => (
        <div key={r.label} className="legal-pair">
          <span className="legal-pair-label">{r.label}</span>
          <span className="legal-pair-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
