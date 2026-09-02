import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Sparkles, Lock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withLanguage } from "@/lib/i18nClient";
import ParallaxStarfield from "@/components/onboarding/ParallaxStarfield";

export default function OraclePreview() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || asked) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-preview", {
        body: withLanguage({ type: "dream", dream_text: `Oracle question: ${question.trim()}` }),
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResult(data.result);
      setAsked(true);
    } catch (e: any) {
      setError(e.message || "Failed to get response");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <ParallaxStarfield />
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔮</div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent mb-3">
            Ask the Guru
          </h1>
          <p className="text-muted-foreground font-serif italic text-sm">
            Ask any life question — career, relationships, timing — and receive Vedic wisdom.
          </p>
        </div>

        {!asked && (
          <div className="space-y-4">
            <Textarea
              placeholder="What's on your mind? e.g. 'Should I change careers this year?'"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px] bg-card/50 border-border/30 text-sm resize-none"
              maxLength={300}
            />
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!question.trim() || loading}
              onClick={handleAsk}
            >
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" /> Consulting the stars...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Ask the Guru
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Free preview · No signup needed</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive/30 bg-destructive/5 mt-6">
            <CardContent className="p-4 text-center text-destructive text-sm">{error}</CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6 mt-6" style={{ animation: "fade-in-up 0.6s ease-out forwards" }}>
            {/* Question echo */}
            <div className="flex justify-end">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm p-3.5 max-w-[90%]">
                <p className="text-sm text-foreground">{question}</p>
              </div>
            </div>

            {/* Oracle response */}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm">
                🔮
              </div>
              <Card className="glass-card border-primary/20 flex-1">
                <CardContent className="p-4">
                  <p className="text-foreground/90 leading-relaxed font-serif text-sm">{result}</p>
                </CardContent>
              </Card>
            </div>

            {/* Blurred deeper analysis teaser */}
            <Card className="relative overflow-hidden border-primary/10">
              <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 flex flex-col items-center justify-center gap-4 p-6">
                <Lock className="h-6 w-6 text-primary" />
                <p className="text-sm font-serif text-muted-foreground text-center">
                  Unlock detailed analysis, planetary timing & personalized remedies
                </p>
                <Link to="/login">
                  <Button className="gap-2">
                    <Star className="h-4 w-4" /> Create Free Account
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
