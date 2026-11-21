import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { TIERS, normalizeTier, type Tier } from "@/lib/tiers";
import { adminUsers, isDisabled, type AdminUserRow } from "@/lib/adminUsers";
import { useAuth } from "@/hooks/useAuth";
import UserDetailSheet from "@/components/admin/UserDetailSheet";

const tierBadgeStyles: Record<Tier, string> = {
  darshana:  "bg-muted text-muted-foreground border-muted-foreground/20",
  sadhaka:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
  grihastha: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  jyotisha:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function RoleBadges({ roles }: { roles: string[] }) {
  const shown = roles.filter((r) => r !== "user");
  if (!shown.length) return <span className="text-muted-foreground text-xs">user</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((r) => (
        <Badge
          key={r}
          variant="outline"
          className={r === "superadmin" ? "border-rose-500/40 text-rose-400" : "border-sky-500/40 text-sky-400"}
        >
          {r}
        </Badge>
      ))}
    </div>
  );
}

const PAGE_SIZE = 25;

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

export default function UsersPage() {
  const { isSuperadmin } = useAuth();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminUsers.list(debounced, PAGE_SIZE, page * PAGE_SIZE);
      setRows(res.users);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [debounced, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">
          {isSuperadmin
            ? "Search accounts, then open one to change its plan, roles or access. Every change is recorded in the audit log."
            : "Read-only: user management needs the superadmin role."}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email, name or user id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search users"
        />
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-foreground">
            {debounced ? `Matches (${total})` : `All users (${total})`}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page + 1} of {pages}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={page + 1 >= pages || loading}
              onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-start gap-2 text-destructive text-sm py-4">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>Couldn't load users: {error}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={load}>Retry</Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-muted-foreground py-8 text-center">Loading…</TableCell></TableRow>
                  )}
                  {rows.map((u) => {
                    const tier = normalizeTier(u.tier);
                    const disabled = isDisabled(u.banned_until);
                    return (
                      <TableRow
                        key={u.user_id}
                        className={`cursor-pointer ${loading ? "opacity-60" : ""}`}
                        onClick={() => setSelected(u.user_id)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") setSelected(u.user_id); }}
                      >
                        <TableCell>
                          <div className="font-medium text-foreground">{u.email ?? "(no email)"}</div>
                          <div className="text-xs text-muted-foreground">{u.full_name || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={tierBadgeStyles[tier]}>{TIERS[tier].sanskrit}</Badge>
                          {u.subscription_provider === "admin_grant" && (
                            <span className="ml-1 text-[10px] text-muted-foreground">(granted)</span>
                          )}
                        </TableCell>
                        <TableCell><RoleBadges roles={u.roles} /></TableCell>
                        <TableCell>
                          <Badge variant={disabled ? "destructive" : "default"}>{disabled ? "Disabled" : "Active"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(u.last_sign_in_at)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(u.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailSheet
        userId={selected}
        onClose={() => setSelected(null)}
        onChanged={load}
      />
    </div>
  );
}
