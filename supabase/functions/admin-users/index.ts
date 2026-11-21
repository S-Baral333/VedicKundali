// admin-users — every user-management action in the admin panel.
//
// Trust model: nothing the browser sends counts as proof of who the caller is
// or what they may do. Each request:
//   1. verifies the bearer token with the auth server (getUser — a deleted or
//      banned caller is rejected, not just an expired one);
//   2. reads the caller's roles from public.user_roles with the service role;
//   3. allows the action only if those roles permit it.
// Reads (list, get) need admin or superadmin. Every write and the audit log
// need superadmin. Every write appends one row to public.admin_audit_log.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIERS = ["darshana", "sadhaka", "grihastha", "jyotisha"] as const;
type Tier = (typeof TIERS)[number];
const GRANTABLE_ROLES = ["admin", "superadmin"] as const;
type GrantableRole = (typeof GRANTABLE_ROLES)[number];

// Effectively permanent (100 years). "none" lifts the ban.
const BAN_FOREVER = "876000h";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireUuid(value: unknown, name = "user_id"): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new HttpError(400, `${name} must be a user id`);
  }
  return value;
}

function firstOfMonthUtc(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    // ── 1. Who is calling ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) throw new HttpError(401, "Unauthorized");
    const token = authHeader.slice("Bearer ".length);
    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) throw new HttpError(401, "Unauthorized");
    const caller = callerData.user;

    // ── 2. What they may do (from the database, never the request) ─────
    const { data: callerRoles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    if (rolesErr) {
      console.error("[admin-users] role lookup failed", rolesErr);
      throw new HttpError(503, "Could not verify your role");
    }
    const roleSet = new Set((callerRoles ?? []).map((r: { role: string }) => r.role));
    const isSuperadmin = roleSet.has("superadmin");
    const isAdmin = isSuperadmin || roleSet.has("admin");
    if (!isAdmin) throw new HttpError(403, "Admin access required");

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Body must be JSON");
    }
    const action = String(body.action ?? "");

    const requireSuperadmin = () => {
      if (!isSuperadmin) throw new HttpError(403, "Superadmin access required");
    };
    const notSelf = (targetId: string, what: string) => {
      if (targetId === caller.id) throw new HttpError(400, `You can't ${what} your own account`);
    };
    const audit = async (
      act: string,
      target: { id: string; email?: string | null } | null,
      details: Record<string, unknown>,
    ) => {
      const { error } = await admin.from("admin_audit_log").insert({
        actor_id: caller.id,
        actor_email: caller.email ?? null,
        action: act,
        target_user_id: target?.id ?? null,
        target_email: target?.email ?? null,
        details,
      });
      // The action already happened; a lost audit row must be loud.
      if (error) console.error("[admin-users] AUDIT WRITE FAILED", act, target?.id, error);
      return !error;
    };
    const loadTarget = async (userId: string) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data?.user) throw new HttpError(404, "User not found");
      return data.user;
    };
    const rolesOf = async (userId: string): Promise<string[]> => {
      const { data, error } = await admin.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw new HttpError(500, error.message);
      return (data ?? []).map((r: { role: string }) => r.role).sort();
    };

    // ── 3. The action ──────────────────────────────────────────────────
    switch (action) {
      case "whoami": {
        return json({ user_id: caller.id, email: caller.email, is_admin: isAdmin, is_superadmin: isSuperadmin });
      }

      case "list": {
        const limit = Math.min(Math.max(Number(body.limit ?? 50) || 50, 1), 200);
        const offset = Math.max(Number(body.offset ?? 0) || 0, 0);
        const search = typeof body.search === "string" ? body.search.slice(0, 200) : null;
        const { data, error } = await admin.rpc("admin_list_users", {
          p_search: search,
          p_limit: limit,
          p_offset: offset,
        });
        if (error) throw new HttpError(500, error.message);
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        return json({
          users: rows.map(({ total_count: _t, ...u }) => u),
          total: rows.length ? Number(rows[0].total_count) : 0,
          can_manage: isSuperadmin,
        });
      }

      case "get": {
        const userId = requireUuid(body.user_id);
        const target = await loadTarget(userId);
        const count = (table: string) =>
          admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId)
            .then(({ count, error }) => (error ? null : count ?? 0));

        const [profile, subscription, roles, usage, charts, readings, dreams, compat, auditRows] =
          await Promise.all([
            admin.from("profiles").select("*").eq("user_id", userId).maybeSingle().then((r) => r.data),
            admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle().then((r) => r.data),
            rolesOf(userId),
            admin.from("usage_counters").select("resource,count,period_start")
              .eq("user_id", userId).eq("period_start", firstOfMonthUtc()).then((r) => r.data ?? []),
            count("birth_charts"),
            count("oracle_readings"),
            count("dream_interpretations"),
            count("compatibility_reports"),
            isSuperadmin
              ? admin.from("admin_audit_log").select("*").eq("target_user_id", userId)
                  .order("created_at", { ascending: false }).limit(20).then((r) => r.data ?? [])
              : Promise.resolve(null),
          ]);

        return json({
          user: {
            id: target.id,
            email: target.email,
            created_at: target.created_at,
            last_sign_in_at: target.last_sign_in_at,
            banned_until: (target as { banned_until?: string }).banned_until ?? null,
            providers: target.app_metadata?.providers ?? [],
            full_name: target.user_metadata?.full_name ?? target.user_metadata?.name ?? null,
            avatar_url: target.user_metadata?.avatar_url ?? null,
          },
          profile,
          subscription,
          roles,
          usage_this_month: usage,
          totals: { birth_charts: charts, oracle_readings: readings, dream_interpretations: dreams, compatibility_reports: compat },
          audit: auditRows,
          can_manage: isSuperadmin,
          is_self: userId === caller.id,
        });
      }

      case "audit": {
        requireSuperadmin();
        const limit = Math.min(Math.max(Number(body.limit ?? 100) || 100, 1), 500);
        let q = admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
        if (body.user_id) q = q.eq("target_user_id", requireUuid(body.user_id));
        const { data, error } = await q;
        if (error) throw new HttpError(500, error.message);
        return json({ entries: data ?? [] });
      }

      case "set_role": {
        requireSuperadmin();
        const userId = requireUuid(body.user_id);
        const role = String(body.role) as GrantableRole;
        if (!GRANTABLE_ROLES.includes(role)) throw new HttpError(400, "role must be admin or superadmin");
        const grant = body.grant === true;
        if (!grant) notSelf(userId, "remove a role from");
        const target = await loadTarget(userId);
        const before = await rolesOf(userId);

        const { error } = grant
          ? await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true })
          : await admin.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) {
          // The database refuses to remove the last superadmin.
          const status = /last superadmin/i.test(error.message) ? 409 : 500;
          throw new HttpError(status, error.message);
        }
        const after = await rolesOf(userId);
        await audit(grant ? "role.grant" : "role.revoke", target, { role, before, after });
        return json({ ok: true, roles: after });
      }

      case "set_plan": {
        requireSuperadmin();
        const userId = requireUuid(body.user_id);
        const tier = String(body.tier) as Tier;
        if (!TIERS.includes(tier)) throw new HttpError(400, `tier must be one of ${TIERS.join(", ")}`);
        let periodEnd: string | null = null;
        if (tier !== "darshana") {
          if (body.period_end) {
            const d = new Date(String(body.period_end));
            if (isNaN(d.getTime()) || d.getTime() <= Date.now()) throw new HttpError(400, "period_end must be a future date");
            periodEnd = d.toISOString();
          } else {
            const d = new Date();
            d.setUTCFullYear(d.getUTCFullYear() + 1);
            periodEnd = d.toISOString();
          }
        }
        const target = await loadTarget(userId);
        const { data: beforeSub } = await admin.from("subscriptions").select("tier,status,provider,current_period_end")
          .eq("user_id", userId).maybeSingle();
        const now = new Date().toISOString();

        const { error: subErr } = await admin.from("subscriptions").upsert({
          user_id: userId,
          tier,
          status: "active",
          currency: "AUD",
          billing_interval: tier === "darshana" ? null : "annual",
          provider: "admin_grant",
          current_period_start: now,
          current_period_end: periodEnd,
          trial_ends_at: null,
          cancel_at: null,
          cancelled_at: null,
          metadata: { granted_by: caller.id, granted_by_email: caller.email, granted_at: now },
        }, { onConflict: "user_id" });
        if (subErr) throw new HttpError(500, subErr.message);

        const { error: profErr } = await admin.from("profiles").update({ subscription_tier: tier }).eq("user_id", userId);
        if (profErr) throw new HttpError(500, `Subscription updated but profile tier was not: ${profErr.message}`);

        await audit("plan.set", target, { before: beforeSub, after: { tier, current_period_end: periodEnd } });
        return json({ ok: true, tier, current_period_end: periodEnd });
      }

      case "disable":
      case "enable": {
        requireSuperadmin();
        const userId = requireUuid(body.user_id);
        const disable = action === "disable";
        if (disable) notSelf(userId, "disable");
        const target = await loadTarget(userId);
        const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;

        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: disable ? BAN_FOREVER : "none",
        });
        if (error) throw new HttpError(500, error.message);

        let sessionsRevoked = 0;
        if (disable) {
          const { data, error: revErr } = await admin.rpc("admin_revoke_sessions", { p_user_id: userId });
          if (revErr) console.error("[admin-users] session revoke after disable failed", revErr);
          else sessionsRevoked = Number(data ?? 0);
        }
        const { error: profErr } = await admin.from("profiles").update({ is_active: !disable }).eq("user_id", userId);
        if (profErr) console.error("[admin-users] is_active sync failed", profErr);

        await audit(disable ? "user.disable" : "user.enable", target, { reason, sessions_revoked: sessionsRevoked });
        return json({ ok: true, sessions_revoked: sessionsRevoked });
      }

      case "sign_out": {
        requireSuperadmin();
        const userId = requireUuid(body.user_id);
        notSelf(userId, "force sign-out");
        const target = await loadTarget(userId);
        const { data, error } = await admin.rpc("admin_revoke_sessions", { p_user_id: userId });
        if (error) throw new HttpError(500, error.message);
        await audit("user.sign_out", target, { sessions_revoked: Number(data ?? 0) });
        return json({ ok: true, sessions_revoked: Number(data ?? 0) });
      }

      case "delete": {
        requireSuperadmin();
        const userId = requireUuid(body.user_id);
        notSelf(userId, "delete");
        const target = await loadTarget(userId);
        // Typed confirmation, checked here too — not only in the UI.
        const confirm = String(body.confirm_email ?? "").trim().toLowerCase();
        if (!target.email || confirm !== target.email.toLowerCase()) {
          throw new HttpError(400, "Type the user's email exactly to confirm deletion");
        }
        const rolesBefore = await rolesOf(userId);

        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) {
          const status = /last superadmin/i.test(error.message) ? 409 : 500;
          throw new HttpError(status, error.message);
        }
        // Rows in tables with no cascading foreign key (subscriptions, usage…).
        const { data: purged, error: purgeErr } = await admin.rpc("admin_purge_user_data", { p_user_id: userId });
        if (purgeErr) console.error("[admin-users] purge after delete failed", purgeErr);

        await audit("user.delete", target, {
          roles: rolesBefore,
          purged: purged ?? null,
          purge_error: purgeErr?.message ?? null,
        });
        return json({ ok: true, purged: purged ?? null });
      }

      default:
        throw new HttpError(400, `Unknown action "${action}"`);
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("[admin-users] unexpected", e);
    return json({ error: "Internal error" }, 500);
  }
});
