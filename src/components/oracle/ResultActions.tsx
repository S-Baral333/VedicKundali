import { Button } from "@/components/ui/button";
import { Copy, Share2, BookmarkPlus, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Props {
  question: string;
  text: string;
}

export default function ResultActions({ question, text }: Props) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Q: ${question}\n\n${text}`);
      toast({ title: t("pages:ui.resultActions.copied", "Reading copied") });
    } catch {
      toast({ title: t("pages:ui.resultActions.copyFailed", "Could not copy"), variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t("pages:ui.resultActions.shareTitle", "My Vedic Reading"), text: `${question}\n\n${text}` });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleSave = () => toast({ title: t("pages:ui.resultActions.saved", "Saved to Journal ✨"), description: t("pages:ui.resultActions.savedDesc", "View it later in your readings.") });
  const handlePrint = () => window.print();

  const Action = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-1.5 h-8 text-xs">
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 px-2">
      <Action icon={Copy} label={t("pages:ui.resultActions.copy", "Copy")} onClick={handleCopy} />
      <Action icon={Share2} label={t("pages:ui.resultActions.share", "Share")} onClick={handleShare} />
      <Action icon={BookmarkPlus} label={t("pages:ui.resultActions.saveToJournal", "Save to Journal")} onClick={handleSave} />
      <Action icon={Printer} label={t("pages:ui.resultActions.print", "Print")} onClick={handlePrint} />
    </div>
  );
}
