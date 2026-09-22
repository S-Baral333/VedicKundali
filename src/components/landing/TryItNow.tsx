import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Moon, Sun, ArrowRight } from "lucide-react";
import TwinkleText from "@/components/TwinkleText";

const previews = [
  {
    key: "daily",
    title: "Daily Cosmic Insight",
    description: "Discover how today's planetary movements affect you.",
    icon: Star,
    emoji: "✨",
    link: "/preview/horoscope",
  },
  {
    key: "dream",
    title: "Dream Interpretation",
    description: "Decode the spiritual meaning behind your dreams.",
    icon: Moon,
    emoji: "🌙",
    link: "/preview/dream",
  },
  {
    key: "chart",
    title: "Instant Vedic Birth Chart",
    description: "Generate your complete Kundali with AI interpretation.",
    icon: Sun,
    emoji: "🕉️",
    link: "/preview/chart",
  },
];

export default function TryItNow() {
  const { t } = useTranslation();
  return (
    <section className="relative py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm mb-2" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: 'hsl(38 78% 55% / 0.7)' }}>{t("pages:ui.tryItNow.noSignup", "No signup needed")}</p>
          <TwinkleText as="h2" intensity="aura" className="text-3xl md:text-4xl font-bold mb-3 block" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>
            {t("pages:ui.tryItNow.title", "Try It Now — Free Preview")}
          </TwinkleText>
          <div className="sacred-divider max-w-xs mx-auto" />
          <p style={{ color: 'hsl(35 12% 55%)' }}>
            {t("pages:ui.tryItNow.subtitle", "Experience the power of Vedic astrology. Get a real AI-generated reading instantly.")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {previews.map((p) => (
            <Link key={p.link} to={p.link}>
              <div className="sacred-card rounded-xl hover:border-[hsl(38,78%,55%,0.3)] transition-all hover:scale-[1.03] cursor-pointer group h-full">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="text-4xl">{p.emoji}</div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}>{t(`pages:ui.tryItNow.${p.key}Title`, p.title)}</h3>
                    <p className="text-sm" style={{ color: 'hsl(35 12% 55%)' }}>{t(`pages:ui.tryItNow.${p.key}Desc`, p.description)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all" style={{ color: 'hsl(38 78% 55%)' }}>
                    {t("pages:ui.tryItNow.tryFree", "Try Free")} <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
