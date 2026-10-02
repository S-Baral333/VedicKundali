import { useCallback, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGE_STORAGE_KEY } from "@/i18n/languages";
import { buildProfileUpdate, type OnboardingResult } from "@/lib/onboarding-profile";
import DwaraFlow from "@/components/onboarding/dwara/DwaraFlow";

/**
 * Onboarding is a portal rather than a form: see components/onboarding/dwara.
 * This page only gates on auth and performs the real write.
 */
export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [languageChosen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem(LANGUAGE_STORAGE_KEY);
  });

  const save = useCallback(
    async (result: OnboardingResult) => {
      if (!user) throw new Error("not signed in");
      // Selecting the row back is what proves it was written: an RLS miss or a
      // bad column returns no error here, only an empty result. The old flow
      // ignored both and sent everyone on to the dashboard regardless.
      const { data, error } = await supabase
        .from("profiles")
        .update(buildProfileUpdate(result))
        .eq("user_id", user.id)
        .select("user_id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("profile row was not updated");
    },
    [user]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  // Google already told us what they go by; offer it, they can change it.
  const meta = user.user_metadata as { given_name?: string; full_name?: string; name?: string } | undefined;
  const initialName = (meta?.given_name ?? (meta?.full_name ?? meta?.name ?? "").split(" ")[0] ?? "").trim();

  return (
    <DwaraFlow
      initialName={initialName}
      languageChosen={languageChosen}
      onSave={save}
      onDone={() => navigate("/dashboard", { replace: true })}
    />
  );
}
