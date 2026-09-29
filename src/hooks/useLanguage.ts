import { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LANGUAGE_STORAGE_KEY, SUPPORTED_CODES, DEFAULT_LANGUAGE } from "@/i18n/languages";

/**
 * useLanguage — single source of truth for the user's language.
 *
 * - Boots from localStorage / browser (i18next-browser-languagedetector).
 * - After auth, reconciles with `profiles.language` — but only when that value
 *   was deliberately chosen.
 * - `setLanguage()` updates i18n, localStorage and the profile in one call.
 *
 * The reconcile used to be an unconditional "server wins". That was wrong,
 * because `profiles.language` was added with DEFAULT 'en' and backfilled every
 * existing row, so 'en' in that column means either "I chose English" or
 * "nobody ever chose anything". Treating the second as a choice silently
 * switched Nepali and Hindi readers to English the moment they opened their
 * profile, and wrote the switch back so it followed them everywhere.
 *
 * `language_updated_at` is what distinguishes the two. When it is set the
 * server holds a real preference and should win, which is what makes the
 * language follow you between devices. When it is NULL the server holds only a
 * default, and the local choice is pushed up instead — so each profile heals
 * itself on its owner's next visit.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("language, language_updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;

      const row = data as { language?: string | null; language_updated_at?: string | null };
      const serverLang = row.language;
      const chosenDeliberately = !!row.language_updated_at;
      const local = i18n.language;

      if (chosenDeliberately) {
        // A real preference. Adopt it so language follows the user's account.
        if (serverLang && SUPPORTED_CODES.includes(serverLang) && serverLang !== local) {
          i18n.changeLanguage(serverLang);
        }
        return;
      }

      // Only a default sits on the server. Whatever this browser is already
      // reading in is the better signal, so send it up rather than pull down.
      if (local && SUPPORTED_CODES.includes(local) && local !== serverLang) {
        await supabase
          .from("profiles")
          .update({ language: local, language_updated_at: new Date().toISOString() } as never)
          .eq("user_id", user.id);
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
      } catch {
        /* private mode or blocked storage — i18n state still changed */
      }
      if (user) {
        // Stamping the time is what marks this as chosen rather than defaulted.
        await supabase
          .from("profiles")
          .update({ language: code, language_updated_at: new Date().toISOString() } as never)
          .eq("user_id", user.id);
      }
    },
    [i18n, user]
  );

  return {
    language: i18n.language || DEFAULT_LANGUAGE,
    setLanguage,
  };
}
