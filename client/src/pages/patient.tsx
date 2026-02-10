import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, ArrowLeft, Phone, Calendar, FileText, Play, Loader2, Check, AlertCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { patientsApi } from '@/lib/api/patients';
import { consultationsApi } from '@/lib/api/consultations';
import { ConsultationProcessingStatus, ConsultationType } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { PatientResponse, ConsultationResponse, ConsultationProperty } from '@/lib/api/types';

// Функция для получения названия типа консультации
function getConsultationTypeName(type: number | undefined): string {
  if (!type) return 'Консультация';
  
  switch (type) {
    case ConsultationType.PrimaryDoctorClient:
      return 'Первичная консультация';
    case ConsultationType.SecondaryDoctorClient:
      return 'Вторичная консультация';
    case ConsultationType.CoordinatorClient:
      return 'Консультация координатора';
    default:
      return 'Консультация';
  }
}

export default function PatientProfile() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [comment, setComment] = useState('');

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast({
        title: "Номер скопирован",
        description: `Номер телефона ${phone} скопирован в буфер обмена`,
      });
    } catch (error) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = phone;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
          title: "Номер скопирован",
          description: `Номер телефона ${phone} скопирован в буфер обмена`,
        });
      } catch (err) {
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать номер телефона",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Состояния для полей медицинской карты
  const [medicalRecordFields, setMedicalRecordFields] = useState({
    allergy: '',
    comorbidities: '',
    anamnesis: '',
    complaints: '',
    diagnosis: '',
    treatment: '',
    otherInfo: '',
  });

  // Состояния сохранения для каждого поля
  const [savingStatus, setSavingStatus] = useState<Record<string, { isSaving: boolean; isSaved: boolean }>>({});
  
  // Refs для textarea полей медицинской карты
  const medicalRecordRefs = {
    allergy: useRef<HTMLTextAreaElement | null>(null),
    comorbidities: useRef<HTMLTextAreaElement | null>(null),
    anamnesis: useRef<HTMLTextAreaElement | null>(null),
    complaints: useRef<HTMLTextAreaElement | null>(null),
    diagnosis: useRef<HTMLTextAreaElement | null>(null),
    treatment: useRef<HTMLTextAreaElement | null>(null),
    otherInfo: useRef<HTMLTextAreaElement | null>(null),
  };

  // Timeouts для автосохранения каждого поля
  const medicalRecordTimeouts = useRef<Record<string, NodeJS.Timeout | null>>({});
  // Timeouts для скрытия индикатора "Сохранено"
  const savingStatusTimeouts = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Загрузка данных пациента
  const { data: patientData, isLoading: isLoadingPatient, error: patientError } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => {
      if (!id) throw new Error('ID пациента не указан');
      return patientsApi.getById(id);
    },
    enabled: !!id,
  });

  // Синхронизируем локальное состояние с данными из API
  useEffect(() => {
    if (patientData?.comment !== undefined) {
      setComment(patientData.comment || '');
    }
  }, [patientData?.comment]);

  // Синхронизируем поля медицинской карты с данными из API
  useEffect(() => {
    if (patientData?.medicalRecord) {
      setMedicalRecordFields({
        allergy: patientData.medicalRecord.allergy || '',
        comorbidities: patientData.medicalRecord.comorbidities || '',
        anamnesis: patientData.medicalRecord.anamnesis || '',
        complaints: patientData.medicalRecord.complaints || '',
        diagnosis: patientData.medicalRecord.diagnosis || '',
        treatment: patientData.medicalRecord.treatment || '',
        otherInfo: patientData.medicalRecord.otherInfo || '',
      });
    } else {
      // Если медицинской карты нет, инициализируем пустыми значениями
      setMedicalRecordFields({
        allergy: '',
        comorbidities: '',
        anamnesis: '',
        complaints: '',
        diagnosis: '',
        treatment: '',
        otherInfo: '',
      });
    }
  }, [patientData?.medicalRecord]);

  // Автоматическое изменение высоты textarea при изменении содержимого
  useEffect(() => {
    if (textareaRef.current) {
      // Сбрасываем высоту, чтобы получить правильный scrollHeight
      textareaRef.current.style.height = 'auto';
      // Устанавливаем высоту на основе содержимого
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [comment]);

  // Автоматическое изменение высоты textarea для полей медицинской карты
  useEffect(() => {
    Object.entries(medicalRecordRefs).forEach(([key, ref]) => {
      if (ref.current) {
        ref.current.style.height = 'auto';
        ref.current.style.height = `${ref.current.scrollHeight}px`;
      }
    });
  }, [medicalRecordFields]);

  // Функция для обновления статуса сохранения поля
  const updateSavingStatus = (fieldName: string, status: { isSaving: boolean; isSaved: boolean }) => {
    setSavingStatus(prev => ({
      ...prev,
      [fieldName]: status,
    }));
  };

  // Функция автосохранения поля медицинской карты
  const saveMedicalRecordField = async (fieldKey: string, fieldName: string, value: string) => {
    if (!id || !patientData) return;

    const trimmedValue = value.trim() || '';
    const originalValue = patientData.medicalRecord?.[fieldKey as keyof typeof patientData.medicalRecord] || '';
    const originalValueStr = originalValue || '';

    // Если значение не изменилось, не сохраняем
    if (trimmedValue === originalValueStr) {
      return;
    }

    // Используем fieldKey для ключа в savingStatus, так как компоненты используют fieldKey
    updateSavingStatus(fieldKey, { isSaving: true, isSaved: false });

    try {
      // Формируем объект с только измененным полем
      const updateData: {
        clientId: string | number;
        allergy?: string | null;
        comorbidities?: string | null;
        anamnesis?: string | null;
        complaints?: string | null;
        diagnosis?: string | null;
        treatment?: string | null;
        otherInfo?: string | null;
      } = {
        clientId: id,
      };

      // Добавляем только измененное поле
      switch (fieldKey) {
        case 'allergy':
          updateData.allergy = trimmedValue || null;
          break;
        case 'comorbidities':
          updateData.comorbidities = trimmedValue || null;
          break;
        case 'anamnesis':
          updateData.anamnesis = trimmedValue || null;
          break;
        case 'complaints':
          updateData.complaints = trimmedValue || null;
          break;
        case 'diagnosis':
          updateData.diagnosis = trimmedValue || null;
          break;
        case 'treatment':
          updateData.treatment = trimmedValue || null;
          break;
        case 'otherInfo':
          updateData.otherInfo = trimmedValue || null;
          break;
      }

      await patientsApi.updateMedicalRecord(updateData);

      // Обновляем кэш с сохранением всех полей медицинской карты
      queryClient.setQueryData(['patient', id], {
        ...patientData,
        medicalRecord: {
          ...(patientData.medicalRecord || {}),
          clientId: patientData.medicalRecord?.clientId || id,
          [fieldKey]: trimmedValue || null,
        },
      });

      // Используем fieldKey для ключа в savingStatus
      updateSavingStatus(fieldKey, { isSaving: false, isSaved: true });

      // Очищаем предыдущий таймер скрытия, если он есть
      if (savingStatusTimeouts.current[fieldKey]) {
        clearTimeout(savingStatusTimeouts.current[fieldKey]!);
      }

      // Скрываем индикатор сохранения через 3 секунды для лучшей видимости
      savingStatusTimeouts.current[fieldKey] = setTimeout(() => {
        updateSavingStatus(fieldKey, { isSaving: false, isSaved: false });
        savingStatusTimeouts.current[fieldKey] = null;
      }, 3000);
    } catch (error) {
      console.error(`Auto-save medical record field ${fieldName} error:`, error);
      // Используем fieldKey для ключа в savingStatus
      updateSavingStatus(fieldKey, { isSaving: false, isSaved: false });
      toast({
        title: "Ошибка сохранения",
        description: `Не удалось сохранить поле "${fieldName}". Попробуйте еще раз.`,
        variant: "destructive",
      });
    }
  };

  // Обработчик изменения поля медицинской карты
  const handleMedicalRecordFieldChange = (fieldKey: string, fieldName: string, value: string) => {
    // Обновляем локальное состояние
    setMedicalRecordFields(prev => ({
      ...prev,
      [fieldKey]: value,
    }));

    // Автоматически изменяем высоту textarea
    const ref = medicalRecordRefs[fieldKey as keyof typeof medicalRecordRefs];
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }

    // Сбрасываем индикатор "Сохранено" при новом изменении (используем fieldKey)
    updateSavingStatus(fieldKey, { isSaving: false, isSaved: false });

    // Очищаем предыдущие таймеры
    if (medicalRecordTimeouts.current[fieldKey]) {
      clearTimeout(medicalRecordTimeouts.current[fieldKey]!);
    }
    if (savingStatusTimeouts.current[fieldKey]) {
      clearTimeout(savingStatusTimeouts.current[fieldKey]!);
      savingStatusTimeouts.current[fieldKey] = null;
    }

    // Устанавливаем новый таймер для автосохранения (через 1 секунду после последнего изменения)
    medicalRecordTimeouts.current[fieldKey] = setTimeout(() => {
      saveMedicalRecordField(fieldKey, fieldName, value);
    }, 1000);
  };

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      Object.values(medicalRecordTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      Object.values(savingStatusTimeouts.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Автосохранение комментария с debounce
  useEffect(() => {
    if (!id || !patientData) return;
    
    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Получаем исходное значение комментария из patientData
    const originalComment = patientData.comment || '';
    const currentComment = comment || '';
    
    // Если комментарий не изменился, не сохраняем
    if (currentComment === originalComment) {
      return;
    }

    // Устанавливаем новый таймер для автосохранения (через 1 секунду после последнего изменения)
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setIsSaved(false);
      
      try {
        const updatedPatient = await patientsApi.update({
          id,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          phone: patientData.phone || '',
          birthDate: patientData.birthDate || undefined,
          comment: currentComment.trim() || undefined,
        });

        // Обновляем кэш с новыми данными
        queryClient.setQueryData(['patient', id], {
          ...patientData,
          comment: currentComment.trim() || null,
          updatedAt: updatedPatient.updatedAt || patientData.updatedAt,
        });

        setIsSaved(true);
        
        // Скрываем индикатор сохранения через 2 секунды
        setTimeout(() => setIsSaved(false), 2000);
      } catch (error) {
        console.error('Auto-save comment error:', error);
        toast({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить заметки. Попробуйте еще раз.",
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
  }, [comment, id, patientData, queryClient, toast]);

  // Загрузка консультаций пациента
  const { data: consultationsData = [], isLoading: isLoadingConsultations } = useQuery({
    queryKey: ['patient-consultations', id],
    queryFn: () => {
      if (!id) return [];
      return consultationsApi.get({ 
        pageNumber: 1,
        pageSize: 100,
        clientIds: [id], // Используем массив clientIds
        order: '-createdAt'
      });
    },
    enabled: !!id && !!patientData,
  });

  // Преобразуем данные пациента в формат для отображения
  const patient = patientData ? {
    id: String(patientData.id),
    firstName: patientData.firstName,
    lastName: patientData.lastName,
    phone: patientData.phone || '',
    lastVisit: patientData.createdAt || new Date().toISOString(),
    summary: patientData.comment || '',
    avatar: `${patientData.firstName[0]}${patientData.lastName[0]}`.toUpperCase(),
  } : null;

  // Функция для конвертации UTC времени в московское время (UTC+3)
  const convertToMoscowTime = (timeSource: string | undefined): { dateObj: Date | null; moscowHours: number; moscowMinutes: number } => {
    if (!timeSource) {
      return { dateObj: null, moscowHours: 0, moscowMinutes: 0 };
    }
    
    try {
      let parsedDate: Date;
      if (timeSource.includes('+00:00') || timeSource.endsWith('Z')) {
        parsedDate = new Date(timeSource);
      } else {
        const utcString = timeSource.endsWith('Z') ? timeSource : timeSource.replace(/\+00:00$/, 'Z');
        parsedDate = new Date(utcString);
      }
      
      if (isNaN(parsedDate.getTime())) {
        return { dateObj: null, moscowHours: 0, moscowMinutes: 0 };
      }
      
      const utcHours = parsedDate.getUTCHours();
      const utcMinutes = parsedDate.getUTCMinutes();
      const moscowHours = (utcHours + 3) % 24;
      const moscowMinutes = utcMinutes;
      
      const utcTime = parsedDate.getTime();
      const moscowOffset = 3 * 60 * 60 * 1000;
      const moscowTime = new Date(utcTime + moscowOffset);
      
      return { dateObj: moscowTime, moscowHours, moscowMinutes };
    } catch (error) {
      console.error(`[Patient] Error parsing date: ${timeSource}`, error);
      return { dateObj: null, moscowHours: 0, moscowMinutes: 0 };
    }
  };

  // Преобразуем консультации в формат для отображения, сохраняя все данные из API
  const consultations: (ConsultationResponse & { dateObj: Date | null; moscowHours: number; moscowMinutes: number })[] =
    consultationsData.map((c: ConsultationResponse) => {
      const timeSource = c.createdAt || c.date;
      const { dateObj, moscowHours, moscowMinutes } = convertToMoscowTime(timeSource);
      
      return {
        ...c,
        id: String(c.id),
        patientId: c.patientId ? String(c.patientId) : c.clientId ? String(c.clientId) : undefined,
        dateObj,
        moscowHours,
        moscowMinutes,
      };
    });

  // Получаем текстовое превью консультации для карточки истории пациента
  const getConsultationPreview = (consultation: ConsultationResponse): string => {
    // 1. Предпочитаем выжимку
    if (consultation.summary && consultation.summary.trim() !== '') {
      return consultation.summary;
    }

    // 2. Затем транскрипцию
    if (consultation.transcript && consultation.transcript.trim() !== '') {
      return consultation.transcript;
    }

    // 3. Если есть properties — ищем первую непустую секцию от бэкенда
    if (consultation.properties && consultation.properties.length > 0) {
      const priorityKeys = [
        'summary',
        'diagnosis',
        'disease_anamnesis',
        'treatment',
        'recommendations',
        'complaints',
        'objective',
        'treatment_plan',
        'examination_results',
      ];

      const byKey = new Map<string, ConsultationProperty[]>();
      consultation.properties.forEach((p) => {
        const key = p.parent?.key;
        if (!key) return;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(p);
      });

      // Сначала пробуем пройтись по приоритетным ключам
      for (const key of priorityKeys) {
        const props = byKey.get(key);
        if (!props) continue;

        const sorted = props
          .slice()
          .sort((a, b) => {
            const orderA = typeof a.parent?.order === 'number' ? a.parent!.order : 0;
            const orderB = typeof b.parent?.order === 'number' ? b.parent!.order : 0;
            return orderA - orderB;
          });

        const withValue = sorted.find((p) => (p.value ?? '').trim() !== '');
        if (withValue && withValue.value) {
          return withValue.value.trim();
        }
      }

      // Если по приоритету ничего не нашли — берём первую непустую секцию по order
      const firstNonEmpty = consultation.properties
        .slice()
        .sort((a, b) => {
          const orderA = typeof a.parent?.order === 'number' ? a.parent!.order : 0;
          const orderB = typeof b.parent?.order === 'number' ? b.parent!.order : 0;
          return orderA - orderB;
        })
        .find((p) => (p.value ?? '').trim() !== '');

      if (firstNonEmpty && firstNonEmpty.value) {
        return firstNonEmpty.value.trim();
      }
    }

    return '';
  };

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

  // Состояния загрузки и ошибок
  if (isLoadingPatient) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Загрузка данных пациента...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (patientError || !patient) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <div className="text-center py-20">
            <h2 className="text-xl font-bold mb-2">Пациент не найден</h2>
            <p className="text-muted-foreground">Пациент с ID {id} не найден</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">Вернуться к списку</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex flex-col gap-8 px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary mb-4 gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              К списку пациентов
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-card p-3 sm:p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2rem] border border-border/50 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full md:w-auto min-w-0">
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] text-lg sm:text-xl md:text-2xl font-bold bg-secondary shrink-0">
                <AvatarFallback className="rounded-2xl md:rounded-[1.5rem]">{patient.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold tracking-tight mb-2 truncate">{patient.firstName} {patient.lastName}</h1>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                  <span 
                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full bg-secondary/50 border border-border/50 whitespace-nowrap cursor-pointer hover:bg-secondary/70 hover:text-foreground transition-colors group/phone"
                    onClick={() => handleCopyPhone(patient.phone)}
                    title="Нажмите, чтобы скопировать номер"
                  >
                    <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> 
                    <span className="truncate max-w-[120px] sm:max-w-none">{patient.phone}</span>
                    <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
                  </span>
                  {patientData?.birthDate && (() => {
                    try {
                      // Парсим дату (может быть в формате YYYY-MM-DD или ISO)
                      const dateStr = patientData.birthDate.split('T')[0]; // Берем только дату без времени
                      const date = new Date(dateStr + 'T00:00:00'); // Добавляем время для корректного парсинга
                      if (!isNaN(date.getTime())) {
                        return (
                          <span className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full bg-secondary/50 border border-border/50 whitespace-nowrap">
                            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                            <span>{format(date, 'd MMM yyyy', { locale: ru })}</span>
                          </span>
                        );
                      }
                    } catch (e) {
                      console.error('Error formatting date of birth:', e);
                    }
                    return null;
                  })()}
                  <span className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full bg-secondary/50 border border-border/50 whitespace-nowrap">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> <span className="hidden xs:inline">С </span>{format(new Date(patient.lastVisit), 'MMM yyyy', { locale: ru })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2 md:gap-3 w-full md:w-auto shrink-0">
              <Link href={`/patient/${patient.id}/edit`} className="flex-1 md:flex-none min-w-0">
                <Button variant="outline" className="w-full md:w-auto rounded-xl h-10 sm:h-11 md:h-12 border-border/50 text-xs sm:text-sm md:text-base px-3 sm:px-4">
                Редактировать
              </Button>
              </Link>
              <Link href={`/record?patientId=${patient.id}`} className="flex-1 md:flex-none min-w-0">
                <Button className="w-full md:w-auto rounded-xl h-10 sm:h-11 md:h-12 gap-1.5 sm:gap-2 shadow-lg shadow-primary/20 text-xs sm:text-sm md:text-base px-3 sm:px-4">
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline truncate">Новая консультация</span>
                  <span className="sm:hidden truncate">Консультация</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs defaultValue="consultations" className="w-full">
          <div className="flex justify-start mb-6">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-xl bg-muted/50 p-1 text-muted-foreground border border-border/50">
              <TabsTrigger 
                value="consultations" 
                className="px-4 md:px-6 py-2 text-sm md:text-base font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                История консультаций
              </TabsTrigger>
              <TabsTrigger 
                value="medical-record"
                className="px-4 md:px-6 py-2 text-sm md:text-base font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Карта пациента
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="consultations" className="space-y-6 mt-0">
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Sidebar - Notes (первым на мобильных, вторым на десктопе) */}
          <div className="order-1 lg:order-2 space-y-4 md:space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-display font-bold">Заметки врача</h2>
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </div>
              )}
              {isSaved && !isSaving && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  <span>Сохранено</span>
                </div>
              )}
            </div>
            <Card className="border-border/50 rounded-3xl shadow-sm overflow-hidden">
              <Textarea 
                ref={textareaRef}
                placeholder="Добавить личные заметки о пациенте..." 
                className={cn(
                  "min-h-[200px] w-full border-none resize-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent p-4 text-sm leading-relaxed break-words transition-colors overflow-hidden",
                  isSaving && "opacity-70"
                )}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  // Автоматически изменяем высоту при вводе
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                  }
                }}
                disabled={isLoadingPatient || !patientData}
                rows={1}
              />
            </Card>
          </div>

          {/* Main Content - History (вторым на мобильных, первым на десктопе) */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-display font-bold">История консультаций</h2>
            <div className="space-y-6 md:space-y-8">
              {isLoadingConsultations ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Загрузка консультаций...</p>
                </div>
              ) : (
                <>
              {consultations.map(consultation => (
                <div key={consultation.id}>
                  <Link href={`/consultation/${consultation.id}`} className="block">
                    <Card className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 rounded-3xl overflow-hidden hover:border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold">{getConsultationTypeName(consultation.type)}</div>
                            <div className="text-xs text-muted-foreground flex flex-col md:flex-row md:items-center md:gap-2 md:flex-wrap">
                              <span>
                                {consultation.dateObj ? (
                                  <>
                                    {format(consultation.dateObj, 'd MMMM yyyy', { locale: ru })} • {String(consultation.moscowHours).padStart(2, '0')}:{String(consultation.moscowMinutes).padStart(2, '0')}
                                  </>
                                ) : (
                                  consultation.date ? format(new Date(consultation.date), 'd MMMM yyyy • HH:mm', { locale: ru }) : '---'
                                )}
                              </span>
                              {consultation.duration && (
                                <>
                                  <span className="hidden md:inline">•</span>
                                  <span>Длительность: {consultation.duration}</span>
                                </>
                              )}
                              {consultation.doctorName && (
                                <>
                                  <span className="hidden md:inline">•</span>
                                  <span className="flex items-center gap-1.5">
                                    <Avatar className="w-5 h-5 flex-shrink-0 hidden md:inline-flex">
                                      <AvatarImage src="/doctor.png" alt="Врач" />
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        Д
                                      </AvatarFallback>
                                    </Avatar>
                                    <img
                                      src="/doctor.png"
                                      alt="Врач"
                                      className="w-3.5 h-3.5 rounded-full object-cover md:hidden"
                                    />
                                    <span>Врач: {consultation.doctorName}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Статус обработки */}
                          {(() => {
                            // Определяем статус с приоритетом: status > processingStatus
                            let status: ConsultationProcessingStatus;
                            
                            if (typeof consultation.status === 'number') {
                              status = consultation.status;
                            } else if (typeof consultation.status === 'string') {
                              const parsed = parseInt(consultation.status, 10);
                              status = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
                            } else if (typeof consultation.processingStatus === 'number') {
                              status = consultation.processingStatus;
                            } else if (typeof consultation.processingStatus === 'string') {
                              const parsed = parseInt(consultation.processingStatus, 10);
                              status = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
                            } else {
                              status = ConsultationProcessingStatus.None;
                            }
                            
                            // Дополнительная проверка: если есть данные консультации, считаем готовой
                            const hasData = consultation.summary || 
                                            consultation.complaints || 
                                            consultation.objective || 
                                            consultation.treatmentPlan ||
                                            consultation.transcriptionResult;
                            
                            // Если статус Completed или есть данные - консультация готова, не показываем индикатор
                            if (status === ConsultationProcessingStatus.Completed || hasData) {
                              return null; // Не показываем индикатор для готовых консультаций
                            }
                            
                            // Показываем индикатор только для InProgress или None
                            if (status === ConsultationProcessingStatus.InProgress || 
                                status === ConsultationProcessingStatus.None) {
                              return (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                  <span className="text-xs font-medium text-primary">{getStatusText(status)}</span>
                                </div>
                              );
                            }
                            
                            // Показываем ошибку для Failed
                            if (status === ConsultationProcessingStatus.Failed) {
                              return (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                                  <AlertCircle className="w-3 h-3 text-destructive" />
                                  <span className="text-xs font-medium text-destructive">{getStatusText(status)}</span>
                                </div>
                              );
                            }
                            
                            return null;
                          })()}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 pl-[3.25rem]">
                        {getConsultationPreview(consultation) || 'Нет описания'}
                      </p>
                      <div className="pl-[3.25rem]">
                         <Button variant="link" className="p-0 h-auto text-primary gap-1 group-hover:underline">
                           Открыть отчет <ArrowLeft className="w-3 h-3 rotate-180" />
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                </div>
              ))}
              
              {consultations.length === 0 && (
                <div className="text-center py-12 bg-secondary/20 rounded-3xl border border-dashed border-border">
                  <p className="text-muted-foreground">Консультаций пока нет.</p>
                  <Link href={`/record?patientId=${patient.id}`}>
                    <Button variant="link" className="mt-2">Начать первую консультацию</Button>
                  </Link>
                </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="medical-record" className="space-y-6 mt-0">
            <div className="space-y-6">
              <h2 className="text-lg md:text-xl font-display font-bold">Карта пациента</h2>
              
              <div className="grid grid-cols-1 gap-6">
                {/* Аллергия */}
                <MedicalRecordSection
                  title="Аллергия"
                  content={medicalRecordFields.allergy}
                  onChange={(value) => handleMedicalRecordFieldChange('allergy', 'Аллергия', value)}
                  placeholder="Добавить информацию об аллергии..."
                  savingStatus={savingStatus.allergy}
                  textareaRef={medicalRecordRefs.allergy}
                  disabled={isLoadingPatient || !patientData}
                />

                {/* Сопутствующие заболевания */}
                <MedicalRecordSection
                  title="Сопутствующие заболевания"
                  content={medicalRecordFields.comorbidities}
                  onChange={(value) => handleMedicalRecordFieldChange('comorbidities', 'Сопутствующие заболевания', value)}
                  placeholder="Добавить информацию о сопутствующих заболеваниях..."
                  savingStatus={savingStatus.comorbidities}
                  textareaRef={medicalRecordRefs.comorbidities}
                  disabled={isLoadingPatient || !patientData}
                />

                {/* Анамнез */}
                <MedicalRecordSection
                  title="Анамнез"
                  content={medicalRecordFields.anamnesis}
                  onChange={(value) => handleMedicalRecordFieldChange('anamnesis', 'Анамнез', value)}
                  placeholder="Добавить информацию об анамнезе..."
                  savingStatus={savingStatus.anamnesis}
                  textareaRef={medicalRecordRefs.anamnesis}
                  disabled={isLoadingPatient || !patientData}
                />

                {/* Жалобы */}
                <MedicalRecordSection
                  title="Жалобы"
                  content={medicalRecordFields.complaints}
                  onChange={(value) => handleMedicalRecordFieldChange('complaints', 'Жалобы', value)}
                  placeholder="Добавить жалобы пациента..."
                  savingStatus={savingStatus.complaints}
                  textareaRef={medicalRecordRefs.complaints}
                  disabled={isLoadingPatient || !patientData}
                />

                {/* Диагноз */}
                <MedicalRecordSection
                  title="Диагноз"
                  content={medicalRecordFields.diagnosis}
                  onChange={(value) => handleMedicalRecordFieldChange('diagnosis', 'Диагноз', value)}
                  placeholder="Добавить диагноз..."
                  savingStatus={savingStatus.diagnosis}
                  textareaRef={medicalRecordRefs.diagnosis}
                  disabled={isLoadingPatient || !patientData}
                />

                {/* Лечение */}
                <MedicalRecordSection
                  title="Лечение"
                  content={medicalRecordFields.treatment}
                  onChange={(value) => handleMedicalRecordFieldChange('treatment', 'Лечение', value)}
                  placeholder="Добавить информацию о лечении..."
                  savingStatus={savingStatus.treatment}
                  textareaRef={medicalRecordRefs.treatment}
                  disabled={isLoadingPatient || !patientData}
                />

                {/* Другая информация */}
                <MedicalRecordSection
                  title="Другая информация"
                  content={medicalRecordFields.otherInfo}
                  onChange={(value) => handleMedicalRecordFieldChange('otherInfo', 'Другая информация', value)}
                  placeholder="Добавить другую информацию..."
                  savingStatus={savingStatus.otherInfo}
                  textareaRef={medicalRecordRefs.otherInfo}
                  disabled={isLoadingPatient || !patientData}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function MedicalRecordSection({ 
  title,
  content, 
  onChange,
  placeholder = '',
  savingStatus,
  textareaRef,
  disabled = false,
  className = ''
}: { 
  title: string;
  content: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  savingStatus?: { isSaving: boolean; isSaved: boolean };
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  disabled?: boolean;
  className?: string;
}) {
  const { toast } = useToast();

  // Автоматическое изменение высоты textarea при изменении содержимого
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, textareaRef]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
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

    // Fallback для старых браузеров
    try {
      const textArea = document.createElement('textarea');
      textArea.value = content;
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
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, content.length);
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
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
    <Card className={cn("rounded-3xl border-border/50 transition-all hover:border-primary/20 overflow-hidden", className)}>
      <div className="p-4 pb-2 border-b border-border/50">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold">{title}</h3>
              {savingStatus?.isSaving && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in slide-in-from-right-2 duration-200">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Сохранение...</span>
                </div>
              )}
              {savingStatus?.isSaved && !savingStatus?.isSaving && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-medium text-green-600 animate-in fade-in slide-in-from-right-2 duration-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранено</span>
                </div>
              )}
            </div>
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
          </div>
        </div>
      </div>
      <div className="relative">
        <Textarea 
          ref={textareaRef}
          className={cn(
            "min-h-[120px] w-full border-none resize-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent pt-4 pl-4 pr-4 pb-4 text-base leading-relaxed break-words overflow-hidden transition-colors",
            "text-foreground focus:text-foreground",
            savingStatus?.isSaving && "opacity-70"
          )}
          value={content || ''}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
        />
      </div>
    </Card>
  );
}