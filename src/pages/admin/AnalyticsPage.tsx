import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AnalyticsPage() {
  const [contentStats, setContentStats] = useState({ nakshatras: 0, planets: 0, remedies: 0, yogas: 0 });
  const [userGrowth, setUserGrowth] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [n, p, r, y] = await Promise.all([
        supabase.from("nakshatras").select("id", { count: "exact", head: true }),
        supabase.from("planet_interpretations").select("id", { count: "exact", head: true }),
        supabase.from("remedies").select("id", { count: "exact", head: true }),
        supabase.from("yogas").select("id", { count: "exact", head: true }),
      ]);
      setContentStats({
        nakshatras: n.count ?? 0,
        planets: p.count ?? 0,
        remedies: r.count ?? 0,
        yogas: y.count ?? 0,
      });

      // User growth - group by date
      const { data: profiles } = await supabase.from("profiles").select("created_at").order("created_at");
      if (profiles) {
        const grouped: Record<string, number> = {};
        profiles.forEach((p) => {
          const date = new Date(p.created_at).toLocaleDateString();
          grouped[date] = (grouped[date] || 0) + 1;
        });
        setUserGrowth(Object.entries(grouped).map(([date, count]) => ({ date, users: count })));
      }
    };
    fetch();
  }, []);

  const contentData = [
    { name: "Nakshatras", count: contentStats.nakshatras, fill: "hsl(var(--chart-1))" },
    { name: "Planets", count: contentStats.planets, fill: "hsl(var(--chart-2))" },
    { name: "Remedies", count: contentStats.remedies, fill: "hsl(var(--chart-3))" },
    { name: "Yogas", count: contentStats.yogas, fill: "hsl(var(--chart-4))" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform insights and statistics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New signups over time</CardDescription>
          </CardHeader>
          <CardContent>
            {userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">No user data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Coverage</CardTitle>
            <CardDescription>Configured content entries</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={contentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
