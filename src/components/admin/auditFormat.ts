import type { AuditEntry } from "@/lib/adminUsers";

/** One readable line for an audit entry. */
export function describeAudit(a: AuditEntry): string {
  const who = a.target_email ?? a.target_user_id ?? "a user";
  const d = (a.details ?? {}) as Record<string, unknown>;
  switch (a.action) {
    case "role.grant": return `Granted ${d.role} to ${who}`;
    case "role.revoke": return `Removed ${d.role} from ${who}`;
    case "plan.set": {
      const after = (d.after ?? {}) as { tier?: string };
      const before = (d.before ?? {}) as { tier?: string } | null;
      return `Changed ${who}'s plan${before?.tier ? ` from ${before.tier}` : ""} to ${after.tier ?? "?"}`;
    }
    case "user.disable": return `Disabled ${who}${d.reason ? ` (${d.reason})` : ""}`;
    case "user.enable": return `Enabled ${who}`;
    case "user.sign_out": return `Signed ${who} out (${d.sessions_revoked ?? 0} sessions)`;
    case "user.delete": return `Deleted ${who}`;
    default: return `${a.action} · ${who}`;
  }
}
