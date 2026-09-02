import { useEffect, useRef, useState, useMemo } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Star, Moon, Sparkles, Zap } from "lucide-react";
import TwinkleText from "@/components/TwinkleText";

function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const triggered = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setValue(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

export default function StatsBar() {
  const sectionRef = useScrollReveal();

  const todayCount = useMemo(() => {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return 200 + (seed % 300);
  }, []);

  const stats = [
    { value: 12500, suffix: "+", label: "Charts Generated", icon: Star },
    { value: 8200, suffix: "+", label: "Dreams Interpreted", icon: Moon },
    { value: 27, suffix: "", label: "Nakshatras Covered", icon: Sparkles },
    { value: todayCount, suffix: "", label: "Readings Today", icon: Zap },
  ];

  return (
    <section className="py-16 px-6" style={{ borderTop: '1px solid hsl(38 78% 55% / 0.12)', borderBottom: '1px solid hsl(38 78% 55% / 0.12)', background: 'linear-gradient(180deg, transparent, hsl(38 78% 55% / 0.02), transparent)' }}>
      <div ref={sectionRef} className="scroll-reveal max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <StatItem key={i} target={s.value} suffix={s.suffix} label={s.label} icon={s.icon} />
        ))}
      </div>
    </section>
  );
}

function StatItem({ target, suffix, label, icon: Icon }: { target: number; suffix: string; label: string; icon: React.ElementType }) {
  const { value, ref } = useCountUp(target);
  return (
    <div ref={ref} className="flex flex-col items-center">
      <Icon className="h-5 w-5 mb-2" style={{ color: 'hsl(38 78% 55%)' }} />
      <TwinkleText intensity="star" className="text-3xl font-bold" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(38 78% 55%)' }}>
        {value.toLocaleString()}{suffix}
      </TwinkleText>
      <p className="text-sm mt-1" style={{ color: 'hsl(35 12% 55%)' }}>{label}</p>
    </div>
  );
}
