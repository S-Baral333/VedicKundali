import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export interface PanchangaData {
  tithi: { number: number; name: string; paksha: "Shukla" | "Krishna" };
  nakshatra: { number: number; name: string; pada: number };
  yoga: { number: number; name: string };
  karana: { number: number; name: string };
  masa: { name: string };
  vara: { name: string };
}

interface BirthPanchangaCardProps {
  panchanga: PanchangaData;
}

const Item = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="flex flex-col gap-0.5 rounded-lg border border-border/30 bg-card/40 p-3">
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="font-serif text-base text-foreground leading-tight">{value}</span>
    {sub && <span className="text-[11px] text-muted-foreground/80">{sub}</span>}
  </div>
);

export default function BirthPanchangaCard({ panchanga }: BirthPanchangaCardProps) {
  if (!panchanga) return null;
  const { tithi, nakshatra, yoga, karana, masa, vara } = panchanga;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Birth Panchanga
        </CardTitle>
        <p className="text-xs text-muted-foreground">The five limbs of Vedic time at your birth moment.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Item label="Tithi" value={tithi.name} sub={`${tithi.paksha} Paksha · #${tithi.number}`} />
          <Item label="Nakshatra" value={nakshatra.name} sub={`Pada ${nakshatra.pada} · #${nakshatra.number}`} />
          <Item label="Paksha" value={tithi.paksha} sub={tithi.paksha === "Shukla" ? "Waxing Moon" : "Waning Moon"} />
          <Item label="Vedic Masa" value={masa.name} sub="Lunar month" />
          <Item label="Vara" value={vara.name} sub="Weekday" />
          <Item label="Yoga" value={yoga.name} sub={`#${yoga.number} of 27`} />
          <Item label="Karana" value={karana.name} sub={`Half-tithi #${karana.number}`} />
        </div>
      </CardContent>
    </Card>
  );
}
