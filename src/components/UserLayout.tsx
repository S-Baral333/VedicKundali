import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import InstallPromptBanner from "@/components/InstallPromptBanner";
import CosmicRibbon from "@/components/header/CosmicRibbon";
import PrimaryNav, { PRIMARY_ITEMS, MORE_ITEMS } from "@/components/header/PrimaryNav";
import UserMenu from "@/components/header/UserMenu";
import SettingsMenu from "@/components/header/SettingsMenu";
import MobileHeaderDrawer from "@/components/header/MobileHeaderDrawer";
import KundaliMark from "@/components/KundaliMark";
import TwinkleText from "@/components/TwinkleText";

interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  created_at: string;
}

// Combined keyboard shortcut order: 5 primary + 5 more = 10 items
const SHORTCUT_PATHS = [
  ...PRIMARY_ITEMS.map((i) => i.path),
  ...MORE_ITEMS.map((i) => i.path),
];

export default function UserLayout() {
  const { isLoading } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isStandalone, setIsStandalone] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  // Scroll-condense behavior: collapse ribbon and firm up header past 40px
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("user_notifications")
      .select("*")
      .lte("scheduled_for", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as unknown as Notification[]);
      setUnreadCount((data as any[]).filter((n: any) => !n.is_read).length);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from("user_notifications").update({ is_read: true } as any).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("user_notifications").update({ is_read: true } as any).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Alt+1..9 keyboard shortcuts (covers 5 primary + first 4 More items)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        const index = parseInt(e.key) - 1;
        if (index >= 0 && index < SHORTCUT_PATHS.length) {
          e.preventDefault();
          navigate(SHORTCUT_PATHS[index]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "hsl(var(--ink))" }}>
        <header className="sticky top-0 z-50 safe-top h-16 flex items-center px-6 glass-veil">
          <Skeleton className="h-7 w-28" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20" />
          </div>
        </header>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  /** Notification bell button + sheet — shared between desktop & mobile drawer trigger */
  const renderNotificationSheet = () => (
    <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
      <SheetTrigger asChild>
        <button
          className="relative w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 hover:bg-[hsl(var(--gold)/0.12)] hover:border-[hsl(var(--gold)/0.30)]"
          style={{
            borderColor: "hsl(var(--glass-border-soft))",
            color: "hsl(var(--text-secondary))",
          }}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-[15px] w-[15px]" />
          {unreadCount > 0 && <span className="notif-dot" />}
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-80 glass-stone"
        style={{ borderColor: "hsl(var(--gold) / 0.22)", color: "hsl(var(--text-primary))" }}
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base" style={{ fontFamily: "'Cormorant Garamond', serif", color: "hsl(var(--gold))" }}>
              Cosmic Alerts
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-primary">
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {notifications.length === 0 ? (
            <p className="text-sm text-center py-8 text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className="w-full text-left p-3 rounded-lg border transition-colors"
                  style={{
                    background: n.is_read ? "hsl(var(--ink-2) / 0.5)" : "hsl(var(--gold) / 0.05)",
                    borderColor: n.is_read ? "hsl(var(--glass-border-soft))" : "hsl(var(--glass-border))",
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: n.is_read ? "hsl(var(--text-muted))" : "hsl(var(--text-primary))" }}>
                    {n.title}
                  </p>
                  <p className="text-xs mt-1 line-clamp-2 text-muted-foreground">{n.message}</p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  /** Reusable brand wordmark — KundaliMark + Cinzel KUNDALI + flourish underline */
  const Wordmark = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const dims = size === "sm" ? { mark: 24, font: "text-[13px]" } : { mark: 30, font: "text-base" };
    return (
      <Link
        to="/dashboard"
        className="wordmark-flourish shrink-0 group"
        aria-label="Kundali home"
      >
        <KundaliMark size={dims.mark} glow={false} className="transition-transform duration-500 group-hover:rotate-[8deg]" />
        <span className={`brand-wordmark ${dims.font}`} aria-label="KUNDALI">
          {"KUNDALI".split("").map((ch, i) => (
            <TwinkleText key={i} intensity="aura" className="brand-letter">
              {ch}
            </TwinkleText>
          ))}
        </span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Universe background is mounted globally in App.tsx */}

      {/* ═══ Desktop header — two-tier ═══ */}
      {!isMobile && (
        <header className="sticky top-0 z-50 header-shadow safe-top">
          {/* Cosmic ribbon (collapses on scroll) */}
          <div
            className={`cosmic-ribbon glass-veil ${scrolled ? "collapsed" : ""}`}
            style={{ borderBottom: scrolled ? "none" : "0.5px solid hsl(var(--gold) / 0.08)" }}
          >
            <CosmicRibbon />
          </div>

          {/* Main row */}
          <div className={`header-main header-horizon glass-veil ${scrolled ? "condensed" : ""}`}>
            <div className="sacred-wide h-16 flex items-center justify-between">
              <Wordmark size="md" />

              <PrimaryNav />

              <div className="flex items-center gap-2">
                {renderNotificationSheet()}
                <SettingsMenu isStandalone={isStandalone} />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ═══ Mobile header — centered wordmark + drawer ═══ */}
      {isMobile && (
        <header className="sticky top-0 z-40 safe-top glass-veil header-horizon">
          <div className="h-14 flex items-center justify-between px-4 relative">
            {/* Left: notification bell */}
            {renderNotificationSheet()}

            {/* Centered wordmark */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <Wordmark size="sm" />
            </div>

            {/* Right: menu drawer */}
            <MobileHeaderDrawer
              isStandalone={isStandalone}
              unreadCount={unreadCount}
              onOpenNotifications={() => setNotifOpen(true)}
            />
          </div>
        </header>
      )}

      <main className={`relative z-10 ${isMobile ? "pb-24" : ""}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <InstallPromptBanner />

      {/* Mobile bottom dock — footer-styled, always-on-screen primary navigation */}
      {isMobile && (
        <nav
          className="mobile-dock fixed bottom-0 left-0 right-0 z-50"
          aria-label="Primary navigation"
        >
          {/* Hairline gold flourish (mirrors footer top accent) */}
          <span aria-hidden className="mobile-dock-flourish" />

          <div className="relative">
            {/* Edge fade hints for horizontal overflow */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10" style={{ background: "linear-gradient(to right, hsl(var(--ink) / 0.65), transparent)" }} />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10" style={{ background: "linear-gradient(to left, hsl(var(--ink) / 0.65), transparent)" }} />

            <div className="flex items-center overflow-x-auto scrollbar-hide h-[74px] px-4 gap-1 snap-x snap-mandatory">
              {[...PRIMARY_ITEMS, ...MORE_ITEMS].map((item) => {
                const active = location.pathname === item.path;
                const Icon = (item as any).icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? "page" : undefined}
                    className={`mobile-dock-tab snap-start ${active ? "is-active" : ""}`}
                  >
                    <span className="mobile-dock-icon">
                      {Icon ? (
                        <Icon className="h-[18px] w-[18px]" />
                      ) : (
                        <span className="text-[13px]">✦</span>
                      )}
                    </span>
                    <span className="mobile-dock-label">{t(item.i18nKey, item.label)}</span>
                    {active && <span aria-hidden className="mobile-dock-active-dot" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
