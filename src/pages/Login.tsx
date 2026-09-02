import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import KundaliMark from "@/components/KundaliMark";
import mandalaUrl from "@/assets/kundali-mark-sacred.svg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("pages");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else if (isSignUp) {
      toast.success(t("login.toastVerify"));
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();
      if (profile && !profile.onboarding_completed) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t("login.toastEnterEmail"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("login.toastResetSent"));
      setForgotMode(false);
    }
  };

  const subhead = forgotMode
    ? t("login.subheadForgot")
    : isSignUp
      ? t("login.subheadSignUp")
      : t("login.subheadSignIn");

  const labelStyle = {
    color: "hsl(var(--text-secondary))",
    fontSize: "11px",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    fontWeight: 500,
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Local scrim ensuring text contrast on top of the global UniverseBackground */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, hsl(240 33% 3% / 0.55) 0%, transparent 70%)",
        }}
      />

      {/* Faint mandala watermark — sacred recognition */}
      <div className="mandala-watermark" aria-hidden="true">
        <img src={mandalaUrl} alt="" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        <div
          className="glass-card-premium sacred-portal-card w-full"
          style={{ animation: "fadeInSoft 0.9s ease-out, floatCard 6s ease-in-out infinite 0.9s" }}
        >
          <div className="text-center mb-7">
            <div className="logo-halo mx-auto mb-4">
              <KundaliMark size={72} glow />
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "26px",
                fontWeight: 700,
                color: "hsl(var(--gold))",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Kundali
            </h1>
            <p
              className="mt-2"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: "15px",
                color: "hsl(var(--text-secondary))",
              }}
            >
              {t("login.tagline")}
            </p>

            {/* Delicate divider */}
            <div className="flex items-center justify-center gap-3 my-4" aria-hidden>
              <span className="h-px w-10" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.4))" }} />
              <span style={{ color: "hsl(var(--gold) / 0.65)", fontSize: "10px", letterSpacing: "0.3em" }}>✦</span>
              <span className="h-px w-10" style={{ background: "linear-gradient(90deg, hsl(var(--gold) / 0.4), transparent)" }} />
            </div>

            <p className="text-sm" style={{ color: "hsl(var(--text-secondary))", lineHeight: 1.55 }}>
              {subhead}
            </p>
          </div>

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" style={labelStyle}>{t("login.emailLabel")}</Label>
                <div className="sacred-input">
                  <Mail />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full sacred-cta" disabled={loading}>
                {loading ? t("login.sendingReset") : t("login.sendResetLink")}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="text-sm transition-colors hover:text-[hsl(var(--gold))]"
                  style={{ color: "hsl(var(--text-muted))" }}
                >
                  {t("login.backToSignIn")}
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" style={labelStyle}>{t("login.emailLabel")}</Label>
                  <div className="sacred-input">
                    <Mail />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" style={labelStyle}>{t("login.passwordLabel")}</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setForgotMode(true)}
                        className="text-xs transition-colors hover:text-[hsl(var(--gold))]"
                        style={{ color: "hsl(var(--text-muted))" }}
                      >
                        {t("login.forgotPassword")}
                      </button>
                    )}
                  </div>
                  <div className="sacred-input">
                    <Lock />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full sacred-cta" disabled={loading}>
                  {loading ? t("login.aligningStars") : isSignUp ? t("login.beginJourney") : t("login.signIn")}
                </Button>
              </form>
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm transition-colors hover:text-[hsl(var(--gold))]"
                  style={{ color: "hsl(var(--text-muted))" }}
                >
                  {isSignUp ? t("login.alreadyHaveAccount") : t("login.needAccount")}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Trust strip */}
        <div className="sacred-trust-strip mt-6 text-center">
          <span>{t("login.trustSidereal")}</span>
          <span>{t("login.trustVedic")}</span>
          <span>{t("login.trustPrivate")}</span>
        </div>
      </div>
    </div>
  );
}
