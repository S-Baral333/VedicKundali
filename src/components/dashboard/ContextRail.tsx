import { Link } from "react-router-dom";
import { Sparkles, Moon, Heart, Calendar, Compass, MessageCircleQuestion } from "lucide-react";

interface ContextRailProps {
  children?: React.ReactNode; // Plan card slot
}

const QUICK = [
  { to: "/oracle", icon: MessageCircleQuestion, label: "Ask the Oracle" },
  { to: "/dreams", icon: Moon, label: "Interpret a Dream" },
  { to: "/muhurta", icon: Calendar, label: "Find Auspicious Time" },
  { to: "/compatibility", icon: Heart, label: "Check Compatibility" },
  { to: "/chart", icon: Compass, label: "View Birth Chart" },
];

export default function ContextRail({ children }: ContextRailProps) {
  return (
    <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      {/* Plan slot (passed in by Dashboard) */}
      {children}

      {/* Quick actions */}
      <div className="rail-card">
        <div className="rail-card-title">Quick Actions</div>
        <div className="flex flex-col gap-1.5">
          {QUICK.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="rail-action">
              <span className="rail-action-icon">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Cosmic field decorative */}
      <div className="rail-card relative" style={{ minHeight: 110, overflow: "hidden" }}>
        <div className="rail-card-title">Cosmic Field</div>
        <div className="relative" style={{ height: 70 }}>
          <svg viewBox="0 0 200 70" className="w-full h-full" aria-hidden>
            <defs>
              <radialGradient id="cf-glow" cx="50%" cy="60%" r="60%">
                <stop offset="0%" stopColor="hsl(45 70% 60% / 0.35)" />
                <stop offset="100%" stopColor="hsl(240 30% 8% / 0)" />
              </radialGradient>
            </defs>
            <rect width="200" height="70" fill="url(#cf-glow)" />
            {Array.from({ length: 30 }).map((_, i) => (
              <circle
                key={i}
                cx={Math.random() * 200}
                cy={Math.random() * 70}
                r={Math.random() * 0.8 + 0.3}
                fill="white"
                opacity={Math.random() * 0.7 + 0.2}
              >
                <animate attributeName="opacity" values="0.2;1;0.2" dur={`${2 + Math.random() * 4}s`} repeatCount="indefinite" />
              </circle>
            ))}
            {/* Constellation hint */}
            <polyline
              points="30,40 60,25 95,38 130,20 165,32"
              fill="none"
              stroke="hsl(var(--gold) / 0.35)"
              strokeWidth="0.4"
            />
            {[[30,40],[60,25],[95,38],[130,20],[165,32]].map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r="1.4" fill="hsl(var(--gold))" />
            ))}
          </svg>
        </div>
        <p className="text-[11px] mt-2" style={{ color: "hsl(var(--text-muted))", letterSpacing: "0.04em" }}>
          The sky moves quietly above you.
        </p>
      </div>
    </div>
  );
}
