import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ArrowLeft, Sparkles, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import ParallaxStarfield from "@/components/onboarding/ParallaxStarfield";

const VEDIC_SIGNS = [
  { name: "Mesha", western: "Aries", emoji: "♈", dates: "Apr 14 – May 14" },
  { name: "Vrishabha", western: "Taurus", emoji: "♉", dates: "May 15 – Jun 14" },
  { name: "Mithuna", western: "Gemini", emoji: "♊", dates: "Jun 15 – Jul 15" },
  { name: "Karka", western: "Cancer", emoji: "♋", dates: "Jul 16 – Aug 16" },
  { name: "Simha", western: "Leo", emoji: "♌", dates: "Aug 17 – Sep 16" },
  { name: "Kanya", western: "Virgo", emoji: "♍", dates: "Sep 17 – Oct 16" },
  { name: "Tula", western: "Libra", emoji: "♎", dates: "Oct 17 – Nov 15" },
  { name: "Vrishchika", western: "Scorpio", emoji: "♏", dates: "Nov 16 – Dec 15" },
  { name: "Dhanu", western: "Sagittarius", emoji: "♐", dates: "Dec 16 – Jan 13" },
  { name: "Makara", western: "Capricorn", emoji: "♑", dates: "Jan 14 – Feb 12" },
  { name: "Kumbha", western: "Aquarius", emoji: "♒", dates: "Feb 13 – Mar 13" },
  { name: "Meena", western: "Pisces", emoji: "♓", dates: "Mar 14 – Apr 13" },
];

export default function HoroscopePreview() {
  const [selectedSign, setSelectedSign] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async (sign: string) => {
    setSelectedSign(sign);
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-preview", {
        body: withLanguage({ type: "horoscope", sign }),
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setPreview(data.result);
    } catch (e: any) {
      setError(e.message || "Failed to get preview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <ParallaxStarfield />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent mb-3">
            Today's Vedic Horoscope
          </h1>
          <p className="text-muted-foreground font-serif italic">
            Select your Vedic Sun sign to receive divine guidance
          </p>
        </div>

        {/* Sign grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-10">
          {VEDIC_SIGNS.map((s) => (
            <button
              key={s.name}
              onClick={() => fetchPreview(s.name)}
              className={`glass-card rounded-xl p-3 text-center transition-all hover:scale-105 cursor-pointer ${
                selectedSign === s.name ? "ring-2 ring-primary bg-primary/10" : "hover:bg-primary/5"
              }`}
            >
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-xs font-semibold text-foreground">{s.name}</div>
              <div className="text-[10px] text-muted-foreground">{s.dates}</div>
            </button>
          ))}
        </div>

        {/* Result */}
        {loading && (
          <div className="text-center py-12">
            <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">Consulting the stars...</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive/30 bg-destructive/5 max-w-lg mx-auto">
            <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
          </Card>
        )}

        {preview && !loading && (
          <div className="max-w-lg mx-auto space-y-6">
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  {selectedSign} — Today's Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/90 leading-relaxed font-serif">{preview}</p>
              </CardContent>
            </Card>

            {/* Blurred full reading teaser */}
            <Card className="relative overflow-hidden border-primary/10">
              <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center gap-4">
                <Lock className="h-6 w-6 text-primary" />
                <p className="text-sm font-serif text-muted-foreground text-center px-4">
                  Full planetary analysis, transits & personalized remedies
                </p>
                <Link to="/login">
                  <Button className="gap-2">
                    <Star className="h-4 w-4" /> Create Free Account to Unlock
                  </Button>
                </Link>
              </div>
              <CardContent className="p-6 select-none">
                <div className="space-y-3 opacity-30">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                  <div className="h-4 bg-muted rounded w-4/6" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
