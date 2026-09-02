import { Link } from "react-router-dom";
import { ChevronDown, User as UserIcon, CreditCard, LogOut, Smartphone } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useStandaloneMode } from "@/hooks/useStandaloneMode";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { tier, usage, config } = useSubscription();
  const { isStandalone } = useStandaloneMode();

  const email = user?.email ?? "";
  const firstName = (user?.user_metadata as any)?.full_name?.split(" ")[0]
    || email.split("@")[0]
    || "Seeker";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const tierLabel = tier === "jyotisha" ? "Jyotisha" : tier === "grihastha" ? "Grihastha" : tier === "sadhaka" ? "Sadhaka" : "Darshana";

  const oracleLimit = (config?.limits as any)?.ai_chat ?? 0;
  const oracleUsed = usage?.ai_chat ?? 0;
  const oracleRemaining = oracleLimit === -1 ? "∞" : Math.max(0, oracleLimit - oracleUsed);
  const oracleLine = oracleLimit === -1
    ? "Guru questions · unlimited"
    : `Guru questions · ${oracleRemaining} left this month`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-full border transition-all duration-300 hover:bg-[hsl(var(--gold)/0.12)] hover:border-[hsl(var(--gold)/0.30)] group"
          style={{ borderColor: "hsl(var(--glass-border-soft))" }}
          aria-label="Account menu"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
            style={{
              background: "linear-gradient(135deg, #7B4F1A, hsl(var(--gold)))",
              border: "1px solid hsl(var(--gold))",
              color: "hsl(var(--ink))",
              boxShadow: "0 0 12px hsl(var(--gold) / 0.30)",
            }}
          >
            ✦
          </div>
          <span
            className="hidden xl:inline truncate max-w-[100px]"
            style={{
              color: "hsl(var(--gold-light))",
              fontSize: "12px",
              letterSpacing: "0.04em",
              fontFamily: "'Jost', sans-serif",
            }}
          >
            {displayName}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--gold-light))" }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 glass-stone p-2"
        style={{ borderColor: "hsl(var(--gold) / 0.20)" }}
      >
        <div className="px-3 py-2.5">
          <p className="text-sm truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
            {displayName}
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: "hsl(var(--text-muted))" }}>{email}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: tier === "jyotisha" ? "hsl(var(--gold) / 0.12)" : "hsl(var(--gold) / 0.05)",
                border: `0.5px solid hsl(var(--gold) / ${tier === "jyotisha" ? 0.30 : 0.15})`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--gold))" }} />
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "hsl(var(--gold-light))", fontFamily: "'Jost', sans-serif" }}>
                {tierLabel}
              </span>
            </div>
            {isStandalone && (
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "hsl(var(--gold) / 0.05)",
                  border: "0.5px solid hsl(var(--gold) / 0.20)",
                }}
                title="Running as installed app"
              >
                <Smartphone className="w-2.5 h-2.5" style={{ color: "hsl(var(--gold-light))" }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "hsl(var(--gold-light))", fontFamily: "'Jost', sans-serif" }}>
                  Installed
                </span>
              </div>
            )}
          </div>
        </div>
        <DropdownMenuSeparator style={{ background: "hsl(var(--gold) / 0.10)" }} />
        <div className="px-3 py-2">
          <p className="text-[11px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'Jost', sans-serif" }}>
            {oracleLine}
          </p>
        </div>
        <DropdownMenuSeparator style={{ background: "hsl(var(--gold) / 0.10)" }} />
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.10)] rounded-lg">
          <Link to="/profile" className="flex items-center gap-2 py-2">
            <UserIcon className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold-light))" }} />
            <span className="text-sm" style={{ color: "hsl(var(--text-primary))" }}>View profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.10)] rounded-lg">
          <Link to="/billing" className="flex items-center gap-2 py-2">
            <CreditCard className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold-light))" }} />
            <span className="text-sm" style={{ color: "hsl(var(--text-primary))" }}>Billing & usage</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-[hsl(var(--gold)/0.10)] rounded-lg">
          <Link to="/pricing" className="flex items-center gap-2 py-2">
            <span className="text-sm pl-5" style={{ color: "hsl(var(--text-muted))" }}>View plans</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator style={{ background: "hsl(var(--gold) / 0.10)" }} />
        <DropdownMenuItem
          onClick={signOut}
          className="cursor-pointer focus:bg-[hsl(var(--destructive)/0.10)] rounded-lg flex items-center gap-2 py-2"
        >
          <LogOut className="h-3.5 w-3.5" style={{ color: "hsl(var(--destructive))" }} />
          <span className="text-sm" style={{ color: "hsl(var(--text-primary))" }}>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
