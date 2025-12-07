import { useRef, useState, useEffect } from 'react';
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
import { patientsApi } from '@/lib/api/patients';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import type { ConsultationResponse } from '@/lib/api/types';
import { ArrowLeft, Download, Share2, Copy, Play, Pause, RefreshCw, Check, GripVertical, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ConsultationPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
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
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Автосохранение полей отчета с debounce
  useEffect(() => {
    if (!id || !enrichedConsultation) return;
    
    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Проверяем, изменились ли какие-либо поля
    const hasChanges = 
      complaints !== (enrichedConsultation.complaints || '') ||
      objective !== (enrichedConsultation.objective || '') ||
      treatmentPlan !== (enrichedConsultation.plan || '') ||
      summary !== (enrichedConsultation.summary || '') ||
      comment !== (enrichedConsultation.comments || '');

    if (!hasChanges) {
      return;
    }

    // Устанавливаем новый таймер для автосохранения (через 1 секунду после последнего изменения)
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setIsSaved(false);
      
      try {
        await consultationsApi.update({
          id,
          complaints: complaints.trim() || undefined,
          objective: objective.trim() || undefined,
          treatmentPlan: treatmentPlan.trim() || undefined,
          summary: summary.trim() || undefined,
          comment: comment.trim() || undefined,
        });

        // Обновляем кэш
        queryClient.setQueryData(['consultation', id], {
          ...enrichedConsultation,
          complaints: complaints.trim() || null,
          objective: objective.trim() || null,
          plan: treatmentPlan.trim() || null,
          summary: summary.trim() || null,
          comments: comment.trim() || null,
        });

        setIsSaved(true);
        
        // Скрываем индикатор сохранения через 2 секунды
        setTimeout(() => setIsSaved(false), 2000);
      } catch (error) {
        console.error('Auto-save consultation error:', error);
        toast({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить изменения. Попробуйте еще раз.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Сохраняем через 1 секунду после последнего изменения

    // Очистка при размонтировании
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [complaints, objective, treatmentPlan, summary, comment, id, enrichedConsultation, queryClient, toast]);
  
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

  const handleCopy = () => {
    toast({ title: "Скопировано в буфер обмена" });
  };

  const handleShare = () => {
    toast({ 
      title: "Публичная ссылка создана", 
      description: "Ссылка скопирована. Эта ссылка доступна только для чтения пациентам." 
    });
  };

  const handleDownloadPDF = async () => {
    if (!enrichedConsultation) return;

    try {
      // Создаем временный контейнер для PDF контента
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '800px';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.backgroundColor = '#ffffff';
      pdfContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      pdfContainer.style.color = '#000000';
      pdfContainer.style.lineHeight = '1.6';

      // Заголовок
      const title = document.createElement('h1');
      title.textContent = 'Медицинский отчет';
      title.style.fontSize = '24px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '20px';
      title.style.color = '#000000';
      pdfContainer.appendChild(title);

      // Информация о консультации
      const info = document.createElement('div');
      info.style.fontSize = '14px';
      info.style.color = '#666666';
      info.style.marginBottom = '20px';
      info.style.paddingBottom = '20px';
      info.style.borderBottom = '1px solid #e0e0e0';
      const consultationInfo = [
        enrichedConsultation.date ? format(new Date(enrichedConsultation.date), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана',
        `Длительность: ${enrichedConsultation.duration || '0:00'}`,
        `Пациент: ${enrichedConsultation.patientName || 'Не указан'}`,
      ].filter(Boolean).join(' • ');
      info.textContent = consultationInfo;
      pdfContainer.appendChild(info);

      // Функция для создания секции
      const createSection = (sectionTitle: string, content: string) => {
        const section = document.createElement('div');
        section.style.marginBottom = '30px';

        const title = document.createElement('h2');
        title.textContent = sectionTitle;
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        title.style.color = '#000000';
        section.appendChild(title);

        const text = document.createElement('p');
        text.textContent = content || 'Не указано';
        text.style.fontSize = '14px';
        text.style.color = '#333333';
        text.style.whiteSpace = 'pre-wrap';
        text.style.wordWrap = 'break-word';
        section.appendChild(text);

        return section;
      };

      // Добавляем секции
      pdfContainer.appendChild(createSection('Жалобы', complaints || enrichedConsultation.complaints || ''));
      pdfContainer.appendChild(createSection('Объективный статус', objective || enrichedConsultation.objective || ''));
      pdfContainer.appendChild(createSection('План лечения', treatmentPlan || enrichedConsultation.treatmentPlan || ''));
      pdfContainer.appendChild(createSection('Выжимка', summary || enrichedConsultation.summary || ''));

      if (comment || enrichedConsultation.comment) {
        const commentSection = createSection('Комментарий врача', comment || enrichedConsultation.comment || '');
        commentSection.style.color = '#666666';
        pdfContainer.appendChild(commentSection);
      }

      // Добавляем контейнер в DOM
      document.body.appendChild(pdfContainer);

      // Конвертируем в canvas
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Удаляем временный контейнер
      document.body.removeChild(pdfContainer);

      // Создаем PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      // Если контент не помещается на одну страницу, разбиваем на несколько
      const pageHeight = pdfHeight;
      let heightLeft = imgScaledHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgScaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
        heightLeft -= pageHeight;
      }

      // Добавляем транскрипцию на отдельной странице, если есть
      if (enrichedConsultation.transcript) {
        pdf.addPage();
        const transcriptContainer = document.createElement('div');
        transcriptContainer.style.position = 'absolute';
        transcriptContainer.style.left = '-9999px';
        transcriptContainer.style.width = '800px';
        transcriptContainer.style.padding = '40px';
        transcriptContainer.style.backgroundColor = '#ffffff';
        transcriptContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        transcriptContainer.style.color = '#000000';

        const transcriptTitle = document.createElement('h1');
        transcriptTitle.textContent = 'Транскрипция';
        transcriptTitle.style.fontSize = '24px';
        transcriptTitle.style.fontWeight = 'bold';
        transcriptTitle.style.marginBottom = '20px';
        transcriptContainer.appendChild(transcriptTitle);

        const transcriptText = document.createElement('p');
        transcriptText.textContent = enrichedConsultation.transcript;
        transcriptText.style.fontSize = '12px';
        transcriptText.style.color = '#333333';
        transcriptText.style.whiteSpace = 'pre-wrap';
        transcriptText.style.wordWrap = 'break-word';
        transcriptText.style.fontFamily = 'monospace';
        transcriptContainer.appendChild(transcriptText);

        document.body.appendChild(transcriptContainer);
        const transcriptCanvas = await html2canvas(transcriptContainer, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        document.body.removeChild(transcriptContainer);

        const transcriptImgData = transcriptCanvas.toDataURL('image/png');
        const transcriptImgWidth = transcriptCanvas.width;
        const transcriptImgHeight = transcriptCanvas.height;
        const transcriptRatio = Math.min(pdfWidth / transcriptImgWidth, pdfHeight / transcriptImgHeight);
        const transcriptImgScaledWidth = transcriptImgWidth * transcriptRatio;
        const transcriptImgScaledHeight = transcriptImgHeight * transcriptRatio;

        let transcriptHeightLeft = transcriptImgScaledHeight;
        let transcriptPosition = 0;

        pdf.addImage(transcriptImgData, 'PNG', 0, transcriptPosition, transcriptImgScaledWidth, transcriptImgScaledHeight);
        transcriptHeightLeft -= pageHeight;

        while (transcriptHeightLeft > 0) {
          transcriptPosition = transcriptHeightLeft - transcriptImgScaledHeight;
          pdf.addPage();
          pdf.addImage(transcriptImgData, 'PNG', 0, transcriptPosition, transcriptImgScaledWidth, transcriptImgScaledHeight);
          transcriptHeightLeft -= pageHeight;
        }
      }

      // Сохраняем PDF
      const fileName = `consultation_${enrichedConsultation.id}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF скачан",
        description: "Медицинский отчет успешно сохранен в PDF.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать PDF файл. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
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
            <span className="text-sm font-mono text-muted-foreground">{enrichedConsultation.duration || '0:00'}</span>
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
                    {isSaving && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Сохранение изменений...</span>
                      </div>
                    )}
                    {isSaved && !isSaving && (
                      <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-4">
                        <Check className="w-4 h-4" />
                        <span>Изменения сохранены</span>
                      </div>
                    )}
                    <ReportSection 
                      title="Жалобы" 
                      content={complaints} 
                      onChange={setComplaints}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="Объективный статус" 
                      content={objective} 
                      onChange={setObjective}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="План лечения" 
                      content={treatmentPlan} 
                      onChange={setTreatmentPlan}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="Выжимка" 
                      content={summary} 
                      onChange={setSummary}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="Комментарий врача" 
                      content={comment} 
                      onChange={setComment}
                      placeholder="Не указано"
                      isPrivate 
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
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-mono text-sm">
                          {enrichedConsultation.transcript || 'Транскрипция пока не готова'}
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
                      <AlertDialogDescription>
                        Вы уверены, что хотите пересоздать отчет? 
                        <strong className="block mt-2 text-foreground">
                          Все внесенные правки будут удалены и заменены результатами новой обработки.
                        </strong>
                        Консультация будет отправлена на повторную обработку, и данные обновятся автоматически после завершения.
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
  isPrivate = false 
}: { 
  title: string; 
  content: string; 
  onChange?: (value: string) => void;
  placeholder?: string;
  isPrivate?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditable = !!onChange;

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

  return (
    <Card className={cn("rounded-3xl border-border/50 transition-all hover:border-primary/20 overflow-hidden", isPrivate && "bg-secondary/20 border-dashed")}>
      <div className="p-4 pb-2 border-b border-border/50">
        <div className="flex justify-between items-center">
           <h3 className="text-lg font-bold">{title}</h3>
           {isPrivate && <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary px-2 py-1 rounded text-muted-foreground">Личное</span>}
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