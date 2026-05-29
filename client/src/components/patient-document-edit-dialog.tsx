import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { patientsApi } from '@/lib/api/patients';
import { useToast } from '@/hooks/use-toast';
import type { ApiError, ClientDocument } from '@/lib/api/types';
import { formatClientDocumentUploadError } from '@/lib/api/config';
import { FileText, Loader2, X } from 'lucide-react';

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

interface PatientDocumentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ClientDocument | null;
  patientId: string;
  onSaved: () => void;
}

export function PatientDocumentEditDialog({
  open,
  onOpenChange,
  document,
  patientId,
  onSaved,
}: PatientDocumentEditDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open || !document) return;
    setTitle(document.title?.trim() || document.file?.fileName || '');
    setDescription(document.description?.trim() || '');
    setComment(document.comment?.trim() || '');
    setReplacementFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [open, document]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!document) throw new Error('Документ не выбран');
      return patientsApi.updateDocument(document.id, {
        clientId: patientId,
        title: title.trim(),
        description: description.trim(),
        comment: comment.trim(),
        ...(replacementFile ? { file: replacementFile } : {}),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Изменения сохранены',
        description: replacementFile
          ? 'Документ и файл обновлены'
          : 'Данные документа обновлены',
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      const raw =
        apiError.message ||
        (error instanceof Error ? error.message : 'Не удалось сохранить');
      toast({
        title: 'Ошибка сохранения',
        description: formatClientDocumentUploadError(raw),
        variant: 'destructive',
      });
    },
  });

  const handlePickFile = (file: File | null) => {
    if (!file) {
      setReplacementFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({
        title: 'Файл слишком большой',
        description: 'Максимум 50 МБ',
        variant: 'destructive',
      });
      return;
    }
    setReplacementFile(file);
  };

  const displayTitle =
    document?.title?.trim() || document?.file?.fileName || 'Документ';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display pr-8">Редактировать документ</DialogTitle>
          <p className="text-sm text-muted-foreground truncate">«{displayTitle}»</p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="edit-doc-title">Название</Label>
            <Input
              id="edit-doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
              disabled={saveMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-doc-description">Описание</Label>
            <Textarea
              id="edit-doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl min-h-[72px] resize-y"
              disabled={saveMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-doc-comment">Комментарий</Label>
            <Textarea
              id="edit-doc-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="rounded-xl min-h-[72px] resize-y"
              disabled={saveMutation.isPending}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-dashed border-border/60 p-3">
            <Label>Заменить файл (необязательно)</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              disabled={saveMutation.isPending}
              onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
            />
            {replacementFile ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{replacementFile.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(replacementFile.size)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setReplacementFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg w-full"
                disabled={saveMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                Выбрать новый файл
              </Button>
            )}
            {document?.file?.fileName && !replacementFile && (
              <p className="text-xs text-muted-foreground">
                Текущий файл: {document.file.fileName}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={saveMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={saveMutation.isPending || !title.trim()}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Сохранение…
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
