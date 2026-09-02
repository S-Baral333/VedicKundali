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
  if (ms <= 0) return "any moment";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days >= 1) return `${days}d ${hours}h`;
  if (hours >= 1) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTargetLabel(period: Period, target: Date): string {
  if (period === "daily" || period === "tomorrow") {
    return target.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (period === "weekly") {
    return target.toLocaleDateString([], { weekday: "long" });
  }
  if (period === "monthly") {
    return target.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return target.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function NextRefreshBadge({ period }: { period: Period }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const target = nextRefreshAt(period);
  const countdown = formatCountdown(target);
  const targetLabel = formatTargetLabel(period, target);

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
      title={`Next reading at ${target.toLocaleString()}`}
    >
      <Clock className="h-3 w-3" />
      <span>Refreshes in {countdown} · {targetLabel}</span>
    </span>
  );
}
