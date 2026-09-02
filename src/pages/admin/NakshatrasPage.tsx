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

const emptyNakshatra = {
  number: 1, name: "", sanskrit_name: "", ruling_planet: "", deity: "", symbol: "",
  traits: "", strengths: "", challenges: "", career: "", relationships: "", spiritual_path: "",
  degree_start: 0, degree_end: 0,
};

export default function NakshatrasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyNakshatra);

  const fetch = async () => {
    const { data } = await supabase.from("nakshatras").select("*").order("number");
    setItems(data ?? []);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (editing) {
      const { error } = await supabase.from("nakshatras").update(form).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Nakshatra updated");
    } else {
      const { error } = await supabase.from("nakshatras").insert(form);
      if (error) { toast.error(error.message); return; }
      toast.success("Nakshatra added");
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyNakshatra);
    fetch();
  };

  const handleEdit = (item: any) => {
    setEditing(item);
    setForm(item);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("nakshatras").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Nakshatra deleted");
    fetch();
  };

  const updateField = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Nakshatras</h1>
          <p className="text-muted-foreground mt-1">Manage the 27 Nakshatras</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyNakshatra); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Nakshatra</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : "Add"} Nakshatra</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Number</Label><Input type="number" min={1} max={27} value={form.number} onChange={(e) => updateField("number", parseInt(e.target.value))} /></div>
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => updateField("name", e.target.value)} /></div>
              <div><Label>Sanskrit Name</Label><Input value={form.sanskrit_name || ""} onChange={(e) => updateField("sanskrit_name", e.target.value)} /></div>
              <div><Label>Ruling Planet</Label><Input value={form.ruling_planet || ""} onChange={(e) => updateField("ruling_planet", e.target.value)} /></div>
              <div><Label>Deity</Label><Input value={form.deity || ""} onChange={(e) => updateField("deity", e.target.value)} /></div>
              <div><Label>Symbol</Label><Input value={form.symbol || ""} onChange={(e) => updateField("symbol", e.target.value)} /></div>
              <div><Label>Degree Start</Label><Input type="number" value={form.degree_start || 0} onChange={(e) => updateField("degree_start", parseFloat(e.target.value))} /></div>
              <div><Label>Degree End</Label><Input type="number" value={form.degree_end || 0} onChange={(e) => updateField("degree_end", parseFloat(e.target.value))} /></div>
              <div className="col-span-2"><Label>Traits</Label><Textarea value={form.traits || ""} onChange={(e) => updateField("traits", e.target.value)} /></div>
              <div className="col-span-2"><Label>Strengths</Label><Textarea value={form.strengths || ""} onChange={(e) => updateField("strengths", e.target.value)} /></div>
              <div className="col-span-2"><Label>Challenges</Label><Textarea value={form.challenges || ""} onChange={(e) => updateField("challenges", e.target.value)} /></div>
              <div className="col-span-2"><Label>Career</Label><Textarea value={form.career || ""} onChange={(e) => updateField("career", e.target.value)} /></div>
              <div className="col-span-2"><Label>Relationships</Label><Textarea value={form.relationships || ""} onChange={(e) => updateField("relationships", e.target.value)} /></div>
              <div className="col-span-2"><Label>Spiritual Path</Label><Textarea value={form.spiritual_path || ""} onChange={(e) => updateField("spiritual_path", e.target.value)} /></div>
            </div>
            <Button onClick={handleSave} className="w-full mt-4">{editing ? "Update" : "Create"}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader><CardTitle>All Nakshatras ({items.length}/27)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Ruling Planet</TableHead>
                <TableHead>Deity</TableHead>
                <TableHead>Degrees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-foreground">{item.number}</TableCell>
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.ruling_planet || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.deity || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.degree_start}° - {item.degree_end}°</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(item)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No nakshatras configured yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
