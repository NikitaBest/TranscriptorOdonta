import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface LegalDocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  text: string;
}

export function LegalDocumentViewer({
  open,
  onOpenChange,
  title,
  subtitle,
  text,
}: LegalDocumentViewerProps) {
  const isMobile = useIsMobile();

  const body = (
    <div className="text-[11px] sm:text-xs md:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap pb-2">
      {text}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] max-h-[92dvh] rounded-t-2xl p-0 flex flex-col gap-0 overflow-hidden"
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/60 text-left shrink-0 space-y-1">
            {subtitle ? (
              <p className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
            <SheetTitle className="font-display font-bold text-base leading-snug pr-8">
              {title}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 touch-pan-y">
            {body}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100%-1.5rem)] h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0 space-y-1 text-left">
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
          <DialogTitle className="font-display font-bold text-lg md:text-xl leading-snug pr-8">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5">
          {body}
        </div>
      </DialogContent>
    </Dialog>
  );
}
