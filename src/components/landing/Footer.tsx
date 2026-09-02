import { Link } from "react-router-dom";
import { Sparkles, CalendarDays, MessageCircleQuestion, Heart, BookOpen, Mail, Github, Twitter, Instagram } from "lucide-react";
import KundaliMark from "@/components/KundaliMark";

const PRODUCT_LINKS = [
  { label: "Birth Chart", to: "/chart", icon: Sparkles },
  { label: "Today's Horoscope", to: "/horoscope", icon: CalendarDays },
  { label: "Ask the Guru", to: "/ask", icon: MessageCircleQuestion },
  { label: "Compatibility", to: "/compatibility", icon: Heart },
  { label: "Dream Interpretation", to: "/dreams", icon: BookOpen },
];

const COMPANY_LINKS = [
  { label: "Pricing", to: "/pricing" },
  { label: "Install App", to: "/install" },
  { label: "Sign In", to: "/login" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", to: "#" },
  { label: "Terms of Service", to: "#" },
  { label: "Contact", to: "mailto:hello@kundali.app" },
];

export default function Footer() {
  return (
    <footer className="app-footer mt-24 safe-bottom">
      <div className="max-w-[1160px] mx-auto px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* ── Brand column ── */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <KundaliMark size={36} glow className="transition-transform duration-500 group-hover:rotate-[8deg]" />
              <span className="brand-wordmark text-lg">KUNDALI</span>
            </Link>
            <p
              className="mt-4 max-w-sm leading-relaxed"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                color: "hsl(var(--text-secondary))",
                fontSize: "15px",
              }}
            >
              Your stars. Your story. Your dharma. Precise Vedic astrology rooted in
              Sanskrit wisdom — guided by ancient rishi traditions and modern
              precision.
            </p>

            {/* Socials */}
            <div className="mt-6 flex items-center gap-2.5">
              <a href="#" aria-label="Twitter" className="footer-social">
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a href="#" aria-label="Instagram" className="footer-social">
                <Instagram className="h-3.5 w-3.5" />
              </a>
              <a href="#" aria-label="GitHub" className="footer-social">
                <Github className="h-3.5 w-3.5" />
              </a>
              <a href="mailto:hello@kundali.app" aria-label="Email" className="footer-social">
                <Mail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* ── Product column ── */}
          <div className="md:col-span-3">
            <h4 className="footer-heading">Explore</h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <li key={l.to}>
                    <Link to={l.to} className="footer-link">
                      <Icon className="h-3 w-3 opacity-60" />
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Company column ── */}
          <div className="md:col-span-2">
            <h4 className="footer-heading">Company</h4>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="footer-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Legal column ── */}
          <div className="md:col-span-2">
            <h4 className="footer-heading">Legal</h4>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.label}>
                  {l.to.startsWith("mailto:") || l.to === "#" ? (
                    <a href={l.to} className="footer-link">
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.to} className="footer-link">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="mt-12 pt-6 flex flex-col md:flex-row items-center md:items-end justify-between gap-3"
          style={{ borderTop: "0.5px solid hsl(var(--gold) / 0.10)" }}
        >
          <p
            className="text-[11px]"
            style={{
              fontFamily: "'Jost', sans-serif",
              color: "hsl(var(--text-muted) / 0.85)",
              letterSpacing: "0.04em",
            }}
          >
            © {new Date().getFullYear()} Kundali. All rights reserved.
          </p>
          <p
            className="text-[11px] italic"
            style={{
              fontFamily: "'IM Fell English', serif",
              color: "hsl(var(--gold) / 0.55)",
              letterSpacing: "0.06em",
            }}
          >
            Crafted with reverence · Made under starlight
          </p>
        </div>
      </div>
    </footer>
  );
}
