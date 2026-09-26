import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import KundaliMark from "@/components/KundaliMark";
import GoogleMark from "@/components/GoogleMark";
import mandalaUrl from "@/assets/kundali-mark-sacred.svg";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { user, isLoading, signInWithGoogle } = useAuth();
  const { t } = useTranslation("pages");

  // Already signed in — nothing to do here.
  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      // This only fires if the redirect itself could not be started; once the
      // browser leaves for Google, failures come back to /auth/callback.
      setLoading(false);
      toast.error(t("login.googleFailed", "Couldn't reach Google. Check your connection and try again."));
    }
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

            {/* One door in, so the copy never asks the user to choose between
                signing in and signing up — Google settles which it is. */}
            <p className="text-sm" style={{ color: "hsl(var(--text-secondary))", lineHeight: 1.55 }}>
              {t("login.subheadGoogle", "Sign in or create your account with Google.")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-full border px-5 py-3 min-h-[48px] text-[15px] font-medium transition-colors disabled:opacity-70"
            style={{
              background: "hsl(0 0% 100%)",
              color: "hsl(220 9% 20%)",
              borderColor: "hsl(0 0% 100% / 0.85)",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleMark className="h-5 w-5 shrink-0" />
            )}
            {loading
              ? t("login.googleRedirecting", "Taking you to Google…")
              : t("login.continueWithGoogle", "Continue with Google")}
          </button>

          <p
            className="mt-4 text-center text-[11px] leading-relaxed"
            style={{ color: "hsl(var(--text-muted))" }}
          >
            {t("login.noPasswordNote", "No password to remember — Google verifies it's you.")}
          </p>
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
