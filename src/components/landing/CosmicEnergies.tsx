import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Progress } from "@/components/ui/progress";
import TwinkleText from "@/components/TwinkleText";

const planets = [
  { name: "Saturn", emoji: "🪐", keyword: "Discipline", value: 65 },
  { name: "Jupiter", emoji: "♃", keyword: "Growth", value: 88 },
  { name: "Venus", emoji: "♀", keyword: "Relationships", value: 42 },
  { name: "Mars", emoji: "♂", keyword: "Action", value: 71 },
];

export default function CosmicEnergies() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="scroll-reveal max-w-2xl mx-auto text-center">
        <TwinkleText as="h2" intensity="aura" className="text-3xl font-bold mb-3 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>Current Cosmic Energies</TwinkleText>
        <div className="sacred-divider max-w-xs mx-auto" />
        <p className="mb-10" style={{ color: 'hsl(35 12% 55%)' }}>Live planetary influence levels based on today's transits.</p>

        <div className="sacred-card rounded-2xl p-8 space-y-6">
          {planets.map((p) => (
            <div key={p.name} className="flex items-center gap-4">
              <span className="text-2xl w-8 text-center">{p.emoji}</span>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>{p.name}</span>
                  <span className="text-xs italic" style={{ fontFamily: "'IM Fell English', serif", color: 'hsl(35 12% 55%)' }}>{p.keyword}</span>
                </div>
                <div className="w-full h-2.5 rounded-full" style={{ background: 'hsl(30 12% 15%)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.value}%`, background: 'linear-gradient(90deg, hsl(38 78% 55%), hsl(40 60% 72%))' }} />
                </div>
              </div>
              <span className="text-xs w-8 text-right" style={{ color: 'hsl(35 12% 55%)' }}>{p.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
