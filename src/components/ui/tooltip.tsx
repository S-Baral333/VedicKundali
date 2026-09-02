import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    variant?: "default" | "astro";
  }
>(({ className, sideOffset = 4, variant = "default", ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      variant === "astro"
        ? "rounded-xl px-4 py-3 text-sm max-w-[260px] backdrop-blur-[14px]"
        : "rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground",
      className,
    )}
    style={
      variant === "astro"
        ? {
            background: "rgba(16,14,10,0.95)",
            border: "0.5px solid rgba(201,168,76,0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 12px rgba(201,168,76,0.08)",
            fontFamily: "'Jost', sans-serif",
          }
        : undefined
    }
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
