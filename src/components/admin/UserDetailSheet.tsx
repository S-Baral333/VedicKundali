import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { TIERS, normalizeTier, type Tier } from "@/lib/tiers";
import { adminUsers, isDisabled, type AdminUserDetail, type GrantableRole } from "@/lib/adminUsers";
import { describeAudit } from "@/components/admin/auditFormat";

const SELECTABLE: Tier[] = ["darshana", "sadhaka", "grihastha", "jyotisha"];

interface Confirm {
  title: string;
  body: string;
  cta: string;
  destructive?: boolean;
  /** When set, the user must type this exact text to enable the button. */
  typeToConfirm?: string;
  run: (typed: string) => Promise<void>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right break-all">{children}</span>
    </div>
  );
}

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "—");

export default function UserDetailSheet({
  userId, onClose, onChanged,
}: { userId: string | null; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [planTier, setPlanTier] = useState<Tier>("darshana");
  const [planEnd, setPlanEnd] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [typed, setTyped] = useState("");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await adminUsers.get(id);
      setDetail(d);
      setPlanTier(normalizeTier(d.subscription?.tier ?? (d.profile?.subscription_tier as string | undefined)));
      setPlanEnd(d.subscription?.current_period_end?.slice(0, 10) ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    if (userId) load(userId);
  }, [userId, load]);

  /** Run an action, report it, then refresh this panel and the list. */
  const act = async (label: string, fn: () => Promise<unknown>) => {
    if (!userId) return;
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      await load(userId);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const ask = (c: Confirm) => { setTyped(""); setConfirm(c); };

  const d = detail;
  const manage = !!d?.can_manage;
  const disabled = isDisabled(d?.user.banned_until);
  const email = d?.user.email ?? "";

  const toggleRole = (role: GrantableRole, grant: boolean) => {
    if (!d) return;
    const verb = grant ? "Grant" : "Remove";
    ask({
      title: `${verb} ${role}?`,
      body: grant
        ? role === "superadmin"
          ? `${email} will be able to manage every user, including other superadmins, and read the audit log.`
          : `${email} will get the admin panel (content, analytics, appearance, AI engine) and a read-only user list.`
        : `${email} loses the ${role} role.`,
      cta: `${verb} ${role}`,
      destructive: !grant,
      run: () => act(`${verb === "Grant" ? "Granted" : "Removed"} ${role}`, () => adminUsers.setRole(d.user.id, role, grant)),
    });
  };

  return (
    <>
      <Sheet open={!!userId} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent className="dark w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="break-all">{d?.user.email ?? (loading ? "Loading…" : "User")}</SheetTitle>
            <div className="flex items-center gap-2">
              <SheetDescription>{d?.user.full_name || "—"}</SheetDescription>
              {d?.is_self && <Badge variant="outline">You</Badge>}
            </div>
          </SheetHeader>

          {error && <p className="text-destructive text-sm mt-4">{error}</p>}

          {d && (
            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Account</h3>
                <Row label="Status">
                  <Badge variant={disabled ? "destructive" : "default"}>{disabled ? "Disabled" : "Active"}</Badge>
                </Row>
                <Row label="User id"><code className="text-xs">{d.user.id}</code></Row>
                <Row label="Sign-in methods">{d.user.providers.join(", ") || "—"}</Row>
                <Row label="Joined">{when(d.user.created_at)}</Row>
                <Row label="Last sign-in">{when(d.user.last_sign_in_at)}</Row>
                <Row label="Birthplace">{(d.profile?.birthplace as string) || "—"}</Row>
              </section>

              <Separator />

              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Plan</h3>
                <Row label="Current">
                  {TIERS[normalizeTier(d.subscription?.tier)].sanskrit}
                  {d.subscription && ` · ${d.subscription.status} · ${d.subscription.provider}`}
                </Row>
                <Row label="Renews / ends">{when(d.subscription?.current_period_end)}</Row>
                {manage && (
                  <div className="flex flex-wrap items-end gap-2 mt-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Plan</Label>
                      <Select value={planTier} onValueChange={(v) => setPlanTier(v as Tier)}>
                        <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SELECTABLE.map((t) => (
                            <SelectItem key={t} value={t}>{TIERS[t].sanskrit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {planTier !== "darshana" && (
                      <div className="space-y-1">
                        <Label className="text-xs" htmlFor="plan-end">Until</Label>
                        <Input id="plan-end" type="date" className="h-9 w-40" value={planEnd}
                          onChange={(e) => setPlanEnd(e.target.value)} />
                      </div>
                    )}
                    <Button size="sm" disabled={busy} onClick={() => act(
                      `Plan set to ${TIERS[planTier].sanskrit}`,
                      () => adminUsers.setPlan(d.user.id, planTier, planTier !== "darshana" && planEnd ? planEnd : undefined),
                    )}>
                      Apply plan
                    </Button>
                  </div>
                )}
                {manage && planTier !== "darshana" && !planEnd && (
                  <p className="text-[11px] text-muted-foreground mt-1">No end date picked: the grant lasts one year.</p>
                )}
              </section>

              <Separator />

              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Usage</h3>
                <Row label="Birth charts">{d.totals.birth_charts ?? "—"}</Row>
                <Row label="Rishi Guru questions">{d.totals.oracle_readings ?? "—"}</Row>
                <Row label="Dream interpretations">{d.totals.dream_interpretations ?? "—"}</Row>
                <Row label="Compatibility reports">{d.totals.compatibility_reports ?? "—"}</Row>
                <div className="mt-2 text-xs text-muted-foreground">This month:</div>
                {d.usage_this_month.length === 0
                  ? <p className="text-xs text-muted-foreground">No metered use yet.</p>
                  : d.usage_this_month.map((u) => <Row key={u.resource} label={u.resource}>{u.count}</Row>)}
              </section>

              <Separator />

              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Roles</h3>
                {(["admin", "superadmin"] as GrantableRole[]).map((role) => {
                  const has = d.roles.includes(role);
                  const lockSelf = d.is_self && has; // can't remove your own role
                  return (
                    <div key={role} className="flex items-center justify-between py-1.5">
                      <div>
                        <div className="text-sm text-foreground">{role}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {role === "admin" ? "Admin panel, read-only users" : "Everything, including user management"}
                        </div>
                      </div>
                      <Switch
                        checked={has}
                        disabled={!manage || busy || lockSelf}
                        onCheckedChange={(v) => toggleRole(role, v)}
                        aria-label={`${role} role`}
                      />
                    </div>
                  );
                })}
              </section>

              {manage && !d.is_self && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Access</h3>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled={busy}
                      onClick={() => ask({
                        title: "Sign this user out everywhere?",
                        body: "Ends every session so they must sign in again. A page they already have open keeps working for up to an hour.",
                        cta: "Sign out",
                        run: () => act("Signed out everywhere", () => adminUsers.signOut(d.user.id)),
                      })}>
                      <LogOut className="h-4 w-4" /> Sign out everywhere
                    </Button>
                    {disabled ? (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled={busy}
                        onClick={() => act("Account enabled", () => adminUsers.enable(d.user.id))}>
                        <CheckCircle2 className="h-4 w-4" /> Enable account
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-amber-400" disabled={busy}
                        onClick={() => ask({
                          title: "Disable this account?",
                          body: `${email} is signed out and can't sign in until you enable the account again. Their data is kept.`,
                          cta: "Disable",
                          destructive: true,
                          run: () => act("Account disabled", () => adminUsers.disable(d.user.id)),
                        })}>
                        <Ban className="h-4 w-4" /> Disable account
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" className="w-full justify-start gap-2" disabled={busy}
                      onClick={() => ask({
                        title: "Delete this account permanently?",
                        body: "Deletes the sign-in, profile, charts, readings, subscription and usage. This can't be undone. The audit log keeps a record that it happened.",
                        cta: "Delete permanently",
                        destructive: true,
                        typeToConfirm: email,
                        run: (t) => act("Account deleted", async () => {
                          await adminUsers.remove(d.user.id, t);
                          onClose();
                        }),
                      })}>
                      <Trash2 className="h-4 w-4" /> Delete account
                    </Button>
                  </section>
                </>
              )}

              {d.audit && (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent admin actions</h3>
                    {d.audit.length === 0
                      ? <p className="text-xs text-muted-foreground">None.</p>
                      : (
                        <ul className="space-y-2">
                          {d.audit.map((a) => (
                            <li key={a.id} className="text-xs">
                              <span className="text-foreground">{describeAudit(a)}</span>
                              <div className="text-muted-foreground">{a.actor_email ?? a.actor_id} · {when(a.created_at)}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                  </section>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.typeToConfirm && (
            <div className="space-y-1">
              <Label htmlFor="type-confirm" className="text-xs">
                Type <span className="font-mono text-foreground">{confirm.typeToConfirm}</span> to confirm
              </Label>
              <Input id="type-confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              disabled={!!confirm?.typeToConfirm && typed.trim().toLowerCase() !== confirm.typeToConfirm.toLowerCase()}
              onClick={() => { const c = confirm; setConfirm(null); c?.run(typed.trim()); }}
            >
              {confirm?.cta}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
