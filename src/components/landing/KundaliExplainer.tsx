import { useScrollReveal } from "@/hooks/useScrollReveal";
import TwinkleText from "@/components/TwinkleText";
import { Link } from "react-router-dom";

/**
 * SEO content section — ~600 words of genuine educational content about Kundali.
 * Targets long-tail keywords: "what is kundali", "janam kundali meaning",
 * "vedic vs western astrology", "free kundali online", "12 houses", "dasha".
 * Real value for readers, ranking signal for Google.
 */
export default function KundaliExplainer() {
  const ref = useScrollReveal();

  return (
    <section
      ref={ref}
      className="scroll-reveal py-24 px-6"
      aria-labelledby="kundali-explainer-heading"
    >
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <h2 id="kundali-explainer-heading" className="sr-only">What is a Kundali?</h2>
          <TwinkleText
            as="div"
            intensity="aura"
            className="text-3xl md:text-4xl font-bold mb-3 block"
            style={{ fontFamily: 'Cinzel, serif', color: 'hsl(35 25% 88%)' }}
          >
            What is a Kundali?
          </TwinkleText>
          <div className="sacred-divider max-w-xs mx-auto" />
          <p className="text-base md:text-lg" style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: 'hsl(35 12% 65%)' }}>
            The ancient blueprint of your life, written in the stars at the moment you took your first breath.
          </p>
        </header>

        <div className="sacred-card rounded-2xl p-8 md:p-10 space-y-8" style={{ color: 'hsl(35 18% 78%)', fontFamily: "'Jost', sans-serif", lineHeight: 1.75 }}>

          <article>
            <h3 className="text-xl md:text-2xl mb-3" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(38 78% 65%)' }}>
              The Janam Kundali — Your Cosmic Birth Certificate
            </h3>
            <p>
              A <strong>Kundali</strong> — also known as <em>Janam Kundali</em>, <em>Janam Patrika</em>, or simply a Vedic birth chart — is a precise astronomical map of where the Sun, Moon, and the seven visible planets stood at the exact moment of your birth. Drawn as a square or wheel divided into <strong>12 houses</strong> and overlaid against <strong>27 nakshatras</strong> (lunar mansions), it is the foundation of <em>Jyotish</em>, the 5,000-year-old science of light from the Vedas.
            </p>
            <p className="mt-3">
              Every Kundali is unique. Even twins born minutes apart can carry meaningfully different charts, because the rising sign — the <em>Lagna</em> — shifts roughly every two hours, reshaping the entire pattern of houses, planetary lords, and life themes.
            </p>
          </article>

          <article>
            <h3 className="text-xl md:text-2xl mb-3" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(38 78% 65%)' }}>
              Vedic Kundali vs Western Astrology
            </h3>
            <p>
              The most important difference: a Vedic Kundali uses the <strong>sidereal zodiac</strong> with the <strong>Lahiri Ayanamsa</strong>, anchored to the actual stars in the sky. Western astrology uses the <em>tropical</em> zodiac fixed to the Earth's seasons. Over the centuries the two have drifted nearly 24 degrees apart — which means your "Vedic Sun sign" is often one full sign earlier than your Western Sun sign, and the timing of every transit is calculated against real celestial geometry.
            </p>
            <p className="mt-3">
              Vedic astrology also leans on your <strong>Moon sign (Rashi)</strong> rather than your Sun sign, because the Moon governs mind, emotion, and the rhythm of daily life. And it adds something Western astrology lacks entirely: <strong>Dasha periods</strong> — the Vimshottari system of planetary cycles that tells you <em>when</em> a theme in your chart will activate, often down to the month.
            </p>
          </article>

          <article>
            <h3 className="text-xl md:text-2xl mb-3" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(38 78% 65%)' }}>
              How to Read Your Free Kundali Online
            </h3>
            <p>
              To generate an accurate Kundali you need three things: your <strong>date of birth</strong>, your <strong>exact time of birth</strong> (ideally from your birth certificate — even a 10-minute error can shift the Lagna), and your <strong>birth city</strong>. Once your chart is cast, look first at four pillars:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5">
              <li><strong>Lagna (Ascendant):</strong> the sign rising on the eastern horizon at your birth — your outer self and life direction.</li>
              <li><strong>Rashi (Moon sign):</strong> your emotional nature and the foundation of all Vedic predictions.</li>
              <li><strong>Nakshatra:</strong> the lunar mansion your Moon sits in — the deepest layer of personality and karma.</li>
              <li><strong>Maha Dasha:</strong> the planetary period currently shaping your life's chapter.</li>
            </ul>
          </article>

          <article>
            <h3 className="text-xl md:text-2xl mb-3" style={{ fontFamily: 'Cinzel, serif', color: 'hsl(38 78% 65%)' }}>
              Why VedicKundali.app
            </h3>
            <p>
              Most online kundali generators stop at a chart image. We go further: every Kundali is interpreted by a <strong>three-layer engine</strong> that combines precise astronomical math (Swiss Ephemeris with Lahiri Ayanamsa), classical Jyotish rules from texts like <em>Brihat Parashara Hora Shastra</em>, and a carefully tuned AI that speaks in the voice of a <strong>warm elder</strong> — never fatalistic, always empowering. You'll see your houses, planets, dashas, yogas, dosha analysis, and daily guidance, all woven into one coherent reading.
            </p>
            <p className="mt-3">
              <Link to="/preview/chart" className="underline" style={{ color: 'hsl(38 78% 60%)' }}>
                Generate your free Vedic Kundali in 60 seconds →
              </Link>
            </p>
          </article>

        </div>
      </div>
    </section>
  );
}
