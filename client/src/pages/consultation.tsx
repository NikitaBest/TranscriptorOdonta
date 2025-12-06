import { useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { consultationsApi } from '@/lib/api/consultations';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import type { ConsultationResponse } from '@/lib/api/types';
import { ArrowLeft, Download, Share2, Copy, Play, Pause, RefreshCw, Check, GripVertical, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ConsultationPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Загрузка данных консультации с периодической проверкой статуса
  const { data: consultationData, isLoading, error } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => {
      if (!id) throw new Error('ID консультации не указан');
      return consultationsApi.getById(id);
    },
    enabled: !!id,
    // Если консультация еще обрабатывается (InProgress или None), проверяем статус каждые 5 секунд
    refetchInterval: (query) => {
      const data = query.state.data as ConsultationResponse | null;
      if (data) {
        // Получаем статус из ответа бэкенда (может быть в разных полях)
        const status = data.processingStatus ?? 
                      (data.status as ConsultationProcessingStatus) ?? 
                      (data as any).processingStatus ??
                      ConsultationProcessingStatus.None;
        // Если статус InProgress (1) или None (0), продолжаем проверять
        if (status === ConsultationProcessingStatus.InProgress || status === ConsultationProcessingStatus.None) {
          return 5000; // Проверяем каждые 5 секунд
        }
      }
      return false; // Если Completed или Failed, не проверяем
    },
    refetchOnWindowFocus: true, // Обновляем при возврате на вкладку
  });

  // Преобразуем данные для отображения
  const consultation: ConsultationResponse | null = consultationData || null;
  
  // Определяем статус обработки
  const processingStatus = consultation?.processingStatus ?? 
                           (consultation?.status as ConsultationProcessingStatus) ?? 
                           ConsultationProcessingStatus.None;
  
  // Определяем, обрабатывается ли консультация
  const isProcessing = processingStatus === ConsultationProcessingStatus.InProgress || 
                       processingStatus === ConsultationProcessingStatus.None;
  
  // Получаем текстовое описание статуса
  const getStatusText = (status: ConsultationProcessingStatus) => {
    switch (status) {
      case ConsultationProcessingStatus.None:
        return 'Ожидание обработки';
      case ConsultationProcessingStatus.InProgress:
        return 'Обработка...';
      case ConsultationProcessingStatus.Failed:
        return 'Ошибка обработки';
      case ConsultationProcessingStatus.Completed:
        return 'Готово';
      default:
        return 'Неизвестный статус';
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Загрузка консультации...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !consultation) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <div className="text-center py-20">
            <h2 className="text-xl font-bold mb-2">Консультация не найдена</h2>
            <p className="text-muted-foreground">Консультация с ID {id} не найдена</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">Вернуться к списку</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const handleCopy = () => {
    toast({ title: "Скопировано в буфер обмена" });
  };

  const handleShare = () => {
    toast({ 
      title: "Публичная ссылка создана", 
      description: "Ссылка скопирована. Эта ссылка доступна только для чтения пациентам." 
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await consultationsApi.delete(id);
      
      // Инвалидируем кэш консультаций и пациента
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      if (consultation?.patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-consultations', consultation.patientId] });
      }
      
      toast({
        title: "Консультация удалена",
        description: "Консультация успешно удалена.",
      });
      
      // Перенаправляем на страницу пациента или дашборд
      if (consultation?.patientId) {
        setLocation(`/patient/${consultation.patientId}`);
      } else {
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error('Delete consultation error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить консультацию. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <Link href={consultation.patientId ? `/patient/${consultation.patientId}` : '/dashboard'}>
              <Button variant="ghost" className="pl-0 mb-2 hover:bg-transparent hover:text-primary gap-2 text-muted-foreground text-sm md:text-base">
                <ArrowLeft className="w-4 h-4" />
                Назад
              </Button>
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
                  Отчет о консультации
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  {consultation.date ? format(new Date(consultation.date), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана'} • {consultation.duration || '0:00'} • {consultation.patientName || "Пациент не назначен"}
                </p>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">{getStatusText(processingStatus)}</span>
                </div>
              )}
              {processingStatus === ConsultationProcessingStatus.Failed && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{getStatusText(processingStatus)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base" onClick={handleShare}>
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Поделиться</span>
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Удалить</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить консультацию?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы уверены, что хотите удалить эту консультацию? 
                    Это действие нельзя отменить. Все данные консультации будут безвозвратно удалены.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Удаление...
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

        {/* Audio Player Card */}
        <Card className="rounded-3xl border-border/50 bg-secondary/30 overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <Button 
              size="icon" 
              className="h-12 w-12 rounded-full shrink-0" 
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current ml-1" />}
            </Button>
            <div className="flex-1">
              <div className="h-12 flex items-center gap-1 opacity-50">
                 {/* Fake Waveform */}
                 {Array.from({ length: 60 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-foreground rounded-full" 
                      style={{ height: `${20 + Math.random() * 60}%` }}
                    />
                 ))}
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{consultation.duration || '0:00'}</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Report */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <Tabs defaultValue="report" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 h-10 md:h-12 p-1 bg-secondary/50 rounded-2xl">
                <TabsTrigger value="report" className="rounded-xl">Медицинский отчет</TabsTrigger>
                <TabsTrigger value="transcript" className="rounded-xl">Транскрипция</TabsTrigger>
              </TabsList>

              <TabsContent value="report" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {isProcessing ? (
                  <Card className="rounded-3xl border-border/50">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-bold mb-2">Обработка консультации</h3>
                      <p className="text-muted-foreground">
                        {processingStatus === ConsultationProcessingStatus.InProgress 
                          ? 'Идет обработка аудиофайла и генерация отчета...' 
                          : 'Ожидание начала обработки...'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Данные появятся автоматически после завершения обработки
                      </p>
                    </CardContent>
                  </Card>
                ) : processingStatus === ConsultationProcessingStatus.Failed ? (
                  <Card className="rounded-3xl border-destructive/20 bg-destructive/5">
                    <CardContent className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                      <h3 className="text-lg font-bold mb-2 text-destructive">Ошибка обработки</h3>
                      <p className="text-muted-foreground mb-4">
                        Не удалось обработать консультацию. Попробуйте переобработать.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={async () => {
                          if (!id) return;
                          try {
                            await consultationsApi.reprocess(id);
                            toast({
                              title: "Переобработка запущена",
                              description: "Консультация отправлена на повторную обработку.",
                            });
                          } catch (error) {
                            toast({
                              title: "Ошибка",
                              description: "Не удалось запустить переобработку.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Переобработать
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <ReportSection title="Жалобы" content={consultation.complaints || 'Не указано'} />
                    <ReportSection title="Объективный статус" content={consultation.objective || 'Не указано'} />
                    <ReportSection title="План лечения" content={consultation.plan || 'Не указано'} />
                    <ReportSection title="Выжимка" content={consultation.summary || 'Не указано'} />
                    <ReportSection title="Комментарий врача" content={consultation.comments || 'Не указано'} isPrivate />
                  </>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="animate-in fade-in slide-in-from-bottom-2">
                <Card className="rounded-3xl border-border/50">
                  <CardContent className="p-6">
                    {isProcessing ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Транскрипция обрабатывается...</p>
                      </div>
                    ) : processingStatus === ConsultationProcessingStatus.Failed ? (
                      <div className="text-center py-12">
                        <AlertCircle className="w-8 h-8 mx-auto mb-4 text-destructive" />
                        <p className="text-muted-foreground">Транскрипция не доступна</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-end mb-4">
                          <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopy}>
                            <Copy className="w-3 h-3" /> Копировать текст
                          </Button>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-mono text-sm">
                          {consultation.transcript || 'Транскрипция пока не готова'}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Действия ИИ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="secondary" className="w-full justify-start rounded-xl h-12 gap-3">
                  <RefreshCw className="w-4 h-4" /> Пересоздать отчет
                </Button>
                <Button variant="secondary" className="w-full justify-start rounded-xl h-12 gap-3">
                  <Check className="w-4 h-4" /> Проверить по протоколам
                </Button>
              </CardContent>
            </Card>

            {!consultation.patientId && (
              <Card className="rounded-3xl border-destructive/20 bg-destructive/5">
                <CardHeader>
                   <CardTitle className="text-lg text-destructive">Не привязан</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Эта консультация не привязана ни к одной карточке пациента.</p>
                  <Button className="w-full rounded-xl" variant="destructive">Привязать к пациенту</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ReportSection({ title, content, isPrivate = false }: { title: string, content: string, isPrivate?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!textareaRef.current) return;

    startYRef.current = event.clientY;
    startHeightRef.current = textareaRef.current.offsetHeight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!textareaRef.current) return;
      const delta = e.clientY - startYRef.current;
      const min = 120;
      const max = 480;
      const next = Math.min(Math.max(startHeightRef.current + delta, min), max);
      textareaRef.current.style.height = `${next}px`;
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Card className={cn("rounded-3xl border-border/50 transition-all hover:border-primary/20 overflow-hidden", isPrivate && "bg-secondary/20 border-dashed")}>
      <div className="p-4 pb-2 border-b border-border/50">
        <div className="flex justify-between items-center">
           <h3 className="text-lg font-bold">{title}</h3>
           {isPrivate && <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary px-2 py-1 rounded text-muted-foreground">Личное</span>}
        </div>
      </div>
      <div className="relative pb-6">
        <Textarea 
          ref={textareaRef}
          className="min-h-[120px] max-h-[480px] w-full border-none resize-none focus-visible:ring-0 bg-transparent pr-10 pt-4 pl-4 text-base leading-relaxed text-muted-foreground focus:text-foreground transition-colors break-words"
          defaultValue={content}
        />
        <div
          className="absolute bottom-1 left-1/2 flex h-6 w-10 -translate-x-1/2 items-center justify-center rounded-full text-muted-foreground/60 cursor-ns-resize"
          onMouseDown={handleResizeStart}
        >
          <GripVertical className="h-3 w-3" />
        </div>
      </div>
    </Card>
  );
}