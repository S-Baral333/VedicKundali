export const astroGlossary: Record<string, string> = {
  // Planets
  "Sun": "Your core identity and life purpose — the essence of who you are",
  "Moon": "Your emotional nature and inner world — how you feel and nurture",
  "Mars": "Your drive, courage, and physical energy — how you take action",
  "Mercury": "Your mind, communication style, and how you process information",
  "Jupiter": "The planet of wisdom, expansion, and good fortune",
  "Venus": "Love, beauty, relationships, and what brings you pleasure",
  "Saturn": "The planet of discipline, structure, and life lessons",
  "Rahu": "The north lunar node — your karmic desires and ambitions",
  "Ketu": "The south lunar node — past-life wisdom and spiritual detachment",

  // Periods
  "Mahadasha": "Your current major planetary period (lasting several years)",
  "Antardasha": "The sub-period within your major planetary cycle",
  "Pratyantar": "A smaller sub-sub-period within the Antardasha cycle",
  "Dasha": "A planetary period that colors a phase of your life",

  // Nakshatras & Divisions
  "Nakshatra": "Your birth star — one of 27 lunar mansions in Vedic astrology",
  "Hasta": "A nakshatra ruled by the Moon — skilled hands and creativity",
  "Ashwini": "The first nakshatra — speed, healing, and new beginnings",
  "Bharani": "A nakshatra of transformation and the cycle of life",
  "Rohini": "A nakshatra of beauty, creativity, and abundance",
  "Mrigashira": "A nakshatra of curiosity, searching, and gentle nature",
  "Pushya": "A highly auspicious nakshatra of nourishment and care",
  "Magha": "A nakshatra of ancestral power and royal authority",
  "Swati": "A nakshatra of independence, flexibility, and self-reliance",
  "Revati": "The final nakshatra — compassion, journeys, and completion",

  // Zodiac Signs
  "Aries": "The first sign — bold, pioneering, and action-oriented energy",
  "Taurus": "Grounded, sensual energy focused on stability and comfort",
  "Gemini": "Curious, communicative energy that loves variety and learning",
  "Cancer": "Nurturing, protective energy centered on home and emotions",
  "Leo": "Creative, confident energy that shines and leads naturally",
  "Virgo": "Analytical, service-oriented energy focused on improvement",
  "Libra": "Harmonious, relationship-focused energy seeking balance",
  "Scorpio": "Intense, transformative energy that goes deep beneath the surface",
  "Sagittarius": "Adventurous, philosophical energy seeking truth and meaning",
  "Capricorn": "Ambitious, disciplined energy building lasting structures",
  "Aquarius": "Innovative, humanitarian energy focused on collective progress",
  "Pisces": "Intuitive, compassionate energy connected to the spiritual realm",

  // Aspects & Relationships
  "conjunction": "Two planets sitting close together, merging their energies",
  "opposition": "Two planets facing each other — tension that creates growth",
  "square": "A 90° angle between planets — friction that pushes action",
  "trine": "A 120° angle between planets — natural flow and ease",
  "aspect": "The angular relationship between two planets affecting your life",
  "retrograde": "When a planet appears to move backward — a time for review and reflection",
  "transit": "A planet's current position as it moves through a zodiac sign",
  "exalted": "A planet at its strongest and most beneficial position",
  "debilitated": "A planet in its weakest sign — challenges that build strength",
  "combust": "A planet too close to the Sun, its energy temporarily hidden",

  // Houses
  "ascendant": "Your rising sign — how the world sees you and your outward personality",
  "Lagna": "Your ascendant or rising sign in Vedic astrology",
  "midheaven": "The highest point in your chart — career and public reputation",

  // Lunar Phases
  "Shukla Paksha": "The bright half of the lunar month — a time of growth and building",
  "Krishna Paksha": "The dark half of the lunar month — a time for release and reflection",
  "Purnima": "Full Moon — peak energy, culmination, and heightened emotions",
  "Amavasya": "New Moon — fresh starts, introspection, and planting seeds",

  // Yogas
  "Yoga": "A special planetary combination that shapes your destiny",
  "Raja Yoga": "A powerful combination promising success, authority, and recognition",
  "Dhana Yoga": "A wealth-producing planetary combination in your chart",
  "Gajakesari Yoga": "Jupiter-Moon combination bringing wisdom and popularity",

  // Remedies & Concepts
  "Muhurta": "An auspicious time window chosen for important activities",
  "Sade Sati": "Saturn's 7.5-year transit over your Moon — a period of deep transformation",
  "Manglik": "Mars influence on marriage — requires awareness, not fear",
  "Bhava": "A house or area of life in your birth chart",
};

// Build a single regex that matches all terms (longest first to avoid partial matches)
const sortedTerms = Object.keys(astroGlossary).sort((a, b) => b.length - a.length);
const escaped = sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
export const astroTermsRegex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
