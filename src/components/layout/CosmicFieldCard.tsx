const VERSES = [
  "As above, so below — the same rhythm that turns the stars turns the breath inside you.",
  "The cosmos does not hurry, yet everything is accomplished.",
  "Wherever the mind goes, the soul follows — choose your direction with care.",
  "Karma is the seed; dharma is the soil. Both are needed for the bloom.",
  "Every nakshatra is a doorway; every breath, a key.",
  "The wise sail with the tide; only the foolish row against it.",
  "What ripens within you today was planted lifetimes ago.",
];

export default function CosmicFieldCard() {
  const dayIndex = Math.floor(Date.now() / 86400000) % VERSES.length;
  const verse = VERSES[dayIndex];

  return (
    <div className="rail-card relative" style={{ overflow: "hidden" }}>
      <div className="rail-card-title">Cosmic Field</div>
      <div className="relative" style={{ height: 70 }}>
        <svg viewBox="0 0 200 70" className="w-full h-full" aria-hidden>
          <defs>
            <radialGradient id="cf-glow-pg" cx="50%" cy="60%" r="60%">
              <stop offset="0%" stopColor="hsl(45 70% 60% / 0.35)" />
              <stop offset="100%" stopColor="hsl(240 30% 8% / 0)" />
            </radialGradient>
          </defs>
          <rect width="200" height="70" fill="url(#cf-glow-pg)" />
          {Array.from({ length: 28 }).map((_, i) => {
            const x = (i * 37) % 200;
            const y = (i * 53) % 70;
            const r = ((i * 7) % 8) / 10 + 0.3;
            return (
              <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.3 + ((i * 13) % 60) / 100}>
                <animate attributeName="opacity" values="0.2;0.9;0.2" dur={`${2 + (i % 4)}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
          <polyline points="30,40 60,25 95,38 130,20 165,32" fill="none" stroke="hsl(var(--gold) / 0.35)" strokeWidth="0.4" />
          {[[30, 40], [60, 25], [95, 38], [130, 20], [165, 32]].map(([x, y], i) => (
            <circle key={`s-${i}`} cx={x} cy={y} r="1.4" fill="hsl(var(--gold))" />
          ))}
        </svg>
      </div>
      <p
        className="mt-2 text-[12.5px]"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          color: "hsl(var(--gold-light) / 0.85)",
          lineHeight: 1.55,
        }}
      >
        "{verse}"
      </p>
    </div>
  );
}
