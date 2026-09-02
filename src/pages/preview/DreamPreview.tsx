import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Moon, ArrowLeft, Sparkles, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import ParallaxStarfield from "@/components/onboarding/ParallaxStarfield";

export default function DreamPreview() {
  const [dreamText, setDreamText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    if (!dreamText.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-preview", {
        body: withLanguage({ type: "dream", dream_text: dreamText.trim() }),
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setPreview(data.result);
    } catch (e: any) {
      setError(e.message || "Failed to interpret dream");
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
          <div className="text-5xl mb-4">🌙</div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent mb-3">
            Swapna Shastra — Dream Oracle
          </h1>
          <p className="text-muted-foreground font-serif italic">
            Describe your dream and receive ancient Vedic wisdom
          </p>
        </div>

        {/* Input */}
        <Card className="glass-card border-primary/20 mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Input
                placeholder="I dreamed of flying over an ocean of golden light..."
                value={dreamText}
                onChange={(e) => setDreamText(e.target.value)}
                maxLength={150}
                className="text-base"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{dreamText.length}/150</span>
                <Button onClick={fetchPreview} disabled={!dreamText.trim() || loading} className="gap-2">
                  <Moon className="h-4 w-4" />
                  Interpret Dream
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {loading && (
          <div className="text-center py-12">
            <Sparkles className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground font-serif italic">Consulting the Swapna Shastra...</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
          </Card>
        )}

        {preview && !loading && (
          <div className="space-y-6">
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <Moon className="h-5 w-5 text-primary" />
                  Dream Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/90 leading-relaxed font-serif">{preview}</p>
              </CardContent>
            </Card>

            {/* Blurred full analysis */}
            <Card className="relative overflow-hidden border-primary/10">
              <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center gap-4">
                <Lock className="h-6 w-6 text-primary" />
                <p className="text-sm font-serif text-muted-foreground text-center px-4">
                  Full Swapna Shastra analysis with symbols, remedies & prophetic guidance
                </p>
                <Link to="/login">
                  <Button className="gap-2">
                    <Moon className="h-4 w-4" /> Create Free Account to Unlock
                  </Button>
                </Link>
              </div>
              <CardContent className="p-6 select-none">
                <div className="space-y-3 opacity-30">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                  <div className="h-4 bg-muted rounded w-4/6" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
