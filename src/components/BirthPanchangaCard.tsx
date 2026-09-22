import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  if (!panchanga) return null;
  const { tithi, nakshatra, yoga, karana, masa, vara } = panchanga;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("pages:ui.birthPanchangaCard.title", "Birth Panchanga")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("pages:ui.birthPanchangaCard.desc", "The five limbs of Vedic time at your birth moment.")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Item label="Tithi" value={tithi.name} sub={`${tithi.paksha} Paksha · #${tithi.number}`} />
          <Item label="Nakshatra" value={nakshatra.name} sub={`Pada ${nakshatra.pada} · #${nakshatra.number}`} />
          <Item label="Paksha" value={tithi.paksha} sub={tithi.paksha === "Shukla" ? t("pages:ui.birthPanchangaCard.waxing", "Waxing Moon") : t("pages:ui.birthPanchangaCard.waning", "Waning Moon")} />
          <Item label={t("pages:ui.birthPanchangaCard.vedicMasa", "Vedic Masa")} value={masa.name} sub={t("pages:ui.birthPanchangaCard.lunarMonth", "Lunar month")} />
          <Item label="Vara" value={vara.name} sub={t("pages:ui.birthPanchangaCard.weekday", "Weekday")} />
          <Item label="Yoga" value={yoga.name} sub={t("pages:ui.birthPanchangaCard.yogaOf", "#{{n}} of 27", { n: yoga.number })} />
          <Item label="Karana" value={karana.name} sub={t("pages:ui.birthPanchangaCard.halfTithi", "Half-tithi #{{n}}", { n: karana.number })} />
        </div>
      </CardContent>
    </Card>
  );
}
