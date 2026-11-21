// Client for the `admin-users` edge function.
//
// The browser only asks; the function decides. It re-verifies the caller's
// token and reads their role from the database on every call, so nothing here
// (including isAdmin / isSuperadmin in useAuth) grants any access by itself.

import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/lib/tiers";

export type GrantableRole = "admin" | "superadmin";

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  is_active: boolean;
  tier: string;
  subscription_status: string | null;
  subscription_provider: string | null;
  roles: string[];
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  actor_email: string | null;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminUserDetail {
  user: {
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    banned_until: string | null;
    providers: string[];
    full_name: string | null;
    avatar_url: string | null;
  };
  profile: Record<string, unknown> | null;
  subscription: {
    tier: string;
    status: string;
    provider: string;
    current_period_end: string | null;
    billing_interval: string | null;
  } | null;
  roles: string[];
  usage_this_month: { resource: string; count: number; period_start: string }[];
  totals: Record<string, number | null>;
  audit: AuditEntry[] | null;
  can_manage: boolean;
  is_self: boolean;
}

/** A ban that has not run out yet means the account is disabled. */
export function isDisabled(bannedUntil: string | null | undefined): boolean {
  return !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
}

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, ...params },
  });
  if (error) {
    // Non-2xx: the function's own { error } message is on the response.
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep the generic message */
      }
    }
    throw new Error(message);
  }
  return data as T;
}

export const adminUsers = {
  list: (search: string, limit: number, offset: number) =>
    call<{ users: AdminUserRow[]; total: number; can_manage: boolean }>("list", { search, limit, offset }),
  get: (userId: string) => call<AdminUserDetail>("get", { user_id: userId }),
  audit: (limit = 200, userId?: string) =>
    call<{ entries: AuditEntry[] }>("audit", { limit, ...(userId ? { user_id: userId } : {}) }),
  setRole: (userId: string, role: GrantableRole, grant: boolean) =>
    call<{ ok: true; roles: string[] }>("set_role", { user_id: userId, role, grant }),
  setPlan: (userId: string, tier: Tier, periodEnd?: string) =>
    call<{ ok: true }>("set_plan", { user_id: userId, tier, ...(periodEnd ? { period_end: periodEnd } : {}) }),
  disable: (userId: string, reason?: string) => call<{ ok: true }>("disable", { user_id: userId, reason }),
  enable: (userId: string) => call<{ ok: true }>("enable", { user_id: userId }),
  signOut: (userId: string) => call<{ ok: true; sessions_revoked: number }>("sign_out", { user_id: userId }),
  remove: (userId: string, confirmEmail: string) =>
    call<{ ok: true }>("delete", { user_id: userId, confirm_email: confirmEmail }),
};
