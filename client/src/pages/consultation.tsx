import { useRef, useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { ConsultationAudioPlayer } from '@/components/consultation-audio-player';
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
import { patientsApi } from '@/lib/api/patients';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import type { ConsultationResponse } from '@/lib/api/types';
import { ArrowLeft, Download, Share2, Copy, RefreshCw, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutoSaveConsultation } from '@/hooks/use-auto-save-consultation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { generateConsultationPDF } from '@/lib/utils/pdf-generator';

export default function ConsultationPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
  
  // Состояния для редактирования полей отчета
  const [complaints, setComplaints] = useState('');
  const [objective, setObjective] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [summary, setSummary] = useState('');
  const [comment, setComment] = useState('');
  const [savingStatus, setSavingStatus] = useState<Record<string, { isSaving: boolean; isSaved: boolean }>>({
    complaints: { isSaving: false, isSaved: false },
    objective: { isSaving: false, isSaved: false },
    treatmentPlan: { isSaving: false, isSaved: false },
    summary: { isSaving: false, isSaved: false },
    comment: { isSaving: false, isSaved: false },
  });

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

  // Загружаем данные пациента, если их нет в консультации
  const { data: patientData } = useQuery({
    queryKey: ['patient', consultation?.clientId],
    queryFn: () => {
      if (!consultation?.clientId) return null;
      return patientsApi.getById(consultation.clientId);
    },
    enabled: !!consultation?.clientId && !consultation?.patientName,
  });

  // Обогащаем консультацию данными пациента, если они загружены
  const enrichedConsultation: ConsultationResponse | null = consultation ? {
    ...consultation,
    patientName: consultation.patientName || 
                 (patientData ? `${patientData.firstName} ${patientData.lastName}` : undefined),
  } : null;

  // Синхронизируем локальные состояния с данными из API
  useEffect(() => {
    if (enrichedConsultation) {
      setComplaints(enrichedConsultation.complaints || '');
      setObjective(enrichedConsultation.objective || '');
      setTreatmentPlan(enrichedConsultation.plan || '');
      setSummary(enrichedConsultation.summary || '');
      setComment(enrichedConsultation.comments || '');
    }
  }, [enrichedConsultation?.complaints, enrichedConsultation?.objective, enrichedConsultation?.plan, enrichedConsultation?.summary, enrichedConsultation?.comments]);

  // Автосохранение всех полей консультации
  useAutoSaveConsultation({
    consultationId: id!,
    fields: {
      complaints,
      objective,
      treatmentPlan,
      summary,
      comment,
    },
    originalFields: {
      complaints: enrichedConsultation?.complaints,
      objective: enrichedConsultation?.objective,
      plan: enrichedConsultation?.plan,
      summary: enrichedConsultation?.summary,
      comments: enrichedConsultation?.comments,
    },
    enrichedConsultation,
    onSavingStatusChange: setSavingStatus,
  });

  
  // Определяем статус обработки
  const processingStatus = enrichedConsultation?.processingStatus ?? 
                           (enrichedConsultation?.status as ConsultationProcessingStatus) ?? 
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

  if (error || !enrichedConsultation) {
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

  const handleCopy = async () => {
    if (!enrichedConsultation?.transcript || enrichedConsultation.transcript.trim() === '') {
      toast({
        title: "Нет текста для копирования",
        description: "Транскрипция пуста",
        variant: "destructive",
      });
      return;
    }

    const textToCopy = enrichedConsultation.transcript;

    // Проверяем доступность Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        toast({
          title: "Скопировано",
          description: "Транскрипция скопирована в буфер обмена",
        });
        return;
      } catch (error) {
        console.warn('Clipboard API failed, trying fallback:', error);
      }
    }

    // Улучшенный fallback для мобильных устройств
    try {
      // Определяем, мобильное ли устройство
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Создаем textarea для копирования
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      
      if (isMobile) {
        // Для мобильных устройств делаем textarea видимым на короткое время
        // Это необходимо для корректной работы execCommand
        textArea.style.position = 'fixed';
        textArea.style.top = '50%';
        textArea.style.left = '50%';
        textArea.style.transform = 'translate(-50%, -50%)';
        textArea.style.width = '90%';
        textArea.style.maxHeight = '200px';
        textArea.style.padding = '12px';
        textArea.style.border = '1px solid #ccc';
        textArea.style.borderRadius = '8px';
        textArea.style.fontSize = '14px';
        textArea.style.zIndex = '9999';
        textArea.style.background = '#fff';
        textArea.style.opacity = '0.01'; // Почти невидим, но видим для браузера
      } else {
        // Для десктопа используем скрытый textarea
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.style.opacity = '0';
        textArea.style.zIndex = '-1';
      }
      
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(textArea);
      
      // Для мобильных устройств важно использовать focus и select
      // Небольшая задержка для мобильных, чтобы браузер успел отрендерить элемент
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textToCopy.length);
      
      // Пробуем использовать execCommand
      const successful = document.execCommand('copy');
      
      // Для мобильных удаляем с небольшой задержкой
      if (isMobile) {
        setTimeout(() => {
          document.body.removeChild(textArea);
        }, 200);
      } else {
        document.body.removeChild(textArea);
      }
      
      if (successful) {
        toast({
          title: "Скопировано",
          description: "Транскрипция скопирована в буфер обмена",
        });
        return;
      } else {
        throw new Error('execCommand failed');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      
      // Последний fallback: пытаемся выделить текст в элементе для ручного копирования
      const transcriptElement = document.querySelector('[data-transcript]');
      if (transcriptElement) {
        try {
          const range = document.createRange();
          range.selectNodeContents(transcriptElement);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Показываем подсказку
            toast({
              title: "Текст выделен",
              description: "Текст выделен. Используйте контекстное меню для копирования.",
              duration: 4000,
            });
            return;
          }
        } catch (err) {
          console.error('Selection failed:', err);
        }
      }
      
      // Если ничего не помогло
      toast({
        title: "Копирование не поддерживается",
        description: "Пожалуйста, выделите текст вручную и скопируйте его",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleShare = async () => {
    if (!enrichedConsultation || !id) return;

    try {
      // Генерируем публичную ссылку
      // Для простоты используем формат /share/consultation/{id}
      // В будущем можно добавить генерацию токена на бэкенде
      const publicUrl = `${window.location.origin}/share/consultation/${id}`;
      
      // Копируем ссылку в буфер обмена
      await navigator.clipboard.writeText(publicUrl);
      
      toast({ 
        title: "Публичная ссылка создана", 
        description: "Ссылка скопирована в буфер обмена. Эта ссылка доступна только для чтения пациентам." 
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback для старых браузеров
      const publicUrl = `${window.location.origin}/share/consultation/${id}`;
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({ 
          title: "Публичная ссылка создана", 
          description: "Ссылка скопирована в буфер обмена." 
        });
      } catch (err) {
        toast({ 
          title: "Ошибка", 
          description: "Не удалось скопировать ссылку. Ссылка: " + publicUrl,
          variant: "destructive"
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDownloadPDF = async () => {
    if (!enrichedConsultation) return;
    
    await generateConsultationPDF(
      enrichedConsultation,
      {
        complaints,
        objective,
        treatmentPlan,
        summary,
        comment,
      },
      toast
    );
  };

  const handleReprocess = async () => {
    if (!id) return;
    
    setIsReprocessing(true);
    try {
      await consultationsApi.reprocess(id);
      
      // Инвалидируем кэш консультации для обновления данных
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      
      toast({
        title: "Переобработка запущена",
        description: "Консультация отправлена на повторную обработку. Данные обновятся автоматически.",
      });
    } catch (error) {
      console.error('Reprocess consultation error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить переобработку. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await consultationsApi.delete(id);
      
      // Инвалидируем кэш консультаций и пациента
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      if (enrichedConsultation?.patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-consultations', enrichedConsultation.patientId] });
      }
      
      toast({
        title: "Консультация удалена",
        description: "Консультация успешно удалена.",
      });
      
      // Перенаправляем на страницу пациента или дашборд
      if (enrichedConsultation?.patientId) {
        setLocation(`/patient/${enrichedConsultation.patientId}`);
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
            <Link href={enrichedConsultation.patientId ? `/patient/${enrichedConsultation.patientId}` : '/dashboard'}>
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
                  {enrichedConsultation.date ? format(new Date(enrichedConsultation.date), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана'} • {enrichedConsultation.duration || '0:00'} • {enrichedConsultation.patientName || "Пациент не назначен"}
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
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base"
              onClick={handleDownloadPDF}
              disabled={isProcessing}
            >
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

        {/* Audio Player */}
        {id && (
          <ConsultationAudioPlayer
            consultationId={id}
            audioDuration={enrichedConsultation.audioDuration ?? undefined}
            processingStatus={processingStatus}
            duration={enrichedConsultation.duration}
          />
        )}

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
                    <ReportSection 
                      title="Жалобы" 
                      content={complaints} 
                      onChange={setComplaints}
                      placeholder="Не указано"
                      savingStatus={savingStatus.complaints}
                    />
                    <ReportSection 
                      title="Объективный статус" 
                      content={objective} 
                      onChange={setObjective}
                      placeholder="Не указано"
                      savingStatus={savingStatus.objective}
                    />
                    <ReportSection 
                      title="План лечения" 
                      content={treatmentPlan} 
                      onChange={setTreatmentPlan}
                      placeholder="Не указано"
                      savingStatus={savingStatus.treatmentPlan}
                    />
                    <ReportSection 
                      title="Резюме консультации" 
                      content={summary} 
                      onChange={setSummary}
                      placeholder="Не указано"
                      savingStatus={savingStatus.summary}
                    />
                    <ReportSection 
                      title="Комментарий врача" 
                      content={comment} 
                      onChange={setComment}
                      placeholder="Не указано"
                      isPrivate 
                      savingStatus={savingStatus.comment}
                    />
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
                    <div 
                      className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-mono text-sm select-text"
                      data-transcript
                      style={{ 
                        userSelect: 'text', 
                        WebkitUserSelect: 'text',
                        MozUserSelect: 'text',
                        msUserSelect: 'text'
                      }}
                    >
                      {enrichedConsultation.transcript || 'Транскрипция пока не готова'}
                    </div>
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
                <AlertDialog open={reprocessDialogOpen} onOpenChange={setReprocessDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="secondary" 
                      className="w-full justify-start rounded-xl h-12 gap-3"
                      disabled={isReprocessing || isDeleting}
                    >
                      <RefreshCw className={cn("w-4 h-4", isReprocessing && "animate-spin")} /> 
                      {isReprocessing ? "Переобработка..." : "Пересоздать отчет"}
                </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Пересоздать отчет?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          Вы уверены, что хотите пересоздать отчет?
                          <strong className="block text-foreground">
                            Все внесенные правки будут удалены и заменены результатами новой обработки.
                          </strong>
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isReprocessing}>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReprocess}
                        disabled={isReprocessing}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isReprocessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Переобработка...
                          </>
                        ) : (
                          'Пересоздать отчет'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Сейчас это первая версия Odonta AI, поэтому в редких случаях возможны неточности
                  в распознавании или формулировках. Если вы заметили ошибочную транскрибацию
                  или некорректный отчет, пожалуйста, напишите в службу поддержки — мы разберемся
                  и улучшим модель.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start rounded-xl h-10 gap-2"
                >
                  <a
                    href="https://t.me/odonta_ai_support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Поддержка в Telegram</span>
                  </a>
                </Button>
              </CardContent>
            </Card>

            {!enrichedConsultation.patientId && (
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

function ReportSection({ 
  title, 
  content, 
  onChange,
  placeholder = '',
  isPrivate = false,
  savingStatus
}: { 
  title: string; 
  content: string; 
  onChange?: (value: string) => void;
  placeholder?: string;
  isPrivate?: boolean;
  savingStatus?: { isSaving: boolean; isSaved: boolean };
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditable = !!onChange;
  const { toast } = useToast();

  // Автоматическое изменение высоты textarea при изменении содержимого
  useEffect(() => {
    if (textareaRef.current) {
      // Сбрасываем высоту, чтобы получить правильный scrollHeight
      textareaRef.current.style.height = 'auto';
      // Устанавливаем высоту на основе содержимого
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
    // Автоматически изменяем высоту при вводе
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleCopy = async () => {
    if (!content || content.trim() === '') {
      toast({
        title: "Нет текста для копирования",
        description: "Блок пуст",
        variant: "destructive",
      });
      return;
    }

    // Проверяем доступность Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(content);
        toast({
          title: "Скопировано",
          description: `Текст из блока "${title}" скопирован в буфер обмена`,
        });
        return;
      } catch (error) {
        console.warn('Clipboard API failed, trying fallback:', error);
      }
    }

    // Улучшенный fallback для мобильных устройств
    try {
      // Определяем, мобильное ли устройство
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Создаем textarea для копирования
      const textArea = document.createElement('textarea');
      textArea.value = content;
      
      if (isMobile) {
        // Для мобильных устройств делаем textarea видимым на короткое время
        textArea.style.position = 'fixed';
        textArea.style.top = '50%';
        textArea.style.left = '50%';
        textArea.style.transform = 'translate(-50%, -50%)';
        textArea.style.width = '90%';
        textArea.style.maxHeight = '200px';
        textArea.style.padding = '12px';
        textArea.style.border = '1px solid #ccc';
        textArea.style.borderRadius = '8px';
        textArea.style.fontSize = '14px';
        textArea.style.zIndex = '9999';
        textArea.style.background = '#fff';
        textArea.style.opacity = '0.01';
      } else {
        // Для десктопа используем скрытый textarea
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.style.opacity = '0';
        textArea.style.zIndex = '-1';
      }
      
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(textArea);
      
      // Для мобильных устройств задержка для рендеринга
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, content.length);
      
      // Пробуем использовать execCommand
      const successful = document.execCommand('copy');
      
      // Для мобильных удаляем с задержкой
      if (isMobile) {
        setTimeout(() => {
          document.body.removeChild(textArea);
        }, 200);
      } else {
        document.body.removeChild(textArea);
      }
      
      if (successful) {
        toast({
          title: "Скопировано",
          description: `Текст из блока "${title}" скопирован в буфер обмена`,
        });
      } else {
        throw new Error('execCommand failed');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Копирование не поддерживается",
        description: "Пожалуйста, выделите текст вручную и скопируйте его",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <Card className={cn("rounded-3xl border-border/50 transition-all hover:border-primary/20 overflow-hidden", isPrivate && "bg-secondary/20 border-dashed")}>
      <div className="p-4 pb-2 border-b border-border/50">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="text-lg font-bold">{title}</h3>
            {savingStatus?.isSaving && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Сохранение...</span>
              </div>
            )}
            {savingStatus?.isSaved && !savingStatus?.isSaving && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <Check className="w-3 h-3" />
                <span>Сохранено</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-secondary"
              onClick={handleCopy}
              title="Копировать текст"
            >
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            {isPrivate && <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary px-2 py-1 rounded text-muted-foreground">Личное</span>}
          </div>
        </div>
      </div>
      <div className="relative">
      <Textarea 
          ref={textareaRef}
          className={cn(
            "min-h-[120px] w-full border-none resize-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent pt-4 pl-4 pr-4 pb-4 text-base leading-relaxed break-words overflow-hidden transition-colors",
            isEditable 
              ? "text-foreground focus:text-foreground" 
              : "text-muted-foreground focus:text-foreground"
          )}
        value={content || ''}
        onChange={handleChange}
        readOnly={!isEditable}
        disabled={!isEditable}
        placeholder={placeholder}
        rows={1}
      />
      </div>
    </Card>
  );
}