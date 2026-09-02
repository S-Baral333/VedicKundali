import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const emptyForm = { planet: "", house: null as number | null, sign: "", interpretation: "", keywords: "", strength: "" };

export default function PlanetsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    const { data } = await supabase.from("planet_interpretations").select("*").order("planet");
    setItems(data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const payload = { ...form, house: form.house || null };
    if (editing) {
      const { error } = await supabase.from("planet_interpretations").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("planet_interpretations").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Added");
    }
    setOpen(false); setEditing(null); setForm(emptyForm); fetchData();
  };

  const handleEdit = (item: any) => { setEditing(item); setForm(item); setOpen(true); };
  const handleDelete = async (id: string) => {
    await supabase.from("planet_interpretations").delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };

  const u = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Planet Interpretations</h1>
          <p className="text-muted-foreground mt-1">Manage planetary placement meanings</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Interpretation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Planet</Label><Input value={form.planet} onChange={(e) => u("planet", e.target.value)} placeholder="e.g. Sun, Moon, Mars" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>House (1-12)</Label><Input type="number" min={1} max={12} value={form.house ?? ""} onChange={(e) => u("house", e.target.value ? parseInt(e.target.value) : null)} /></div>
                <div><Label>Sign</Label><Input value={form.sign || ""} onChange={(e) => u("sign", e.target.value)} placeholder="e.g. Aries" /></div>
              </div>
              <div><Label>Interpretation</Label><Textarea value={form.interpretation} onChange={(e) => u("interpretation", e.target.value)} rows={4} /></div>
              <div><Label>Keywords</Label><Input value={form.keywords || ""} onChange={(e) => u("keywords", e.target.value)} /></div>
              <div><Label>Strength</Label><Input value={form.strength || ""} onChange={(e) => u("strength", e.target.value)} placeholder="e.g. Strong, Weak, Exalted" /></div>
            </div>
            <Button onClick={handleSave} className="w-full mt-4">{editing ? "Update" : "Create"}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader><CardTitle>All Interpretations ({items.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Planet</TableHead><TableHead>House</TableHead><TableHead>Sign</TableHead>
                <TableHead>Strength</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.planet}</TableCell>
                  <TableCell className="text-muted-foreground">{item.house || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.sign || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.strength || "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No interpretations yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
