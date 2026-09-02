import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Star, Gem, Sparkles } from "lucide-react";

interface Stats {
  totalUsers: number;
  nakshatras: number;
  remedies: number;
  yogas: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, nakshatras: 0, remedies: 0, yogas: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [profiles, nakshatras, remedies, yogas] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("nakshatras").select("id", { count: "exact", head: true }),
        supabase.from("remedies").select("id", { count: "exact", head: true }),
        supabase.from("yogas").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        totalUsers: profiles.count ?? 0,
        nakshatras: nakshatras.count ?? 0,
        remedies: remedies.count ?? 0,
        yogas: yogas.count ?? 0,
      });

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentUsers(data ?? []);
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, desc: "Registered accounts" },
    { title: "Nakshatras", value: stats.nakshatras, icon: Star, desc: "Configured entries" },
    { title: "Remedies", value: stats.remedies, icon: Gem, desc: "Available remedies" },
    { title: "Yogas", value: stats.yogas, icon: Sparkles, desc: "Defined yogas" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your Kundali platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Recent Users</CardTitle>
          <CardDescription>Latest signups on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users yet</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between border-b border-border/30 pb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.full_name || "No name"}</p>
                    <p className="text-xs text-muted-foreground">{u.birthplace || "No birthplace"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
