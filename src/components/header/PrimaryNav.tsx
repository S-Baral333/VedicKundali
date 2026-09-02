import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Home,
  Sun,
  Compass,
  Moon,
  HeartHandshake,
  Sparkles,
  CalendarDays,
  MessageCircleQuestion,
  Timer,
  User,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const PRIMARY_ITEMS = [
  { label: "Home",    i18nKey: "nav:dashboard",     path: "/dashboard",     icon: Home },
  { label: "Today",   i18nKey: "nav:horoscope",     path: "/horoscope",     icon: Sun },
  { label: "Destiny", i18nKey: "nav:chart",         path: "/chart",         icon: Compass },
  { label: "Dreams",  i18nKey: "nav:dreams",        path: "/dreams",        icon: Moon },
  { label: "Match",   i18nKey: "nav:compatibility", path: "/compatibility", icon: HeartHandshake },
];

export const MORE_ITEMS = [
  { label: "Remedies", i18nKey: "nav:remedies",  path: "/remedies", icon: Sparkles,                desc: "Mantras, gemstones & rituals" },
  { label: "Timeline", i18nKey: "nav:timeline",  path: "/timeline", icon: CalendarDays,            desc: "Your 12-month cosmic roadmap" },
  { label: "Guru",     i18nKey: "nav:oracle",    path: "/ask",      icon: MessageCircleQuestion,   desc: "Decision guidance from the stars" },
  { label: "Muhurta",  i18nKey: "nav:muhurta",   path: "/muhurta",  icon: Timer,                   desc: "Auspicious timing windows" },
  { label: "Profile",  i18nKey: "nav:profile",   path: "/profile",  icon: User,                    desc: "Your account & charts" },
];

export default function PrimaryNav() {
  const location = useLocation();
  const { t } = useTranslation();
  const isActive = (path: string) => location.pathname === path;
  const isMoreActive = MORE_ITEMS.some((m) => isActive(m.path));

  return (
    <nav className="flex items-center gap-1">
      {PRIMARY_ITEMS.map((item) => {
        const active = isActive(item.path);
        return (
          <Link key={item.path} to={item.path} className="relative group">
            {active && (
              <motion.div
                layoutId="activeNavPill"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: "hsl(var(--gold) / 0.10)",
                  border: "0.5px solid hsl(var(--gold) / 0.18)",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <button
              className="px-3.5 py-2 transition-colors duration-300 relative rounded-lg"
              style={{
                color: active ? "hsl(var(--gold))" : "hsl(var(--text-secondary))",
                fontSize: "11px",
                fontFamily: "'Jost', sans-serif",
                fontWeight: 400,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--gold) / 0.04)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span className="relative z-10 transition-all duration-300 group-hover:text-[hsl(var(--gold-light))]">
                {t(item.i18nKey, item.label)}
              </span>
            </button>
          </Link>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="px-3.5 py-2 flex items-center gap-1 transition-colors duration-300 group"
            style={{
              color: isMoreActive ? "hsl(var(--gold))" : "hsl(var(--text-secondary))",
              fontSize: "11px",
              fontFamily: "'Jost', sans-serif",
              fontWeight: 400,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span className="group-hover:text-[hsl(var(--gold-light))] transition-colors duration-300">{t("common:more", "More")}</span>
            <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={12}
          className="w-72 glass-stone p-2"
          style={{ borderColor: "hsl(var(--gold) / 0.20)" }}
        >
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <DropdownMenuItem key={item.path} asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.10)] rounded-lg">
                <Link to={item.path} className="flex items-start gap-3 px-3 py-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: active ? "hsl(var(--gold) / 0.18)" : "hsl(var(--gold) / 0.06)",
                      border: `0.5px solid hsl(var(--gold) / ${active ? 0.35 : 0.15})`,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: active ? "hsl(var(--gold))" : "hsl(var(--gold-light))" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-tight"
                      style={{
                        color: active ? "hsl(var(--gold))" : "hsl(var(--text-primary))",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 500,
                      }}
                    >
                      {t(item.i18nKey, item.label)}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--text-muted))" }}>
                      {item.desc}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
