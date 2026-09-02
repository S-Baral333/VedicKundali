import { Link } from "react-router-dom";
import {
  Menu,
  Download,
  LogOut,
  Bell,
  User as UserIcon,
  CreditCard,
  ChevronRight,
  Crown,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import ChartSwitcher from "@/components/ChartSwitcher";
import KundaliMark from "@/components/KundaliMark";

interface MobileHeaderDrawerProps {
  isStandalone: boolean;
  unreadCount: number;
  onOpenNotifications: () => void;
}

type TierStyle = {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
  Icon: typeof Sparkles;
};

function getTierStyle(tier: "free" | "premium" | "elite"): TierStyle {
  if (tier === "elite") {
    return {
      badgeBg: "hsl(var(--gold) / 0.16)",
      badgeBorder: "hsl(var(--gold) / 0.45)",
      badgeText: "hsl(var(--gold))",
      label: "Elite",
      Icon: Crown,
    };
  }
  if (tier === "premium") {
    return {
      badgeBg: "hsl(var(--gold) / 0.10)",
      badgeBorder: "hsl(var(--gold) / 0.32)",
      badgeText: "hsl(var(--gold-light))",
      label: "Premium",
      Icon: Sparkles,
    };
  }
  return {
    badgeBg: "hsl(var(--gold) / 0.05)",
    badgeBorder: "hsl(var(--gold) / 0.18)",
    badgeText: "hsl(var(--text-secondary))",
    label: "Free",
    Icon: Sparkles,
  };
}

export default function MobileHeaderDrawer({
  isStandalone,
  unreadCount,
  onOpenNotifications,
}: MobileHeaderDrawerProps) {
  const { user, signOut } = useAuth();
  const { tier } = useSubscription();

  const email = user?.email ?? "";
  const firstName =
    (user?.user_metadata as any)?.full_name?.split(" ")[0] ||
    email.split("@")[0] ||
    "Seeker";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const initial = (displayName.charAt(0) || "✦").toUpperCase();

  const t = getTierStyle((tier as "free" | "premium" | "elite") || "free");
  const TierIcon = t.Icon;

  /** Reusable polished menu row with icon tile + chevron */
  const Row = ({
    icon: Icon,
    label,
    badge,
    danger,
    onClick,
    to,
  }: {
    icon: typeof Bell;
    label: string;
    badge?: number;
    danger?: boolean;
    onClick?: () => void;
    to?: string;
  }) => {
    const fg = danger ? "hsl(var(--destructive))" : "hsl(var(--text-primary))";
    const iconColor = danger
      ? "hsl(var(--destructive))"
      : "hsl(var(--gold-light))";
    const tileBg = danger
      ? "hsl(var(--destructive) / 0.10)"
      : "hsl(var(--gold) / 0.08)";
    const tileBorder = danger
      ? "hsl(var(--destructive) / 0.25)"
      : "hsl(var(--gold) / 0.18)";
    const hoverBg = danger
      ? "hsl(var(--destructive) / 0.08)"
      : "hsl(var(--gold) / 0.06)";

    const inner = (
      <div
        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors"
        style={{ background: "transparent" }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLDivElement).style.background = hoverBg)
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLDivElement).style.background = "transparent")
        }
      >
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: tileBg,
            border: `0.5px solid ${tileBorder}`,
          }}
        >
          <Icon className="h-[15px] w-[15px]" style={{ color: iconColor }} />
        </span>
        <span
          className="flex-1 text-left text-[14px]"
          style={{
            color: fg,
            fontFamily: "'Jost', sans-serif",
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </span>
        {typeof badge === "number" && badge > 0 && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              background: "hsl(var(--destructive))",
              color: "white",
              minWidth: "18px",
              textAlign: "center",
            }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        {!danger && (
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: "hsl(var(--text-muted) / 0.6)" }}
          />
        )}
      </div>
    );

    if (to) {
      return (
        <SheetClose asChild>
          <Link to={to} className="block">
            {inner}
          </Link>
        </SheetClose>
      );
    }
    return (
      <button type="button" onClick={onClick} className="w-full block">
        {inner}
      </button>
    );
  };

  /** Section heading with hairline divider */
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2.5 mb-2 px-1">
      <span
        className="text-[10px] uppercase shrink-0"
        style={{
          color: "hsl(var(--gold) / 0.65)",
          fontFamily: "'Jost', sans-serif",
          letterSpacing: "0.22em",
          fontWeight: 500,
        }}
      >
        {children}
      </span>
      <span
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--gold) / 0.20) 0%, transparent 100%)",
        }}
      />
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 hover:bg-[hsl(var(--gold)/0.12)] hover:border-[hsl(var(--gold)/0.30)]"
          style={{
            borderColor: "hsl(var(--glass-border-soft))",
            color: "hsl(var(--gold-light))",
          }}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[88vw] max-w-[360px] glass-stone p-0 border-l overflow-hidden"
        style={{ borderColor: "hsl(var(--gold) / 0.22)" }}
      >
        {/* Decorative gold flourish at the very top */}
        <span
          aria-hidden
          className="absolute left-0 right-0 top-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--gold) / 0.55) 50%, transparent 100%)",
          }}
        />
        {/* Subtle ambient glow behind avatar */}
        <span
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "-40px",
            left: "-30px",
            width: "220px",
            height: "220px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, hsl(var(--gold) / 0.12) 0%, transparent 65%)",
            filter: "blur(8px)",
          }}
        />

        <SheetHeader className="relative p-5 pb-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>

          {/* Brand wordmark */}
          <div className="flex items-center gap-2.5 mb-5">
            <KundaliMark size={26} />
            <span
              className="brand-wordmark"
              style={{ fontSize: "13px", letterSpacing: "0.32em" }}
            >
              KUNDALI
            </span>
          </div>

          {/* Profile card */}
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {/* halo */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, hsl(var(--gold) / 0.45) 0%, transparent 70%)",
                  filter: "blur(8px)",
                  transform: "scale(1.25)",
                }}
              />
              <div
                className="relative w-14 h-14 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--crimson)) 0%, hsl(var(--gold)) 100%)",
                  border: "1.5px solid hsl(var(--gold))",
                  color: "hsl(var(--ink))",
                  boxShadow:
                    "0 0 18px hsl(var(--gold) / 0.35), inset 0 0 12px hsl(var(--ink) / 0.25)",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {initial}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="truncate"
                style={{
                  color: "hsl(var(--gold-light))",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 500,
                  fontSize: "18px",
                  letterSpacing: "0.005em",
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </p>
              <p
                className="text-[11px] truncate mt-0.5"
                style={{
                  color: "hsl(var(--text-muted))",
                  fontFamily: "'Jost', sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                {email}
              </p>
            </div>
          </div>

          {/* Tier badge */}
          <div className="flex items-center mt-4">
            <div
              className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full"
              style={{
                background: t.badgeBg,
                border: `0.5px solid ${t.badgeBorder}`,
              }}
            >
              <TierIcon
                className="h-3 w-3"
                style={{ color: t.badgeText }}
                strokeWidth={2.25}
              />
              <span
                className="text-[10px] uppercase"
                style={{
                  color: t.badgeText,
                  fontFamily: "'Jost', sans-serif",
                  letterSpacing: "0.22em",
                  fontWeight: 500,
                }}
              >
                {t.label} Tier
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Hairline separator below header */}
        <div
          aria-hidden
          className="h-px mx-5"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, hsl(var(--gold) / 0.18) 50%, transparent 100%)",
          }}
        />

        <ScrollArea className="h-[calc(100vh-260px)] px-4 pt-4">
          <div className="space-y-5 pb-8">
            {/* Reading As */}
            <section>
              <SectionLabel>Reading As</SectionLabel>
              <div className="px-1">
                <ChartSwitcher />
              </div>
            </section>

            {/* Quick actions */}
            <section>
              <SectionLabel>Quick Actions</SectionLabel>
              <div className="space-y-0.5">
                <Row
                  icon={Bell}
                  label="Notifications"
                  badge={unreadCount}
                  onClick={onOpenNotifications}
                />
                <Row icon={UserIcon} label="Profile & settings" to="/profile" />
                <Row icon={CreditCard} label="Subscription" to="/pricing" />
                {!isStandalone && (
                  <Row icon={Download} label="Install app" to="/install" />
                )}
              </div>
            </section>

            {/* Sign out */}
            <section
              className="pt-3"
              style={{
                borderTop: "0.5px solid hsl(var(--gold) / 0.10)",
              }}
            >
              <Row icon={LogOut} label="Sign out" danger onClick={signOut} />
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
