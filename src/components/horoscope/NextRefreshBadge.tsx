import i18n from "@/i18n/config";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

type Period = "daily" | "tomorrow" | "weekly" | "monthly" | "yearly";

function nextRefreshAt(period: Period): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "daily" || period === "tomorrow") {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (period === "weekly") {
    const day = now.getDay(); // 0=Sun..6=Sat
    const daysUntilMon = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + daysUntilMon);
    return d;
  }
  if (period === "monthly") {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  }
  return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
}

function formatCountdown(target: Date): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return i18n.t("pages:ui.nextRefreshBadge.anyMoment", "any moment");
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days >= 1) return i18n.t("pages:ui.nextRefreshBadge.daysHours", "{{days}}d {{hours}}h", { days, hours });
  if (hours >= 1) return i18n.t("pages:ui.nextRefreshBadge.hoursMins", "{{hours}}h {{mins}}m", { hours, mins });
  return i18n.t("pages:ui.nextRefreshBadge.mins", "{{mins}}m", { mins });
}

function formatTargetLabel(period: Period, target: Date): string {
  // Day readings always turn over at local midnight — "· 0:00" next to the
  // countdown added nothing, so show the countdown alone.
  if (period === "daily" || period === "tomorrow") return "";
  if (period === "weekly") {
    return target.toLocaleDateString([], { weekday: "long" });
  }
  if (period === "monthly") {
    return target.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return target.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/** `plain` renders just the text, for quiet inline meta lines. */
export default function NextRefreshBadge({ period, plain = false }: { period: Period; plain?: boolean }) {
  const { t } = useTranslation();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = nextRefreshAt(period);
  const countdown = formatCountdown(target);
  const targetLabel = formatTargetLabel(period, target);
  const text = t("pages:ui.nextRefreshBadge.refreshesIn", "Refreshes in {{countdown}}", { countdown }) + (targetLabel ? ` · ${targetLabel}` : "");
  const title = t("pages:ui.nextRefreshBadge.nextReadingAt", "Next reading at {{time}}", { time: target.toLocaleString() });

  if (plain) return <span title={title}>{text}</span>;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{
        background: "hsl(var(--gold) / 0.08)",
        border: "0.5px solid hsl(var(--gold) / 0.25)",
        fontSize: "0.65rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "hsl(var(--gold-pale))",
      }}
      title={title}
    >
      <Clock className="h-3 w-3" />
      <span>{text}</span>
    </span>
  );
}
