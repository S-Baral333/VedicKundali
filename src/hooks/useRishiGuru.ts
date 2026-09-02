import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Lightweight in-memory cache so multiple surfaces don't re-fetch.
let cached: { userId: string; enabled: boolean; at: number } | null = null;
const STALE_MS = 5 * 60 * 1000;

export function setRishiGuruCache(userId: string, enabled: boolean) {
  cached = { userId, enabled, at: Date.now() };
}

export function useRishiGuru() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(
    cached && user && cached.userId === user.id ? cached.enabled : false
  );
  const [loading, setLoading] = useState<boolean>(!cached || !user || cached.userId !== user.id);

  useEffect(() => {
    if (!user) { setEnabled(false); setLoading(false); return; }
    if (cached && cached.userId === user.id && Date.now() - cached.at < STALE_MS) {
      setEnabled(cached.enabled);
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("rishi_guru_enabled")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const v = !!data?.rishi_guru_enabled;
        cached = { userId: user.id, enabled: v, at: Date.now() };
        setEnabled(v);
        setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  return { enabled, loading };
}
