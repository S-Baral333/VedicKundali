import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import TwinkleText from "@/components/TwinkleText";

export default function FinalCTA() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Gold glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full blur-3xl animate-glow-pulse" style={{ background: 'hsl(38 78% 55% / 0.04)' }} />
      </div>

      <div ref={ref} className="scroll-reveal relative z-10 max-w-xl mx-auto">
        <div className="sacred-card rounded-2xl p-10 text-center relative overflow-hidden">
          {/* OM watermark */}
          <span className="sacred-om-watermark">ॐ</span>

          <TwinkleText as="h2" intensity="star" className="text-3xl md:text-4xl font-bold mb-4 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(38 78% 55%)' }}>
            Unlock Your Destiny Today
          </TwinkleText>
          <p className="mb-8" style={{ color: 'hsl(35 12% 55%)' }}>
            Discover what the stars say about your future.
          </p>
          <Link to="/preview/oracle">
            <Button size="lg" className="gap-2 text-base px-10 border-0" style={{ background: 'linear-gradient(135deg, hsl(38 78% 55%), hsl(36 50% 45%))', color: 'hsl(30 15% 6%)' }}>
              <Star className="h-4 w-4" />
              Get Your Free Guru Reading
            </Button>
          </Link>
          <p className="text-xs mt-4" style={{ color: 'hsl(35 12% 55% / 0.7)' }}>Free to get started. No credit card required.</p>
        </div>
      </div>
    </section>
  );
}
