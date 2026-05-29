import { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { patientsApi } from '@/lib/api/patients';
import { useToast } from '@/hooks/use-toast';
import type { ApiError, ClientDocument } from '@/lib/api/types';
import { formatClientDocumentUploadError } from '@/lib/api/config';
import { PatientDocumentEditDialog } from '@/components/patient-document-edit-dialog';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  Loader2,
  X,
  Plus,
  Search,
  ExternalLink,
  AlertCircle,
  Trash2,
  Pencil,
} from 'lucide-react';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const DOCUMENTS_QUERY_KEY = 'patient-documents';

const ACCEPTED_FILE_TYPES =
  'image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type PendingFile = {
  id: string;
  file: File;
  previewUrl?: string;
  title: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function fileTitleFromName(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  return nameWithoutExt || fileName;
}

function createPendingFile(file: File): PendingFile {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    title: fileTitleFromName(file.name),
    previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
  };
}

function getDocumentTitle(doc: ClientDocument): string {
  return doc.title?.trim() || doc.file?.fileName || 'Без названия';
}

function getDocumentFileUrl(doc: ClientDocument): string | null {
  const url = doc.file?.url?.trim();
  return url || null;
}

function isDocumentImage(doc: ClientDocument): boolean {
  const type = doc.file?.contentType || '';
  if (type.startsWith('image/')) return true;
  const ext = (doc.file?.extension || doc.file?.fileName || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(ext) || ext.endsWith('jpg');
}

function formatDocumentDate(createdAt?: string): string | null {
  if (!createdAt) return null;
  try {
    return format(new Date(createdAt), 'd MMMM yyyy, HH:mm', { locale: ru });
  } catch {
    return null;
  }
}

interface PatientDocumentsTabProps {
  patientId: string;
  disabled?: boolean;
}

function DocumentListItem({
  doc,
  disabled,
  isDeleting,
  isDeleteDialogOpen,
  onDeleteDialogOpenChange,
  onConfirmDelete,
  onEdit,
}: {
  doc: ClientDocument;
  disabled?: boolean;
  isDeleting: boolean;
  isDeleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onConfirmDelete: (doc: ClientDocument) => void;
  onEdit: (doc: ClientDocument) => void;
}) {
  const url = getDocumentFileUrl(doc);
  const title = getDocumentTitle(doc);
  const dateLabel = formatDocumentDate(doc.createdAt);
  const sizeLabel =
    doc.file?.sizeBytes != null ? formatFileSize(Number(doc.file.sizeBytes)) : null;
  const showImage = isDocumentImage(doc) && url;

  return (
    <Card className="border-border/50 rounded-2xl overflow-hidden shadow-none hover:border-primary/20 transition-colors">
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4">
          <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-border/50 bg-secondary/40 overflow-hidden flex items-center justify-center">
            {showImage ? (
              <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
              <FileText className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-medium text-sm sm:text-base truncate">{title}</p>
            <p className="text-xs text-muted-foreground">
              {[dateLabel, sizeLabel, doc.file?.extension?.replace(/^\./, '')]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {doc.description?.trim() && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {doc.description}
              </p>
            )}
            {doc.comment?.trim() && (
              <p className="text-xs text-muted-foreground/80 line-clamp-1 italic">
                {doc.comment}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0 self-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg h-9 gap-1.5"
              disabled={disabled || isDeleting}
              onClick={() => onEdit(doc)}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Изменить</span>
            </Button>
            {url && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg h-9 gap-1.5"
                asChild
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Открыть</span>
                </a>
              </Button>
            )}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  disabled={disabled || isDeleting}
                  aria-label="Удалить документ"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Удалить</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    «{title}» будет удалён безвозвратно вместе с файлом на сервере.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                    onClick={(e) => {
                      e.preventDefault();
                      onConfirmDelete(doc);
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Удаление…
                      </>
                    ) : (
                      'Удалить'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PatientDocumentsTab({ patientId, disabled }: PatientDocumentsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    data: documentsResult,
    isLoading: isLoadingDocuments,
    isError: isDocumentsError,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, patientId, searchQuery],
    queryFn: () =>
      patientsApi.getDocuments({
        clientId: patientId,
        search: searchQuery || undefined,
      }),
    enabled: Boolean(patientId) && !disabled,
    staleTime: 15000,
  });

  const documents = documentsResult?.data ?? [];
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<ClientDocument | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => patientsApi.deleteDocument(documentId),
    onSuccess: async () => {
      toast({
        title: 'Документ удалён',
        description: 'Файл удалён с сервера',
      });
      setDeleteDialogId(null);
      setDeletingDocumentId(null);
      await queryClient.invalidateQueries({
        queryKey: [DOCUMENTS_QUERY_KEY, patientId],
      });
    },
    onError: (error: unknown) => {
      setDeletingDocumentId(null);
      const apiError = error as ApiError;
      toast({
        title: 'Не удалось удалить',
        description: apiError.message || 'Попробуйте ещё раз',
        variant: 'destructive',
      });
    },
  });

  const handleConfirmDelete = (doc: ClientDocument) => {
    setDeletingDocumentId(doc.id);
    deleteMutation.mutate(doc.id);
  };

  const revokePendingPreviews = (items: PendingFile[]) => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  };

  const resetForm = () => {
    revokePendingPreviews(pendingFiles);
    setPendingFiles([]);
    setTitle('');
    setDescription('');
    setComment('');
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const tooLarge = incoming.filter((f) => f.size > MAX_FILE_BYTES);
    const valid = incoming.filter((f) => f.size <= MAX_FILE_BYTES);

    if (tooLarge.length > 0) {
      toast({
        title: 'Файл слишком большой',
        description:
          tooLarge.length === 1
            ? `«${tooLarge[0].name}» — ${formatFileSize(tooLarge[0].size)}. Максимум 50 МБ.`
            : `${tooLarge.length} файл(ов) превышают лимит 50 МБ и не добавлены.`,
        variant: 'destructive',
      });
    }

    if (valid.length === 0) return;

    setPendingFiles((prev) => {
      const existingKeys = new Set(
        prev.map((p) => `${p.file.name}-${p.file.size}-${p.file.lastModified}`)
      );
      const next = [...prev];
      for (const file of valid) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        next.push(createPendingFile(file));
      }
      return next;
    });

    if (valid.length === 1 && pendingFiles.length === 0) {
      setTitle(fileTitleFromName(valid[0].name));
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 1) {
        setTitle(next[0].title);
      } else if (next.length === 0) {
        setTitle('');
      }
      return next;
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (pendingFiles.length === 0) {
        throw new Error('Выберите файлы');
      }

      const sharedDescription = description.trim() || undefined;
      const sharedComment = comment.trim() || undefined;
      const results: Awaited<ReturnType<typeof patientsApi.createDocument>>[] = [];
      const errors: string[] = [];

      for (let i = 0; i < pendingFiles.length; i++) {
        const item = pendingFiles[i];
        setUploadProgress({ current: i + 1, total: pendingFiles.length });

        const docTitle =
          pendingFiles.length === 1 ? title.trim() || item.title : item.title;

        try {
          const doc = await patientsApi.createDocument({
            clientId: patientId,
            file: item.file,
            title: docTitle,
            description: sharedDescription,
            comment: sharedComment,
          });
          results.push(doc);
        } catch (error) {
          const apiError = error as ApiError;
          errors.push(`${item.file.name}: ${apiError.message || 'ошибка загрузки'}`);
        }
      }

      setUploadProgress(null);

      if (errors.length > 0 && results.length === 0) {
        throw new Error(errors.join('\n'));
      }

      return { results, errors };
    },
    onSuccess: async ({ results, errors }) => {
      if (results.length > 0) {
        toast({
          title: results.length === 1 ? 'Документ загружен' : `Загружено: ${results.length}`,
          description:
            errors.length > 0
              ? `Не удалось: ${errors.length}. Список обновлён.`
              : results.length === 1
                ? 'Документ добавлен в список'
                : 'Все успешные файлы добавлены в список',
        });
        await queryClient.invalidateQueries({
          queryKey: [DOCUMENTS_QUERY_KEY, patientId],
        });
      }

      if (errors.length > 0 && results.length > 0) {
        toast({
          title: 'Часть файлов не загружена',
          description: errors.slice(0, 2).join('; ') + (errors.length > 2 ? '…' : ''),
          variant: 'destructive',
        });
      }

      resetForm();
    },
    onError: (error: unknown) => {
      setUploadProgress(null);
      const apiError = error as ApiError;
      const raw =
        apiError.message ||
        (error instanceof Error ? error.message : 'Попробуйте ещё раз');
      toast({
        title: 'Не удалось загрузить',
        description: formatClientDocumentUploadError(raw),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingFiles.length === 0) {
      toast({
        title: 'Выберите файлы',
        description: 'Прикрепите один или несколько документов',
        variant: 'destructive',
      });
      return;
    }
    uploadMutation.mutate();
  };

  const isUploading = uploadMutation.isPending;
  const fileCount = pendingFiles.length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="-mx-4 sm:-mx-6 sm:mx-0 px-4 sm:px-0">
        <h2 className="text-base sm:text-lg md:text-xl font-display font-bold">Документы</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Файлы и снимки пациента — до 50 МБ на файл
        </p>
      </div>

      {/* Добавление документа */}
      <section>
        <h3 className="text-sm font-semibold mb-4">Добавить документ</h3>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <Card className="border-dashed border-2 border-border/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-none">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="sr-only"
                disabled={disabled || isUploading}
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                }}
              />

              {fileCount === 0 ? (
                <div className="flex flex-col items-center text-center py-4 sm:py-6 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                    <Upload className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <p className="font-medium text-sm sm:text-base">Выберите файлы</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      PDF, Word, Excel, изображения
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full h-10 gap-2 w-full max-w-xs px-6"
                    disabled={disabled || isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="w-4 h-4" />
                    Выбрать файлы
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {pendingFiles.map((item) => (
                      <li
                        key={item.id}
                        className="flex gap-3 items-center rounded-xl border border-border/50 bg-secondary/30 p-2.5"
                      >
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(item.file.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8"
                          disabled={isUploading}
                          onClick={() => removePendingFile(item.id)}
                          aria-label="Убрать"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg gap-1.5"
                      disabled={disabled || isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Добавить ещё
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                      disabled={isUploading}
                      onClick={resetForm}
                    >
                      Очистить
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {fileCount > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {fileCount === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="doc-title">Название</Label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: ОПТГ, снимок"
                    className="rounded-xl"
                    disabled={disabled || isUploading}
                  />
                </div>
              )}
              {fileCount > 1 && (
                <p className="text-xs text-muted-foreground">
                  Название — из имени файла. Описание и комментарий общие.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="doc-description">Описание</Label>
                <Textarea
                  id="doc-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Необязательно"
                  className="rounded-xl min-h-[72px] resize-y"
                  disabled={disabled || isUploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-comment">Комментарий</Label>
                <Textarea
                  id="doc-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Необязательно"
                  className="rounded-xl min-h-[72px] resize-y"
                  disabled={disabled || isUploading}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className={cn(
              'w-full sm:w-auto rounded-xl h-11 px-8 gap-2 shadow-lg shadow-primary/20',
              fileCount === 0 && 'opacity-60'
            )}
            disabled={disabled || isUploading || fileCount === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress
                  ? `Загрузка ${uploadProgress.current} из ${uploadProgress.total}…`
                  : 'Загрузка…'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {fileCount <= 1 ? 'Загрузить документ' : `Загрузить ${fileCount} документов`}
              </>
            )}
          </Button>
        </form>
      </section>

      {/* Список документов */}
      <section className="space-y-3 sm:space-y-4 border-t border-border/50 pt-6 sm:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <h3 className="text-sm font-semibold shrink-0">
            Загруженные документы
            {!isLoadingDocuments && documents.length > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                ({documentsResult?.totalCount ?? documents.length})
              </span>
            )}
          </h3>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по названию, описанию…"
              className="pl-9 rounded-xl h-9"
              disabled={disabled}
            />
          </div>
        </div>

        {isLoadingDocuments ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary" />
            <p className="text-sm">Загрузка документов…</p>
          </div>
        ) : isDocumentsError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-sm font-medium">Не удалось загрузить список</p>
              <p className="text-xs text-muted-foreground">
                {(documentsError as Error)?.message || 'Попробуйте позже'}
              </p>
              <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => refetchDocuments()}>
                Повторить
              </Button>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-dashed border-border/60 bg-secondary/20">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Ничего не найдено' : 'Документов пока нет'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id}>
                <DocumentListItem
                  doc={doc}
                  disabled={disabled}
                  isDeleting={deletingDocumentId === doc.id && deleteMutation.isPending}
                  isDeleteDialogOpen={deleteDialogId === doc.id}
                  onDeleteDialogOpenChange={(open) => {
                    setDeleteDialogId(open ? doc.id : null);
                  }}
                  onConfirmDelete={handleConfirmDelete}
                  onEdit={setEditingDocument}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <PatientDocumentEditDialog
        open={editingDocument != null}
        onOpenChange={(open) => {
          if (!open) setEditingDocument(null);
        }}
        document={editingDocument}
        patientId={patientId}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY, patientId] });
        }}
      />
    </div>
  );
}
