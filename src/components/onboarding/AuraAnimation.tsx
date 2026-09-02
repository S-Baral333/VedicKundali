import { cn } from "@/lib/utils";

interface AuraAnimationProps {
  className?: string;
}

export default function AuraAnimation({ className }: AuraAnimationProps) {
  return (
    <div className={cn("relative w-32 h-32", className)}>
      {/* Outer pulsing rings */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-primary/30"
          style={{
            animation: `aura-ring ${2 + i * 0.5}s ease-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      {/* Rotating gradient ring */}
      <div 
        className="absolute inset-4 rounded-full animate-[rotate-slow_8s_linear_infinite]"
        style={{
          background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.3), transparent, hsl(var(--accent) / 0.2), transparent)",
        }}
      />

      {/* Inner glowing orb */}
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 animate-pulse">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-md" />
      </div>

      {/* Center bright core */}
      <div className="absolute inset-10 rounded-full bg-primary/60 flex items-center justify-center">
        <div 
          className="w-4 h-4 rounded-full bg-primary-foreground"
          style={{
            boxShadow: "0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary) / 0.5)",
          }}
        />
      </div>

      {/* Floating particles around the orb */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45) * (Math.PI / 180);
        const radius = 56;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        return (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary"
            style={{
              left: `calc(50% + ${x}px - 3px)`,
              top: `calc(50% + ${y}px - 3px)`,
              animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
              opacity: 0.6,
            }}
          />
        );
      })}
    </div>
  );
}
