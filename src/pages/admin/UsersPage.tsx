import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import { TIERS, type Tier, normalizeTier } from "@/lib/tiers";

const tierBadgeStyles: Record<Tier, string> = {
  darshana:  "bg-muted text-muted-foreground border-muted-foreground/20",
  sadhaka:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
  grihastha: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  jyotisha:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const SELECTABLE: Tier[] = ["darshana", "sadhaka", "grihastha", "jyotisha"];

export default function UsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,birthplace.ilike.%${search}%`);
    }
    const { data: profilesData } = await query;
    const userIds = (profilesData ?? []).map((p) => p.user_id);
    let subsByUser = new Map<string, any>();
    if (userIds.length) {
      const { data: subs } = await supabase
        .from("subscriptions" as any)
        .select("user_id,tier,status,trial_ends_at,current_period_end,billing_interval,provider")
        .in("user_id", userIds);
      ((subs ?? []) as any[]).forEach((s) => subsByUser.set(s.user_id, s));
    }
    setProfiles((profilesData ?? []).map((p) => ({ ...p, _sub: subsByUser.get(p.user_id) })));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: !currentStatus }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`User ${currentStatus ? "deactivated" : "activated"}`);
    fetchUsers();
  };

  const updateTier = async (profile: any, newTier: Tier) => {
    setUpdatingId(profile.id);
    try {
      // 1. Update profile column (fast read path)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ subscription_tier: newTier })
        .eq("id", profile.id);
      if (profileErr) throw profileErr;

      // 2. Upsert authoritative subscription row
      const existing = profile._sub;
      const oneYear = new Date(); oneYear.setFullYear(oneYear.getFullYear() + 1);
      const payload: any = {
        user_id: profile.user_id,
        tier: newTier,
        status: "active",
        currency: "AUD",
        billing_interval: "annual",
        provider: "admin_grant",
        current_period_start: new Date().toISOString(),
        current_period_end: newTier === "darshana" ? null : oneYear.toISOString(),
        trial_ends_at: null,
        cancel_at: null,
        cancelled_at: null,
        metadata: { granted_by: "admin", granted_at: new Date().toISOString() },
      };
      const { error: subErr } = existing
        ? await supabase.from("subscriptions" as any).update(payload).eq("user_id", profile.user_id)
        : await supabase.from("subscriptions" as any).insert(payload);
      if (subErr) throw subErr;

      toast.success(`Promoted to ${TIERS[newTier].sanskrit}`);
      fetchUsers();
    } catch (e: any) {
      console.error("[admin:updateTier]", e);
      toast.error(e?.message ?? "Failed to update tier");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile deleted");
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">Promote users between Sanskrit tiers. Updates both profile and subscription record.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or birthplace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-foreground">All Users ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Birthplace</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Sub status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Promote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const tier = normalizeTier(p.subscription_tier);
                  const sub = p._sub;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-foreground">{p.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.birthplace || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge className={tierBadgeStyles[tier]}>
                            {TIERS[tier].sanskrit}
                          </Badge>
                          {p.legacy_tier && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 opacity-60" title="Migrated from legacy tier">
                              was {p.legacy_tier}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub ? (
                          <span>
                            {sub.status}
                            {sub.provider === "admin_grant" && <span className="ml-1 text-[10px] opacity-60">(admin)</span>}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "destructive"}>
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={tier}
                            disabled={updatingId === p.id}
                            onValueChange={(value) => updateTier(p, value as Tier)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SELECTABLE.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {TIERS[t].sanskrit}{!TIERS[t].available && " (preview)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={() => toggleActive(p.id, p.is_active)}>
                            {p.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteUser(p.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
