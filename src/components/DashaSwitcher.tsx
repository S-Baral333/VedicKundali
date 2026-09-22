import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PillTabs from "@/components/PillTabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSubscription } from "@/hooks/useSubscription";
import { Clock, Compass, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface DashaSwitcherProps {
  vimshottari?: { maha_dasha: string; antar_dasha?: string; pratyantar_dasha?: string };
  yogini?: { yogini: string; planet: string; years: number };
  ashtottari?: { current: string; years: number; remaining_years: number };
  chara?: { current_sign: string; years: number; remaining_years: number; sequence?: { sign: string; years: number }[] };
}

/**
 * Dasha Switcher — Elite-only multi-system dasha lens.
 * Vimshottari is always visible (free); Ashtottari + Chara unlock on Elite.
 */
export default function DashaSwitcher({ vimshottari, yogini, ashtottari, chara }: DashaSwitcherProps) {
  const { isElite } = useSubscription();
  const { t } = useTranslation();
  const [tab, setTab] = useState("vimshottari");

  if (!vimshottari) return null;

  const items = [
    { value: "vimshottari", label: "Vimshottari", icon: Clock },
    { value: "yogini", label: "Yogini", icon: Compass, disabled: !yogini },
    { value: "ashtottari", label: "Ashtottari", icon: Compass, disabled: !ashtottari },
    { value: "chara", label: "Chara", icon: Compass, disabled: !chara },
  ];

  return (
    <div>
      <h3 className="font-serif font-semibold text-foreground mb-3 text-lg flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" /> {t("pages:ui.dashaSwitcher.activeDashaPeriods", "Active Dasha Periods")}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 border-primary/30 text-primary">
          <Zap className="h-3 w-3" /> {t("pages:ui.dashaSwitcher.fourSystems", "4 Systems")}
        </Badge>
      </h3>
      <PillTabs items={items} value={tab} onValueChange={setTab} />
      <Tabs value={tab} onValueChange={setTab} className="w-full mt-3">
        <TabsContent value="vimshottari">
          <Card className="border-primary/15">
            <CardContent className="py-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.maha", "Maha")}</span><span className="font-medium text-foreground">{vimshottari.maha_dasha}</span></div>
              {vimshottari.antar_dasha && <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.antar", "Antar")}</span><span className="font-medium text-foreground">{vimshottari.antar_dasha}</span></div>}
              {vimshottari.pratyantar_dasha && <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.pratyantar", "Pratyantar")}</span><span className="font-medium text-foreground">{vimshottari.pratyantar_dasha}</span></div>}
              <p className="text-[11px] text-muted-foreground/70 pt-2">{t("pages:ui.dashaSwitcher.vimshottariDesc", "120-year nakshatra-based cycle. Most widely used dasha system in Vedic astrology.")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yogini">
          {yogini && (
            <Card className="border-primary/15">
              <CardContent className="py-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.activeYogini", "Active Yogini")}</span><span className="font-medium text-foreground">{yogini.yogini}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.ruledBy", "Ruled by")}</span><span className="font-medium text-foreground">{yogini.planet}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.periodLength", "Period length")}</span><span className="font-medium text-foreground">{t("pages:ui.dashaSwitcher.years", "{{count}} years", { count: yogini.years })}</span></div>
                <p className="text-[11px] text-muted-foreground/70 pt-2">{t("pages:ui.dashaSwitcher.yoginiDesc", "36-year tantric cycle. Excellent for spiritual & emotional life arc.")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ashtottari">
          {!isElite ? (
            <EliteLock label={t("pages:ui.dashaSwitcher.ashtottariLock", "Ashtottari Dasha (108-year cycle)")} />
          ) : ashtottari ? (
            <Card className="border-primary/15">
              <CardContent className="py-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.currentLord", "Current Lord")}</span><span className="font-medium text-foreground">{ashtottari.current}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.periodLength", "Period length")}</span><span className="font-medium text-foreground">{t("pages:ui.dashaSwitcher.years", "{{count}} years", { count: ashtottari.years })}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.timeRemaining", "Time remaining")}</span><span className="font-medium text-foreground">{t("pages:ui.dashaSwitcher.years", "{{count}} years", { count: ashtottari.remaining_years })}</span></div>
                <p className="text-[11px] text-muted-foreground/70 pt-2">{t("pages:ui.dashaSwitcher.ashtottariDesc", "108-year cycle. Used as a precision cross-check on Vimshottari.")}</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="chara">
          {!isElite ? (
            <EliteLock label={t("pages:ui.dashaSwitcher.charaLock", "Chara Dasha (Jaimini sign-based)")} />
          ) : chara ? (
            <Card className="border-primary/15">
              <CardContent className="py-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.currentSign", "Current Sign")}</span><span className="font-medium text-foreground">{chara.current_sign}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.periodLength", "Period length")}</span><span className="font-medium text-foreground">{t("pages:ui.dashaSwitcher.years", "{{count}} years", { count: chara.years })}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("pages:ui.dashaSwitcher.timeRemaining", "Time remaining")}</span><span className="font-medium text-foreground">{t("pages:ui.dashaSwitcher.years", "{{count}} years", { count: chara.remaining_years })}</span></div>
                <p className="text-[11px] text-muted-foreground/70 pt-2">{t("pages:ui.dashaSwitcher.charaDesc", "Jaimini's sign-based dasha. Often pinpoints career & event timing more sharply than Vimshottari.")}</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EliteLock({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <Card className="border-primary/15 bg-card/50">
      <CardContent className="py-6 text-center space-y-3">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-3 rounded-full border border-primary/30">
            <Lock className="h-5 w-5 text-primary" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t("pages:ui.dashaSwitcher.unlocksWithElite", "{{label}} unlocks with Elite.", { label })}</p>
        <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary" onClick={() => window.location.href = "/pricing"}>
          <Zap className="h-3.5 w-3.5" /> {t("pages:ui.dashaSwitcher.upgradeToElite", "Upgrade to Elite")}
        </Button>
      </CardContent>
    </Card>
  );
}
