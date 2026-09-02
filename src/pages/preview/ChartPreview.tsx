import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sun, ArrowLeft, Lock, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import ParallaxStarfield from "@/components/onboarding/ParallaxStarfield";

interface ChartResult {
  sign: string;
  element: string;
  rulingPlanet: string;
  nakshatra: string;
  quality: string;
}

export default function ChartPreview() {
  const [dob, setDob] = useState("");
  const [result, setResult] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = async () => {
    if (!dob) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("generate-preview", {
        body: withLanguage({ type: "chart", date_of_birth: dob }),
      });
      if (data?.result) setResult(data.result);
    } catch {
      // Deterministic — unlikely to fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <ParallaxStarfield />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🕉️</div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent mb-3">
            Vedic Birth Chart Preview
          </h1>
          <p className="text-muted-foreground font-serif italic">
            Enter your birth date to discover your Vedic Sun sign
          </p>
        </div>

        {/* Input */}
        <Card className="glass-card border-primary/20 mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              <label className="text-sm font-medium text-foreground">Date of Birth</label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="text-base"
              />
              <Button onClick={fetchPreview} disabled={!dob || loading} className="w-full gap-2">
                <Compass className="h-4 w-4" />
                Reveal My Sign
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <div className="space-y-6">
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-serif flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  Your Vedic Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Sun Sign", value: result.sign },
                    { label: "Element", value: result.element },
                    { label: "Ruling Planet", value: result.rulingPlanet },
                    { label: "Nakshatra", value: result.nakshatra },
                    { label: "Quality", value: result.quality },
                  ].map((item) => (
                    <div key={item.label} className="bg-primary/5 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</div>
                      <div className="text-foreground font-serif font-semibold mt-1">{item.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Blurred full chart */}
            <Card className="relative overflow-hidden border-primary/10">
              <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center gap-4">
                <Lock className="h-6 w-6 text-primary" />
                <p className="text-sm font-serif text-muted-foreground text-center px-4">
                  Full Kundli with planetary positions, houses, dashas & yogas
                </p>
                <Link to="/login">
                  <Button className="gap-2">
                    <Sun className="h-4 w-4" /> Create Free Account to Unlock
                  </Button>
                </Link>
              </div>
              <CardContent className="p-6 select-none">
                <div className="grid grid-cols-3 gap-2 opacity-30">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
