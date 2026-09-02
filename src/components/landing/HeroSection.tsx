import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Moon, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const words = ["Birth Charts", "Dream Interpretation", "Daily Guidance", "Dasha Analysis"];

const trustSignals = [
  "Birth Chart Based",
  "Real Planetary Transits",
  "Ancient Jyotish Principles",
];

export default function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16">
      {/* Subtle glow orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl animate-glow-pulse" style={{ background: 'hsl(var(--gold) / 0.04)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-3xl animate-glow-pulse" style={{ background: 'hsl(270 56% 35% / 0.04)', animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 text-center max-w-2xl animate-fade-in-up">
        {/* OM symbol */}
        <div className="text-5xl mb-5 inline-block twinkle-star animate-glow-pulse" style={{ filter: 'drop-shadow(0 0 20px hsl(var(--gold) / 0.4))' }}>🕉️</div>

        <h1 className="twinkle-aura" style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(36px, 5vw, 60px)",
          fontWeight: 300,
          lineHeight: 1.1,
          background: 'linear-gradient(135deg, hsl(var(--gold)), hsl(var(--gold-light)), hsl(var(--gold)))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
        }}>
          Free Kundali — Your Vedic Birth Chart, Decoded by AI
        </h1>

        <p className="text-base md:text-lg mb-2 max-w-lg mx-auto" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: 'hsl(var(--text-secondary))' }}>
          Generate your Janam Kundali, daily Vedic horoscope, and dasha analysis instantly — rooted in authentic Jyotish.
        </p>

        {/* Word rotator */}
        <div className="h-8 mb-8 overflow-hidden relative">
          <p key={wordIndex} className="text-lg animate-fade-in-up" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'hsl(var(--gold))' }}>
            {words[wordIndex]}
          </p>
        </div>

        <div className="glass-card-premium rounded-2xl p-6 inline-flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link to="/preview/oracle">
            <Button size="lg" className="gap-2 text-base px-8 border-0" style={{ background: 'linear-gradient(135deg, hsl(var(--gold)), hsl(var(--gold-dim)))', color: 'hsl(var(--ink))' }}>
              <Star className="h-4 w-4" />
              Get Your Free Reading
            </Button>
          </Link>
          <Link to="/preview/dream">
            <Button size="lg" variant="outline" className="gap-2 text-base px-8" style={{ borderColor: 'hsl(var(--gold) / 0.4)', color: 'hsl(var(--gold))', background: 'transparent' }}>
              <Moon className="h-4 w-4" />
              Interpret a Dream
            </Button>
          </Link>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm" style={{ color: 'hsl(var(--text-muted))' }}>
          {trustSignals.map((signal) => (
            <span key={signal} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" style={{ color: 'hsl(var(--gold))' }} />
              {signal}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
