import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Check, X } from "lucide-react";
import TwinkleText from "@/components/TwinkleText";

const rows = [
  "Birth chart based",
  "Dasha timing",
  "Real planetary transits",
  "AI explanations",
];

export default function WhyDifferent() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="scroll-reveal max-w-2xl mx-auto text-center">
        <TwinkleText as="h2" intensity="aura" className="text-3xl font-bold mb-3 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>Why This Guru Is Different</TwinkleText>
        <div className="sacred-divider max-w-xs mx-auto mb-10" />

        <div className="sacred-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(38 78% 55% / 0.1)' }}>
                <th className="text-left p-4 font-normal" style={{ color: 'hsl(35 12% 55%)' }}>Feature</th>
                <th className="p-4 font-normal" style={{ color: 'hsl(35 12% 55%)' }}>Most Apps</th>
                <th className="p-4 font-semibold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.15em', color: 'hsl(var(--gold))' }}>KUNDALI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={i < rows.length - 1 ? { borderBottom: '1px solid hsl(38 78% 55% / 0.08)' } : {}}>
                  <td className="text-left p-4" style={{ color: 'hsl(35 25% 88%)' }}>{row}</td>
                  <td className="p-4 text-center">
                    <X className="h-5 w-5 mx-auto" style={{ color: '#e05c3a' }} />
                  </td>
                  <td className="p-4 text-center">
                    <Check className="h-5 w-5 mx-auto" style={{ color: 'hsl(38 78% 55%)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
