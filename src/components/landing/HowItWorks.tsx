import { Calendar, BarChart3, BookOpen } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import TwinkleText from "@/components/TwinkleText";

const steps = [
  { icon: Calendar, title: "Enter Your Birth Details", desc: "Date, time, and place of birth." },
  { icon: BarChart3, title: "AI Generates Your Kundali", desc: "Planets, houses, nakshatras, and dashas calculated." },
  { icon: BookOpen, title: "Receive Personalized Guidance", desc: "Ancient Jyotish wisdom interpreted by AI." },
];

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="scroll-reveal max-w-4xl mx-auto text-center">
        <TwinkleText as="h2" intensity="aura" className="text-3xl font-bold mb-3 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>How It Works</TwinkleText>
        <div className="sacred-divider max-w-xs mx-auto mb-16" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 78% 55% / 0.3), transparent)' }} />

          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-glow-pulse" style={{ background: 'hsl(38 78% 55% / 0.1)', border: '1px solid hsl(38 78% 55% / 0.3)' }}>
                <TwinkleText intensity="star" className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'hsl(38 78% 55%)', color: 'hsl(30 15% 6%)' }}>
                  {i + 1}
                </TwinkleText>
                <step.icon className="h-7 w-7" style={{ color: 'hsl(38 78% 55%)' }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>{step.title}</h3>
              <p className="text-sm" style={{ color: 'hsl(35 12% 55%)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
