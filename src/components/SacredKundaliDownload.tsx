import { useState } from "react";
import { Download, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PaywallModal from "@/components/PaywallModal";

interface SacredKundaliDownloadProps {
  chartId: string;
  chartName?: string;
}

/**
 * Elite-only download for the 10-page Sacred Kundali PDF.
 *  • Free / Premium → button is locked + opens the Elite paywall.
 *  • Elite          → POSTs to the `generate-kundali-pdf` edge function
 *                     and downloads the returned PDF stream.
 */
export default function SacredKundaliDownload({ chartId, chartName }: SacredKundaliDownloadProps) {
  const { isElite, isLoading: subLoading } = useSubscription();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const handleClick = async () => {
    if (!isElite) {
      setPaywallOpen(true);
      return;
    }
    setBusy(true);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again to download.");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
      const url = `https://${projectId}.supabase.co/functions/v1/generate-kundali-pdf`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chart_id: chartId }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Generation failed (${res.status})`);
      }
      const blob = await res.blob();
      // Pull filename from Content-Disposition if present
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(cd);
      const fname = match?.[1] || `Kundali-${chartName || "chart"}.pdf`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Sacred Kundali ready", description: "Your scripture has been downloaded." });
    } catch (err: any) {
      toast({
        title: "Could not generate PDF",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (isElite) {
    return (
      <>
        <Button
          onClick={handleClick}
          disabled={busy || subLoading}
          variant="outline"
          className="gap-2 border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-foreground"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Inscribing scripture…
            </>
          ) : (
            <>
              <Download className="h-4 w-4 text-primary" /> Download Sacred Kundali (PDF)
            </>
          )}
        </Button>
      </>
    );
  }

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleClick}
              disabled={subLoading}
              variant="outline"
              className="gap-2 border-primary/30 text-muted-foreground hover:text-foreground"
            >
              <Lock className="h-3.5 w-3.5" />
              Sacred Kundali (PDF)
              <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> Elite
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            A 10-page parchment scripture — mantras, dasha, yogas & remedies. Elite ritual.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} feature="sacred_pdf" />
    </>
  );
}
