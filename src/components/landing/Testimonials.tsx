import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import TwinkleText from "@/components/TwinkleText";

const testimonials = [
  {
    name: "Priya S.",
    location: "Sydney",
    initials: "PS",
    quote: "The birth chart reading was incredibly accurate. It felt like the AI truly understood Vedic principles.",
    stars: 5,
  },
  {
    name: "Arjun M.",
    location: "London",
    initials: "AM",
    quote: "I've been using the Dream Oracle daily. The Swapna Shastra interpretations are fascinating and insightful.",
    stars: 5,
  },
  {
    name: "Kavya R.",
    location: "Melbourne",
    initials: "KR",
    quote: "Finally, a Jyotish tool that combines ancient wisdom with modern technology. Beautifully designed too!",
    stars: 4,
  },
];

export default function Testimonials() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="scroll-reveal max-w-5xl mx-auto text-center">
        <TwinkleText as="h2" intensity="aura" className="text-3xl font-bold mb-3 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>What Seekers Say</TwinkleText>
        <div className="sacred-divider max-w-xs mx-auto mb-12" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="sacred-card rounded-xl">
              <div className="p-6 text-center relative">
                <Quote className="h-6 w-6 absolute top-4 left-4" style={{ color: 'hsl(38 78% 55% / 0.2)' }} />
                <Avatar className="mx-auto mb-4 h-12 w-12 ring-2 ring-offset-2" style={{ '--tw-ring-color': 'hsl(38 78% 55% / 0.3)', '--tw-ring-offset-color': 'hsl(30 12% 10%)' } as React.CSSProperties}>
                  <AvatarFallback style={{ background: 'hsl(38 78% 55% / 0.1)', color: 'hsl(38 78% 55%)', fontFamily: 'Cinzel, serif' }}>
                    {t.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex justify-center gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4" style={{ fill: 'hsl(38 78% 55%)', color: 'hsl(38 78% 55%)' }} />
                  ))}
                </div>
                <p className="text-sm italic leading-relaxed mb-3" style={{ fontFamily: "'IM Fell English', serif", color: 'hsl(35 25% 88% / 0.7)' }}>"{t.quote}"</p>
                <p className="text-xs font-semibold" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>{t.name} — {t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
