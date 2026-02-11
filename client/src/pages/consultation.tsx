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
import { ConsultationProcessingStatus, ConsultationType } from '@/lib/api/types';
import type { ConsultationResponse, ConsultationProperty } from '@/lib/api/types';
import { ArrowLeft, Download, Share2, Copy, RefreshCw, Check, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAutoSaveConsultation } from '@/hooks/use-auto-save-consultation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { generateConsultationPDF } from '@/lib/utils/pdf-generator';

// Функция для получения названия типа консультации
function getConsultationTypeName(type: number | undefined): string {
  if (!type) return 'консультации';
  
  switch (type) {
    case ConsultationType.PrimaryDoctorClient:
      return 'первичной консультации';
    case ConsultationType.SecondaryDoctorClient:
      return 'вторичной консультации';
    case ConsultationType.CoordinatorClient:
      return 'консультации координатора';
    default:
      return 'консультации';
  }
}

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
  // Значения динамических блоков отчета (все, что не входит в базовые поля)
  const [dynamicPropertyValues, setDynamicPropertyValues] = useState<Record<string, string>>({});
  const dynamicSaveTimeouts = useRef<Record<string, NodeJS.Timeout | null>>({});
  const dynamicLastSavedValues = useRef<Record<string, string>>({});

  // Загрузка данных консультации
  // Если консультация обрабатывается, периодически обновляем данные
  const { data: consultationData, isLoading, error } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => {
      if (!id) throw new Error('ID консультации не указан');
      console.log(`[Consultation Page] Fetching consultation ${id} from API`);
      return consultationsApi.getById(id);
    },
    enabled: !!id,
    refetchOnMount: 'always', // Всегда обновляем данные при монтировании компонента (при открытии страницы)
    refetchOnWindowFocus: true, // Обновляем при возврате на вкладку
    staleTime: 0, // Данные считаются устаревшими сразу, чтобы всегда загружать свежие данные
    // Периодически обновляем данные, если консультация еще обрабатывается
    refetchInterval: (query) => {
      const data = query.state.data as ConsultationResponse | undefined;
      if (!data) return false;
      
      // Проверяем статус
      const status = typeof data.status === 'number' 
        ? data.status 
        : (typeof data.processingStatus === 'number' 
          ? data.processingStatus 
          : ConsultationProcessingStatus.None);
      
      // Проверяем наличие данных
      const hasData = data.summary || 
                     data.complaints || 
                     data.objective || 
                     data.treatmentPlan ||
                     data.transcriptionResult;
      
      // Если статус Completed/Failed или есть данные, не обновляем
      if (status === ConsultationProcessingStatus.Completed || 
          status === ConsultationProcessingStatus.Failed ||
          hasData) {
        return false;
      }
      
      // Если статус InProgress или None и нет данных, обновляем каждые 5 секунд
      if (status === ConsultationProcessingStatus.InProgress || 
          status === ConsultationProcessingStatus.None) {
        return 5000; // Обновляем каждые 5 секунд
      }
      
      return false;
    },
  });

  // Преобразуем данные для отображения
  const consultation: ConsultationResponse | null = consultationData || null;

  // Определяем статус из данных консультации
  // Приоритет: consultation.status > consultation.processingStatus > None
  let currentStatus: ConsultationProcessingStatus;
  
  if (consultation) {
    // В новой структуре status - обязательное поле
    if (typeof consultation.status === 'number') {
      currentStatus = consultation.status;
    } else if (typeof consultation.status === 'string') {
      const parsed = parseInt(consultation.status, 10);
      currentStatus = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
    } else {
      // Fallback на processingStatus
      if (typeof consultation.processingStatus === 'number') {
        currentStatus = consultation.processingStatus;
      } else if (typeof consultation.processingStatus === 'string') {
        const parsed = parseInt(consultation.processingStatus, 10);
        currentStatus = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
      } else {
        currentStatus = ConsultationProcessingStatus.None;
      }
    }
  } else {
    currentStatus = ConsultationProcessingStatus.None;
  }
  
  // Логируем для отладки
  useEffect(() => {
    console.log('[Consultation Page] Status check:', {
      consultationStatus: consultation?.status,
      consultationProcessingStatus: consultation?.processingStatus,
      currentStatus,
      statusName: ConsultationProcessingStatus[currentStatus],
    });
  }, [consultation?.status, consultation?.processingStatus, currentStatus]);

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
  // ВАЖНО: Обновляем локальные состояния при загрузке данных с бэкенда
  useEffect(() => {
    if (enrichedConsultation) {
      console.log(`[Consultation Page] Syncing local state with API data:`, {
        complaints: enrichedConsultation.complaints?.substring(0, 50) || '',
        objective: enrichedConsultation.objective?.substring(0, 50) || '',
        treatmentPlan: enrichedConsultation.plan?.substring(0, 50) || '',
        summary: enrichedConsultation.summary?.substring(0, 50) || '',
        comment: enrichedConsultation.comments?.substring(0, 50) || '',
      });
      
      setComplaints(enrichedConsultation.complaints || '');
      setObjective(enrichedConsultation.objective || '');
      setTreatmentPlan(enrichedConsultation.plan || '');
      setSummary(enrichedConsultation.summary || '');
      setComment(enrichedConsultation.comments || '');

      // Инициализируем значения динамических блоков (все свойства, кроме базовых полей и AI-оценки)
      if (enrichedConsultation.properties && enrichedConsultation.properties.length > 0) {
        const baseKeys = new Set(['complaints', 'objective', 'treatment_plan', 'summary', 'comment']);
        const aiReportKey = 'calgary_сambridge_report';
        const newDynamicValues: Record<string, string> = {};
        const newLastSavedValues: Record<string, string> = { ...dynamicLastSavedValues.current };

        enrichedConsultation.properties.forEach((prop) => {
          const key = prop.parent?.key;
          const id = String(prop.id);
          const value = prop.value ?? '';

          // Пропускаем базовые поля и AI-оценку (она показывается на отдельной странице)
          if (!key || baseKeys.has(key) || key === aiReportKey) {
            return;
          }

          newDynamicValues[id] = value;
          newLastSavedValues[id] = value;
        });

        setDynamicPropertyValues(newDynamicValues);
        dynamicLastSavedValues.current = newLastSavedValues;
      }
    }
  }, [enrichedConsultation?.complaints, enrichedConsultation?.objective, enrichedConsultation?.plan, enrichedConsultation?.summary, enrichedConsultation?.comments, enrichedConsultation?.properties]);

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

  // Автосохранение динамических блоков отчета (все свойства, кроме базовых ключей)
  useEffect(() => {
    if (!id || !enrichedConsultation?.properties) return;

    const baseKeys = new Set(['complaints', 'objective', 'treatment_plan', 'summary', 'comment']);
    const aiReportKey = 'calgary_сambridge_report';
    const propertiesById = new Map(
      enrichedConsultation.properties.map((p) => [String(p.id), p])
    );

    Object.entries(dynamicPropertyValues).forEach(([propertyId, value]) => {
      const property = propertiesById.get(propertyId);
      if (!property) return;

      const key = property.parent?.key;
      // Базовые поля сохраняются через useAutoSaveConsultation, AI-оценку не редактируем с этой страницы
      if (key && (baseKeys.has(key) || key === aiReportKey)) return;

      const trimmedValue = (value ?? '').trim();
      const lastSavedValue = dynamicLastSavedValues.current[propertyId] ?? '';

      // Если значение не изменилось – ничего не делаем
      if (trimmedValue === lastSavedValue) return;

      // Чистим предыдущий таймаут
      if (dynamicSaveTimeouts.current[propertyId]) {
        clearTimeout(dynamicSaveTimeouts.current[propertyId]!);
      }

      // Если поле не редактируемое – не отправляем запрос
      if (property.parent?.isEditable === false) {
        setSavingStatus((prev) => ({
          ...prev,
          [propertyId]: { isSaving: false, isSaved: false },
        }));
        return;
      }

      // Устанавливаем новый таймаут автосохранения
      dynamicSaveTimeouts.current[propertyId] = setTimeout(async () => {
        setSavingStatus((prev) => ({
          ...prev,
          [propertyId]: { isSaving: true, isSaved: false },
        }));

        try {
          await consultationsApi.update({
            consultationId: String(id),
            propertyId: String(propertyId),
            value: trimmedValue,
          });

          // Обновляем последнее сохранённое значение
          dynamicLastSavedValues.current[propertyId] = trimmedValue;

          // Помечаем как "Сохранено"
          setSavingStatus((prev) => ({
            ...prev,
            [propertyId]: { isSaving: false, isSaved: true },
          }));

          // Через 2 секунды скрываем "Сохранено"
          setTimeout(() => {
            setSavingStatus((prev) => {
              const current = prev[propertyId];
              if (!current) return prev;
              return {
                ...prev,
                [propertyId]: { ...current, isSaved: false },
              };
            });
          }, 2000);
        } catch (error) {
          console.error('Auto-save dynamic consultation field error:', error);
          setSavingStatus((prev) => ({
            ...prev,
            [propertyId]: { isSaving: false, isSaved: false },
          }));

          toast({
            title: 'Ошибка сохранения',
            description: 'Не удалось сохранить изменения. Попробуйте еще раз.',
            variant: 'destructive',
          });
        }
      }, 1000); // 1 секунда debounce
    });

    return () => {
      // При размонтировании очищаем все таймауты
      Object.values(dynamicSaveTimeouts.current).forEach((timeoutId) => {
        if (timeoutId) clearTimeout(timeoutId);
      });
    };
  }, [id, enrichedConsultation?.properties, dynamicPropertyValues, toast]);
  
  
  // Определяем статус обработки
  // Используем актуальный статус из отдельного запроса
  // Убеждаемся, что статус - это число
  let processingStatus: ConsultationProcessingStatus;
  
  if (typeof currentStatus === 'number') {
    processingStatus = currentStatus;
  } else if (typeof currentStatus === 'string') {
    const parsed = parseInt(currentStatus, 10);
    processingStatus = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
  } else {
    // Пробуем получить статус из consultation.status (обязательное поле в новой структуре)
    const statusFromConsultation = enrichedConsultation?.status;
    if (typeof statusFromConsultation === 'number') {
      processingStatus = statusFromConsultation;
    } else if (typeof statusFromConsultation === 'string') {
      const parsed = parseInt(statusFromConsultation, 10);
      processingStatus = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
    } else {
      processingStatus = ConsultationProcessingStatus.None;
    }
  }
  
  // Определяем, обрабатывается ли консультация только по статусу
  // Completed (3) - консультация готова, НЕ обрабатывается
  // Failed (2) - ошибка, НЕ обрабатывается
  // InProgress (1) или None (0) - обрабатывается
  const finalIsProcessing =
    processingStatus === ConsultationProcessingStatus.InProgress ||
    processingStatus === ConsultationProcessingStatus.None;
  
  // Логируем для отладки
  console.log('[Consultation Status] Final check:', {
    currentStatus,
    processingStatus,
    statusName: ConsultationProcessingStatus[processingStatus],
    finalIsProcessing,
    consultationStatus: enrichedConsultation?.status,
  });
  
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
    if (!id || !enrichedConsultation) return;
    
    setIsReprocessing(true);
    try {
      const response = await consultationsApi.reprocess(id);
      
      // Сразу обновляем статус консультации в кэше на InProgress
      // чтобы пользователь сразу видел индикатор загрузки
      const updatedConsultation: ConsultationResponse = {
        ...enrichedConsultation,
        processingStatus: ConsultationProcessingStatus.InProgress,
        status: ConsultationProcessingStatus.InProgress,
        // Очищаем поля отчета, так как они будут перегенерированы
        summary: undefined,
        complaints: undefined,
        objective: undefined,
        treatmentPlan: undefined,
        transcript: undefined,
      };
      
      queryClient.setQueryData(['consultation', id], updatedConsultation);
      
      // Также обновляем кэш списка консультаций
      queryClient.setQueryData(['consultations', 'all'], (oldData: ConsultationResponse[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(c => 
          String(c.id) === String(id)
            ? { ...c, processingStatus: ConsultationProcessingStatus.InProgress, status: ConsultationProcessingStatus.InProgress }
            : c
        );
      });
      
      // Обновляем кэш консультаций пациента
      if (enrichedConsultation.clientId) {
        queryClient.setQueryData(['patient-consultations', enrichedConsultation.clientId], (oldData: ConsultationResponse[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(c => 
            String(c.id) === String(id)
              ? { ...c, processingStatus: ConsultationProcessingStatus.InProgress, status: ConsultationProcessingStatus.InProgress }
              : c
          );
        });
      }
      
      // Инвалидируем кэш для автоматического обновления данных с сервера
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      
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
      setReprocessDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await consultationsApi.delete(id);
      
      // Инвалидируем кэш консультаций и пациента
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      // Инвалидируем список всех консультаций (для страницы истории)
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
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

  // Находим AI-оценку консультации (Калгари–Кембридж)
  const aiReportProperty = enrichedConsultation.properties?.find(
    (p) => p.parent?.key === 'calgary_сambridge_report'
  );
  const aiReportValue = aiReportProperty?.value ?? '';
  const hasAiReport = aiReportValue.trim().length > 0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <Link href={enrichedConsultation.patientId ? `/patient/${enrichedConsultation.patientId}` : '/dashboard'}>
              <Button 
                variant="ghost" 
                className="pl-0 mb-2 hover:bg-transparent hover:text-primary gap-2 text-muted-foreground text-sm md:text-base transition-all active:scale-95 active:opacity-70"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </Button>
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Отчет о {getConsultationTypeName(enrichedConsultation.type)}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-sm md:text-base text-muted-foreground mt-1">
              <span>
                {enrichedConsultation.date
                  ? format(new Date(enrichedConsultation.date), 'd MMMM yyyy', { locale: ru })
                  : 'Дата не указана'}
              </span>
              <span>•</span>
              <span>{enrichedConsultation.duration || '0:00'}</span>
              <span>•</span>
              <span>{enrichedConsultation.patientName || 'Пациент не назначен'}</span>
              {enrichedConsultation.doctorName && (
                <>
                  <span>•</span>
                  <span>Врач: {enrichedConsultation.doctorName}</span>
                </>
              )}
            </p>
              </div>
              {finalIsProcessing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">{getStatusText(processingStatus)}</span>
                </div>
              )}
              {!finalIsProcessing && processingStatus === ConsultationProcessingStatus.Completed && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Готово</span>
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
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base transition-all active:scale-95 active:opacity-70" 
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Поделиться</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base transition-all active:scale-95 active:opacity-70 disabled:active:scale-100 disabled:active:opacity-50"
              onClick={handleDownloadPDF}
              disabled={finalIsProcessing}
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base transition-all active:scale-95 active:opacity-80 disabled:active:scale-100 disabled:active:opacity-50"
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
                  <AlertDialogCancel 
                    disabled={isDeleting}
                    className="transition-all active:scale-95 active:opacity-70 disabled:active:scale-100 disabled:active:opacity-50"
                  >
                    Отмена
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all active:scale-95 active:opacity-80 disabled:active:scale-100 disabled:active:opacity-50"
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
              <TabsList className="grid w-full grid-cols-2 h-10 md:h-11 p-0 rounded-full bg-background text-muted-foreground mb-4 md:mb-6 shadow-sm overflow-hidden border border-border/50">
                <TabsTrigger
                  value="report"
                  className="rounded-full px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-medium whitespace-nowrap transition-all data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Медицинский отчет
                </TabsTrigger>
                <TabsTrigger
                  value="transcript"
                  className="rounded-full px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-medium whitespace-nowrap transition-all data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Транскрипция
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value="report" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {finalIsProcessing ? (
                  <Card className="rounded-3xl border-border/50">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-bold mb-2">Обработка консультации</h3>
                      <p className="text-muted-foreground">
                        {enrichedConsultation?.statusMessage || 
                         (processingStatus === ConsultationProcessingStatus.InProgress 
                          ? 'Идет обработка аудиофайла и генерация отчета...' 
                          : 'Ожидание начала обработки...')}
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
                        className="transition-all active:scale-95 active:opacity-70"
                        onClick={handleReprocess}
                        disabled={isReprocessing}
                      >
                        {isReprocessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Переобработка...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Переобработать
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {(enrichedConsultation.properties || [])
                      .filter((p) => p.parent?.key !== 'calgary_сambridge_report')
                      .slice()
                      .sort((a, b) => {
                        const orderA = typeof a.parent?.order === 'number' ? a.parent!.order : 0;
                        const orderB = typeof b.parent?.order === 'number' ? b.parent!.order : 0;
                        return orderA - orderB;
                      })
                      .map((property) => {
                        const key = property.parent?.key;
                        const id = String(property.id);
                        const baseKey = key === 'complaints' ||
                                        key === 'objective' ||
                                        key === 'treatment_plan' ||
                                        key === 'summary' ||
                                        key === 'comment'
                                          ? key
                                          : null;

                        // Определяем текущее значение блока
                        let content = '';
                        if (baseKey === 'complaints') {
                          content = complaints;
                        } else if (baseKey === 'objective') {
                          content = objective;
                        } else if (baseKey === 'treatment_plan') {
                          content = treatmentPlan;
                        } else if (baseKey === 'summary') {
                          content = summary;
                        } else if (baseKey === 'comment') {
                          content = comment;
                        } else {
                          content = dynamicPropertyValues[id] ?? property.value ?? '';
                        }

                        // Можно ли редактировать блок
                        const isEditable = property.parent?.isEditable !== false;

                        // Хендлер изменения
                        const handleChange =
                          !isEditable
                            ? undefined
                            : (value: string) => {
                                if (baseKey === 'complaints') {
                                  setComplaints(value);
                                } else if (baseKey === 'objective') {
                                  setObjective(value);
                                } else if (baseKey === 'treatment_plan') {
                                  setTreatmentPlan(value);
                                } else if (baseKey === 'summary') {
                                  setSummary(value);
                                } else if (baseKey === 'comment') {
                                  setComment(value);
                                } else {
                                  setDynamicPropertyValues((prev) => ({
                                    ...prev,
                                    [id]: value,
                                  }));
                                }
                              };

                        const isPrivate = key === 'comment';
                        const statusKey = baseKey ?? id;

                        return (
                          <ReportSection
                            key={id}
                            title={property.parent?.title || 'Без названия'}
                            description={property.parent?.description || undefined}
                            content={content}
                            onChange={handleChange}
                            placeholder="Не указано"
                            isPrivate={isPrivate}
                            savingStatus={savingStatus[statusKey]}
                          />
                        );
                      })}
                  </>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="animate-in fade-in slide-in-from-bottom-2">
                <Card className="rounded-3xl border-border/50">
                  <CardContent className="p-6">
                    {finalIsProcessing ? (
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2 transition-all active:scale-95 active:opacity-70" 
                        onClick={handleCopy}
                      >
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
                {/* AI рекомендации */}
                <Button
                  className={cn(
                    "w-full justify-start rounded-xl h-12 gap-3 transition-all active:scale-95 active:opacity-70 disabled:cursor-not-allowed",
                    !hasAiReport && "border-dashed bg-muted/40 text-muted-foreground opacity-80"
                  )}
                  variant="outline"
                  disabled={!hasAiReport}
                  onClick={() => {
                    if (!id || !hasAiReport) return;
                    setLocation(`/consultation/${id}/ai-report`);
                  }}
                >
                  <img
                    src="/ideas.png"
                    alt="AI рекомендации"
                    className={cn("w-5 h-5", !hasAiReport && "opacity-60")}
                  />
                  <span>AI рекомендации</span>
                </Button>
                {!hasAiReport && (
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    AI‑оценка для этой консультации пока недоступна. 
                    Она появится, когда модель сформирует отчет по Калгари–Кембридж.
                  </p>
                )}

                <AlertDialog open={reprocessDialogOpen} onOpenChange={setReprocessDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="secondary" 
                      className="w-full justify-start rounded-xl h-12 gap-3 transition-all active:scale-95 active:opacity-70 disabled:active:scale-100 disabled:active:opacity-50"
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
                      <AlertDialogCancel 
                        disabled={isReprocessing}
                        className="transition-all active:scale-95 active:opacity-70 disabled:active:scale-100 disabled:active:opacity-50"
                      >
                        Отмена
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReprocess}
                        disabled={isReprocessing}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 active:opacity-80 disabled:active:scale-100 disabled:active:opacity-50"
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
                  className="w-full justify-start rounded-xl h-10 gap-2 transition-all active:scale-95 active:opacity-70"
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
                  <Button 
                    className="w-full rounded-xl transition-all active:scale-95 active:opacity-80" 
                    variant="destructive"
                  >
                    Привязать к пациенту
                  </Button>
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
  description,
  content, 
  onChange,
  placeholder = '',
  isPrivate = false,
  savingStatus
}: { 
  title: string;
  description?: string;
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
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
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
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-secondary transition-all active:scale-95 active:opacity-70"
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