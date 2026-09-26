import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import KundaliMark from "@/components/KundaliMark";
import { Loader2 } from "lucide-react";

/**
 * Where Google sends the user back to.
 *
 * The supabase client is configured with detectSessionInUrl, so by the time
 * this mounts it is already exchanging the code in the URL for a session. All
 * this page does is wait for that to land and then decide where the user
 * belongs — onboarding if they have never finished it, the dashboard if they
 * have. It is deliberately the only place that decision is made, because with
 * OAuth the sign-in click and the signed-in state happen in different page
 * loads and the old Login page could no longer see both.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation("pages");
  const [failed, setFailed] = useState<string | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    // Google reports a refusal on the URL rather than by failing the redirect.
    const params = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.search
    );
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      setFailed(oauthError);
      return;
    }

    const route = async (userId: string) => {
      if (settled.current) return;
      settled.current = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();
      // A brand-new Google account has its row created by the auth trigger, so
      // a missing profile here means the trigger has not caught up yet —
      // onboarding is the safe destination either way.
      navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) route(session.user.id);
    });

    // The session may already be in place before the listener attaches.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) route(session.user.id);
    });

    // Don't spin forever if the exchange never completes.
    const timeout = setTimeout(() => {
      if (!settled.current) setFailed("timeout");
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <KundaliMark size={56} glow />
        {failed ? (
          <>
            <p className="text-sm" style={{ color: "hsl(var(--text-secondary))" }}>
              {t("login.callbackFailed", "We couldn't complete that sign-in.")}
            </p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="sacred-cta px-5 py-2 rounded-full text-sm"
            >
              {t("login.tryAgain", "Try again")}
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--gold))" }} />
            <p className="text-sm" style={{ color: "hsl(var(--text-secondary))" }}>
              {t("login.callbackWorking", "Signing you in…")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
