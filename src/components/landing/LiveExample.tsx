import { useScrollReveal } from "@/hooks/useScrollReveal";
import TwinkleText from "@/components/TwinkleText";

export default function LiveExample() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="scroll-reveal max-w-2xl mx-auto text-center">
        <TwinkleText as="h2" intensity="aura" className="text-3xl font-bold mb-3 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>See It In Action</TwinkleText>
        <div className="sacred-divider max-w-xs mx-auto" />
        <p className="mb-10" style={{ color: 'hsl(35 12% 55%)' }}>A real example of what the Guru delivers.</p>

        <div className="glass-stone rounded-2xl p-6 md:p-8 space-y-5 text-left">
          {/* User question */}
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-sm p-4 max-w-[85%]" style={{ background: 'hsl(38 78% 55% / 0.08)', border: '1px solid hsl(38 78% 55% / 0.2)' }}>
              <p className="text-xs mb-1 font-medium" style={{ color: 'hsl(35 12% 55%)' }}>You asked</p>
              <p className="text-sm" style={{ color: 'hsl(35 25% 88%)' }}>"Is this a good time to change jobs?"</p>
            </div>
          </div>

          {/* Oracle answer */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base" style={{ background: 'hsl(38 78% 55% / 0.15)', border: '1px solid hsl(38 78% 55% / 0.2)' }}>
              🕉️
            </div>
            <div className="rounded-2xl rounded-tl-sm p-4 max-w-[85%]" style={{ background: 'hsl(30 12% 8%)', border: '1px solid hsl(38 78% 55% / 0.15)' }}>
              <TwinkleText intensity="aura" className="text-xs mb-1 font-medium block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(38 78% 55%)' }}>Guru Insight</TwinkleText>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(35 25% 88% / 0.85)' }}>
                Your current <span style={{ color: 'hsl(38 78% 55%)', fontWeight: 500 }}>Saturn transit through the 10th house</span> indicates a period of professional restructuring. While the energy supports long-term career moves, <span style={{ color: 'hsl(38 78% 55%)', fontWeight: 500 }}>Jupiter's aspect on your 7th house</span> suggests waiting until after the current <span style={{ color: 'hsl(38 78% 55%)', fontWeight: 500 }}>Rahu-Ketu axis shift</span> for the most auspicious timing…
              </p>
              <p className="text-xs mt-3 italic" style={{ color: 'hsl(35 12% 55%)' }}>Sign up to see your full personalized reading →</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
