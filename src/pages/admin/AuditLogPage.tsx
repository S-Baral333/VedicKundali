import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { adminUsers, type AuditEntry } from "@/lib/adminUsers";
import { describeAudit } from "@/components/admin/auditFormat";

export default function AuditLogPage() {
  const { isSuperadmin } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries((await adminUsers.audit(200)).entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isSuperadmin) load(); }, [isSuperadmin, load]);

  if (!isSuperadmin) {
    return <p className="text-muted-foreground">The audit log is available to superadmins only.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Audit log</h1>
          <p className="text-muted-foreground mt-1">Every user-management action, newest first. Entries can't be edited or deleted.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <Card className="border-border/50 bg-card/80">
        <CardHeader><CardTitle className="text-foreground">Latest {entries.length}</CardTitle></CardHeader>
        <CardContent>
          {error ? <p className="text-destructive text-sm">{error}</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>What happened</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-[10px]">{a.action}</Badge></TableCell>
                      <TableCell className="text-sm text-foreground">{describeAudit(a)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.actor_email ?? a.actor_id}</TableCell>
                    </TableRow>
                  ))}
                  {!loading && entries.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No admin actions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
