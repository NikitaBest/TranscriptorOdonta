import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { ClientDocument } from '@/lib/api/types';
import {
  canFetchDocumentBlob,
  downloadDocumentFile,
  fetchDocumentText,
  formatDocumentFileSize,
  getDocumentDownloadFileName,
  getDocumentFileUrl,
  getDocumentPreviewKind,
  getDocumentTitle,
  getEmbeddedViewerUrl,
  getFileExtension,
  isExternalStorageUrl,
  resolveDocumentContentType,
} from '@/lib/utils/document-preview';
import { cn } from '@/lib/utils';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

interface PatientDocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ClientDocument | null;
}

export function PatientDocumentViewerDialog({
  open,
  onOpenChange,
  document: doc,
}: PatientDocumentViewerDialogProps) {
  const { toast } = useToast();
  const remoteUrl = getDocumentFileUrl(doc);
  const title = doc ? getDocumentTitle(doc) : '';
  const kind = doc ? getDocumentPreviewKind(doc) : 'iframe';
  const ext = doc ? getFileExtension(doc) : '';
  const contentType = doc ? resolveDocumentContentType(doc) : '';
  const sizeLabel =
    doc?.file?.sizeBytes != null ? formatDocumentFileSize(Number(doc.file.sizeBytes)) : null;

  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!remoteUrl || !doc || isDownloading) return;

    const fileName = getDocumentDownloadFileName(doc);
    setIsDownloading(true);

    try {
      const result = await downloadDocumentFile(remoteUrl, fileName, contentType);
      if (result === 'blob') {
        toast({
          title: 'Скачивание начато',
          description: fileName,
        });
      } else {
        toast({
          title: 'Скачивание',
          description:
            'Если файл открылся в браузере — сохраните его через меню «Поделиться» или «Скачать».',
        });
      }
    } catch {
      toast({
        title: 'Не удалось скачать',
        description: 'Попробуйте «В новой вкладке»',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!open || !doc || !remoteUrl || kind !== 'text') {
      setTextContent(null);
      setTextLoading(false);
      return;
    }

    if (!canFetchDocumentBlob(remoteUrl)) {
      setTextContent(null);
      setTextLoading(false);
      return;
    }

    let cancelled = false;
    setTextLoading(true);
    setTextContent(null);

    fetchDocumentText(remoteUrl, contentType)
      .then((text) => {
        if (!cancelled) setTextContent(text);
      })
      .catch(() => {
        if (!cancelled) setTextContent(null);
      })
      .finally(() => {
        if (!cancelled) setTextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, doc?.id, remoteUrl, kind, contentType]);

  useEffect(() => {
    if (!open) {
      setMediaError(false);
    }
  }, [open]);

  const iframeSrc = remoteUrl ? getEmbeddedViewerUrl(remoteUrl, kind) : null;

  const renderPreview = () => {
    if (!remoteUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-muted-foreground p-6">
          <FileText className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">Ссылка на файл недоступна</p>
        </div>
      );
    }

    if (mediaError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center p-6 gap-3">
          <FileText className="w-12 h-12 text-muted-foreground/60" />
          <p className="text-sm font-medium">Предпросмотр недоступен</p>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
            Браузер не смог показать файл. Откройте его в новой вкладке или скачайте.
          </p>
        </div>
      );
    }

    if (kind === 'image') {
      return (
        <div className="flex items-center justify-center h-full min-h-[240px] max-h-[70vh] p-4 sm:p-6">
          <img
            src={remoteUrl}
            alt={title}
            className="max-w-full max-h-[68vh] object-contain rounded-lg shadow-sm"
            referrerPolicy="no-referrer"
            onError={() => setMediaError(true)}
          />
        </div>
      );
    }

    if (kind === 'video') {
      return (
        <div className="flex items-center justify-center h-full min-h-[240px] p-4 sm:p-6">
          <video
            src={remoteUrl}
            controls
            className="max-w-full max-h-[68vh] rounded-lg bg-black"
            playsInline
            onError={() => setMediaError(true)}
          >
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        </div>
      );
    }

    if (kind === 'audio') {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 p-6">
          <FileText className="w-12 h-12 text-muted-foreground/60" />
          <audio src={remoteUrl} controls className="w-full max-w-md" onError={() => setMediaError(true)}>
            Ваш браузер не поддерживает воспроизведение аудио.
          </audio>
        </div>
      );
    }

    if (kind === 'text') {
      if (textLoading) {
        return (
          <div className="flex items-center justify-center h-full min-h-[240px] text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Загрузка…
          </div>
        );
      }
      if (textContent != null) {
        return (
          <ScrollArea className="h-[min(70vh,720px)] min-h-[240px]">
            <pre className="p-4 sm:p-6 text-xs sm:text-sm whitespace-pre-wrap break-words font-mono leading-relaxed">
              {textContent}
            </pre>
          </ScrollArea>
        );
      }
      if (remoteUrl && isExternalStorageUrl(remoteUrl)) {
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center p-6 gap-3">
            <FileText className="w-12 h-12 text-muted-foreground/60" />
            <p className="text-sm font-medium">Текстовый файл</p>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              Предпросмотр текста с хранилища недоступен из‑за ограничений CORS. Откройте файл в новой
              вкладке или скачайте.
            </p>
          </div>
        );
      }
      if (iframeSrc) {
        return (
          <iframe
            src={iframeSrc}
            title={title}
            className="w-full h-[min(70vh,720px)] min-h-[320px] border-0 bg-white"
            referrerPolicy="no-referrer"
          />
        );
      }
    }

    if ((kind === 'office' || kind === 'pdf' || kind === 'iframe') && iframeSrc) {
      return (
        <iframe
          src={iframeSrc}
          title={title}
          className="w-full h-[min(70vh,720px)] min-h-[320px] border-0 bg-white"
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center p-6 gap-3">
        <FileText className="w-12 h-12 text-muted-foreground/60" />
        <p className="text-sm font-medium">Предпросмотр недоступен</p>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
          Формат {ext ? `.${ext}` : 'файла'} нельзя показать в браузере.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-5xl w-[95vw] max-h-[92vh] flex flex-col gap-0 p-0 rounded-2xl overflow-hidden',
          'translate-y-[-50%] top-[50%]'
        )}
      >
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b border-border/50 shrink-0 text-left">
          <DialogTitle className="font-display pr-8 truncate">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Просмотр документа {title}
          </DialogDescription>
          {(sizeLabel || ext) && (
            <p className="text-xs text-muted-foreground">
              {[sizeLabel, ext && `.${ext}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-[320px] max-h-[72vh] overflow-hidden bg-secondary/20">
          {renderPreview()}
        </div>

        {remoteUrl && (
          <DialogFooter className="px-4 sm:px-6 py-3 border-t border-border/50 shrink-0 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2 flex-1 sm:flex-none"
              disabled={isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Скачать
            </Button>
            <Button type="button" variant="outline" className="rounded-xl gap-2 flex-1 sm:flex-none" asChild>
              <a href={remoteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                В новой вкладке
              </a>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
