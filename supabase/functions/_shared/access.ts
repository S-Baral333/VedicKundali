// Shared access-control helper for edge functions.
//
// A user holding the `admin` role in public.user_roles is a super admin: every
// subscription tier gate and usage quota is bypassed for them. The role lives
// in the database (never a hardcoded email or a client-supplied flag) so it
// cannot be spoofed by the caller.
//
// Usage inside a function, after you have resolved the caller's user id:
//
//   import { isSuperAdmin } from "../_shared/access.ts";
//   const superAdmin = await isSuperAdmin(supabase, userId);
//   if (!superAdmin && tier === "free") { ...return 403... }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AnyClient = ReturnType<typeof createClient>;

/**
 * True when the user holds the `admin` role.
 *
 * Reads through whatever client is passed. A service-role client always works;
 * a user-scoped client works too because user_roles has a self-select policy.
 * Any failure resolves to `false` — a lookup error must never escalate access.
 */
export async function isSuperAdmin(
  client: AnyClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) {
      console.error("[access] role lookup failed, denying admin bypass", error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error("[access] role lookup threw, denying admin bypass", e);
    return false;
  }
}
