import { Star, Moon, Sun } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import TwinkleText from "@/components/TwinkleText";

const features = [
  {
    icon: Star,
    title: "Vedic Birth Chart",
    desc: "Get a complete Kundali with planetary positions, Nakshatras, Yogas, and AI-interpreted readings personalized to your life.",
  },
  {
    icon: Moon,
    title: "Dream Oracle",
    desc: "Describe your dream and receive ancient Swapna Shastra interpretations combined with modern AI insight.",
  },
  {
    icon: Sun,
    title: "Daily Horoscope",
    desc: "Personalized daily and weekly predictions based on your moon sign and current planetary transits.",
  },
];

export default function FeatureShowcase() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="scroll-reveal max-w-5xl mx-auto text-center">
        <TwinkleText as="h2" intensity="aura" className="text-3xl font-bold mb-4 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>Divine Features</TwinkleText>
        <div className="sacred-divider max-w-xs mx-auto" />
        <p className="mb-12 max-w-xl mx-auto" style={{ color: 'hsl(35 12% 55%)' }}>
          Harness the power of Vedic astrology enhanced with modern AI for deeper, more personal insights.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="sacred-card rounded-xl transition-all duration-300 hover:scale-[1.02]" style={{ borderColor: 'hsl(38 78% 55% / 0.15)' }}>
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(38 78% 55% / 0.1)' }}>
                  <f.icon className="h-8 w-8" style={{ color: 'hsl(38 78% 55%)', animationDelay: `${i * 0.5}s` }} />
                </div>
                <TwinkleText as="h3" intensity="aura" className="font-semibold text-lg mb-2 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>{f.title}</TwinkleText>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(35 12% 55%)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
