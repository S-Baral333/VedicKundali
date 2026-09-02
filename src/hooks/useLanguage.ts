import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LANGUAGE_STORAGE_KEY, SUPPORTED_CODES, DEFAULT_LANGUAGE } from "@/i18n/languages";

/**
 * useLanguage — single source of truth for the user's language.
 * - Boots from localStorage / browser (handled by i18next-browser-languagedetector).
 * - After auth, reconciles with `profiles.language` (server wins).
 * - `setLanguage()` updates i18n, localStorage, and profile in one call.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Reconcile with server profile once authenticated
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("user_id", user.id)
        .maybeSingle();
      const serverLang = (data as any)?.language;
      if (cancelled) return;
      if (serverLang && SUPPORTED_CODES.includes(serverLang) && serverLang !== i18n.language) {
        i18n.changeLanguage(serverLang);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, i18n]);

  const setLanguage = useCallback(
    async (code: string) => {
      if (!SUPPORTED_CODES.includes(code)) return;
      await i18n.changeLanguage(code);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      } catch {}
      if (user) {
        await supabase.from("profiles").update({ language: code } as any).eq("user_id", user.id);
      }
    },
    [i18n, user]
  );

  return {
    language: i18n.language || DEFAULT_LANGUAGE,
    setLanguage,
  };
}
