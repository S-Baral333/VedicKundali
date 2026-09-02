import { Button } from "@/components/ui/button";
import { Copy, Share2, BookmarkPlus, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  question: string;
  text: string;
}

export default function ResultActions({ question, text }: Props) {
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Q: ${question}\n\n${text}`);
      toast({ title: "Reading copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Vedic Reading", text: `${question}\n\n${text}` });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleSave = () => toast({ title: "Saved to Journal ✨", description: "View it later in your readings." });
  const handlePrint = () => window.print();

  const Action = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-1.5 h-8 text-xs">
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 px-2">
      <Action icon={Copy} label="Copy" onClick={handleCopy} />
      <Action icon={Share2} label="Share" onClick={handleShare} />
      <Action icon={BookmarkPlus} label="Save to Journal" onClick={handleSave} />
      <Action icon={Printer} label="Print" onClick={handlePrint} />
    </div>
  );
}
