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

const emptyForm = { title: "", category: "general", planet: "", description: "", mantra: "", gemstone: "", ritual: "" };

export default function RemediesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    const { data } = await supabase.from("remedies").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (editing) {
      const { error } = await supabase.from("remedies").update(form).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("remedies").insert(form);
      if (error) { toast.error(error.message); return; }
      toast.success("Added");
    }
    setOpen(false); setEditing(null); setForm(emptyForm); fetchData();
  };

  const handleEdit = (item: any) => { setEditing(item); setForm(item); setOpen(true); };
  const handleDelete = async (id: string) => {
    await supabase.from("remedies").delete().eq("id", id);
    toast.success("Deleted"); fetchData();
  };
  const u = (f: string, v: any) => setForm((p: any) => ({ ...p, [f]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Remedies</h1>
          <p className="text-muted-foreground mt-1">Manage mantras, gemstones & rituals</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Remedy</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Remedy</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => u("title", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => u("category", e.target.value)} /></div>
                <div><Label>Planet</Label><Input value={form.planet || ""} onChange={(e) => u("planet", e.target.value)} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => u("description", e.target.value)} rows={3} /></div>
              <div><Label>Mantra</Label><Textarea value={form.mantra || ""} onChange={(e) => u("mantra", e.target.value)} rows={2} /></div>
              <div><Label>Gemstone</Label><Input value={form.gemstone || ""} onChange={(e) => u("gemstone", e.target.value)} /></div>
              <div><Label>Ritual</Label><Textarea value={form.ritual || ""} onChange={(e) => u("ritual", e.target.value)} rows={3} /></div>
            </div>
            <Button onClick={handleSave} className="w-full mt-4">{editing ? "Update" : "Create"}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader><CardTitle>All Remedies ({items.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Planet</TableHead>
                <TableHead>Gemstone</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.title}</TableCell>
                  <TableCell className="text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="text-muted-foreground">{item.planet || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.gemstone || "—"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No remedies yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
