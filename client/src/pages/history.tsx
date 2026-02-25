import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOnline } from '@/hooks/use-online';
import { Layout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { consultationsApi } from '@/lib/api/consultations';
import { patientsApi } from '@/lib/api/patients';
import { ConsultationProcessingStatus, ConsultationType } from '@/lib/api/types';
import type { ConsultationResponse, ConsultationProperty, PatientResponse } from '@/lib/api/types';
import { Search, Filter, ArrowUpRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn, getConsultationRoleLabel } from '@/lib/utils';
import { getAllSavedRecordings, type RecordingMetadata } from '@/lib/utils/audio-storage';

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

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [localRecordings, setLocalRecordings] = useState<RecordingMetadata[]>([]);
  const queryClient = useQueryClient();
  const { isOffline } = useOnline();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Загрузка локальных записей из IndexedDB
  useEffect(() => {
    let previousCount = localRecordings.length;
    
    const loadLocalRecordings = async () => {
      try {
        const saved = await getAllSavedRecordings();
        
        // Если локальных записей стало меньше, инвалидируем кэш консультаций
        // (возможно, запись была отправлена и должна появиться в списке с сервера)
        if (saved.length < previousCount) {
          queryClient.invalidateQueries({ queryKey: ['consultations'] });
        }
        
        previousCount = saved.length;
        setLocalRecordings(saved);
      } catch (error) {
        console.error('Error loading local recordings:', error);
      }
    };

    loadLocalRecordings();
    
    // Обновляем каждые 5 секунд, чтобы видеть изменения
    const interval = setInterval(loadLocalRecordings, 5000);
    
    return () => clearInterval(interval);
  }, [queryClient]);

  const CONSULTATIONS_PAGE_SIZE = 10;

  // Постраничная загрузка консультаций (подгрузка при прокрутке)
  const {
    data: consultationsData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['consultations', 'infinite'],
    queryFn: ({ pageParam }) =>
      consultationsApi.getConsultationsPage({
        pageNumber: pageParam,
        pageSize: CONSULTATIONS_PAGE_SIZE,
        order: '-createdAt',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNext ? allPages.length + 1 : undefined,
    enabled: !isOffline,
    retry: (failureCount) => !isOffline && failureCount < 1,
    retryDelay: 2000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const pages = data?.pages ?? [];
      const allConsultations = pages.flatMap(p => p.data);
      const hasProcessing = allConsultations.some(c => {
        const status = c.processingStatus ?? (c.status as ConsultationProcessingStatus) ?? ConsultationProcessingStatus.None;
        return status === ConsultationProcessingStatus.InProgress || status === ConsultationProcessingStatus.None;
      });
      if (hasProcessing && pages.length <= 3) return 5000;
      if (localRecordings.length > 0) return 5000;
      return false;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    throwOnError: false,
  });

  // Собираем консультации из всех страниц и сохраняем createdAt из предыдущего кэша
  const consultations = useMemo(() => {
    const raw = consultationsData?.pages.flatMap(p => p.data) ?? [];
    const previousData = queryClient.getQueryData<{ pages: { data: ConsultationResponse[] }[] }>(['consultations', 'infinite']);
    const previousMap = new Map<string | number, ConsultationResponse>();
    if (previousData?.pages) {
      previousData.pages.flatMap(p => p.data).forEach(c => {
        if (c.id && c.createdAt) previousMap.set(c.id, c);
      });
    }
    return raw.map(c => {
      const previous = previousMap.get(c.id);
      const newCreatedAt = c.createdAt;
      if (newCreatedAt && !isNaN(new Date(newCreatedAt).getTime())) return c;
      if (previous?.createdAt && !isNaN(new Date(previous.createdAt).getTime())) {
        return { ...c, createdAt: previous.createdAt };
      }
      return c;
    });
  }, [consultationsData, queryClient]);

  // Подгрузка следующей страницы при прокрутке до конца списка
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isOffline) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isOffline]);

  // Собираем уникальные clientId из консультаций, у которых нет patientName
  const clientIdsToLoad = useMemo(() => {
    const ids = new Set<string | number>();
    consultations.forEach(c => {
      if (c.clientId && !c.patientName) {
        ids.add(c.clientId);
      }
    });
    return Array.from(ids);
  }, [consultations]);

  // Загружаем данные пациентов для консультаций, у которых нет имени
  const { data: patientsData = [] } = useQuery({
    queryKey: ['patients', 'batch', clientIdsToLoad],
    queryFn: async () => {
      if (clientIdsToLoad.length === 0) return [];
      // Загружаем данные пациентов параллельно
      const promises = clientIdsToLoad.map(id => 
        patientsApi.getById(id).catch(() => null)
      );
      const results = await Promise.all(promises);
      return results.filter(Boolean);
    },
    enabled: clientIdsToLoad.length > 0,
  });

  // Создаем мапу пациентов по ID
  const patientsMap = useMemo(() => {
    const map = new Map<string | number, { firstName: string; lastName: string }>();
    (patientsData as (PatientResponse | null)[]).forEach((patient: PatientResponse | null) => {
      if (patient) {
        map.set(patient.id, {
          firstName: patient.firstName,
          lastName: patient.lastName,
        });
      }
    });
    return map;
  }, [patientsData]);

  // Преобразуем локальные записи в формат консультаций для отображения
  const localConsultations: ConsultationResponse[] = useMemo(() => {
    return localRecordings.map(recording => ({
      id: recording.id,
      clientId: recording.patientId,
      patientId: recording.patientId,
      patientName: recording.patientName || undefined,
      date: new Date(recording.timestamp).toISOString(),
      duration: `${Math.floor(recording.duration / 60)}:${String(Math.floor(recording.duration % 60)).padStart(2, '0')}`,
      processingStatus: ConsultationProcessingStatus.InProgress, // Всегда "в обработке" для локальных
      status: ConsultationProcessingStatus.InProgress,
      summary: undefined,
      transcript: undefined,
      complaints: undefined,
      objective: undefined,
      plan: undefined,
      comments: undefined,
      audioUrl: undefined,
      createdAt: new Date(recording.timestamp).toISOString(),
      updatedAt: new Date(recording.timestamp).toISOString(),
    }));
  }, [localRecordings]);

  // Объединяем консультации с сервера и локальные, сортируем по дате
  const allConsultations = useMemo(() => {
    const combined = [...consultations, ...localConsultations];
    // Сортируем по дате создания (новые сначала)
    return combined.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [consultations, localConsultations]);

  // Обогащаем консультации именами пациентов
  const enrichedConsultations = useMemo(() => {
    return allConsultations.map(c => {
      const preservedCreatedAt = c.createdAt;
      
      if (c.patientName) {
        return {
          ...c,
          createdAt: preservedCreatedAt || c.createdAt,
        };
      }
      
      if (c.clientId && patientsMap.has(c.clientId)) {
        const patient = patientsMap.get(c.clientId)!;
        return {
          ...c,
          patientName: `${patient.firstName} ${patient.lastName}`,
          createdAt: preservedCreatedAt || c.createdAt,
        };
      }
      
      return {
        ...c,
        createdAt: preservedCreatedAt || c.createdAt,
      };
    });
  }, [allConsultations, patientsMap]);
  
  // Фильтрация консультаций по поисковому запросу
  const filteredConsultations = enrichedConsultations.filter(c => {
    const matchesSearch =
      (c.patientName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.summary?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.transcript?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (c.complaints?.toLowerCase().includes(search.toLowerCase()) ?? false);

    return matchesSearch;
  });

  // Получаем текстовое превью консультации для карточки
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
      // Приоритет по ключам, если они есть
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

      // 3.1. Пытаемся найти по приоритетным ключам
      for (const key of priorityKeys) {
        const props = byKey.get(key);
        if (!props) continue;
        // внутри ключа сортируем по order и берём первую с непустым value
        const sorted = props
          .slice()
          .sort((a, b) => {
            const orderA = typeof a.parent?.order === 'number' ? a.parent!.order : 0;
            const orderB = typeof b.parent?.order === 'number' ? b.parent!.order : 0;
            return orderA - orderB;
          });
        const withValue = sorted.find((p) => (p.value ?? '').trim() !== '');
        if (withValue) {
          return withValue.value!.trim();
        }
      }

      // 3.2. Если по приоритету ничего не нашли — берём первую непустую секцию по order
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

  // Получаем статус для отображения
  const getStatusInfo = (consultation: ConsultationResponse) => {
    // Определяем статус с приоритетом: status > processingStatus > None
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
    
    // Если статус Completed - консультация готова
    if (status === ConsultationProcessingStatus.Completed) {
      return { label: 'Готово', className: 'bg-green-50 text-green-700 border-green-200' };
    }
    
    switch (status) {
      case ConsultationProcessingStatus.InProgress:
        return { label: 'Обработка', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
      case ConsultationProcessingStatus.Failed:
        return { label: 'Ошибка', className: 'bg-red-50 text-red-700 border-red-200' };
      case ConsultationProcessingStatus.None:
        return { label: 'Ожидание', className: 'bg-secondary text-secondary-foreground border-border' };
      default:
        return { label: 'Неизвестно', className: 'bg-secondary text-secondary-foreground border-border' };
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">История консультаций</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Архив всех записанных сессий и отчетов.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          <Input 
            placeholder="Поиск по имени пациента" 
            className="h-12 md:h-14 pl-10 md:pl-12 rounded-2xl bg-white border-border/50 shadow-sm text-sm md:text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          {isLoading && (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Загрузка консультаций...</p>
            </div>
          )}

          {/* Показываем ошибку только если нет локальных записей и нет загруженных консультаций */}
          {error && !isLoading && consultations.length === 0 && localRecordings.length === 0 && !isOffline && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-destructive">Ошибка загрузки</h3>
              <p className="text-muted-foreground">Не удалось загрузить консультации. Попробуйте обновить страницу.</p>
            </div>
          )}

          {/* Показываем сообщение об оффлайн режиме, если нет интернета */}
          {isOffline && localRecordings.length === 0 && consultations.length === 0 && !isLoading && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">Оффлайн режим</h3>
              <p className="text-muted-foreground">Нет подключения к интернету. Локальные записи будут показаны после сохранения.</p>
            </div>
          )}

          {/* Показываем предупреждение, если есть ошибка, но есть локальные записи или загруженные консультации */}
          {(error || isOffline) && !isLoading && (consultations.length > 0 || localRecordings.length > 0) && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                {isOffline 
                  ? "📴 Работа в оффлайн режиме. Показаны локальные записи и ранее загруженные консультации. Записи будут отправлены автоматически при восстановлении соединения."
                  : "⚠️ Не удалось загрузить все консультации с сервера. Показаны локальные записи и ранее загруженные консультации."}
              </p>
            </div>
          )}

          {!isLoading && filteredConsultations.map((consultation) => {
            const statusInfo = getStatusInfo(consultation);
            const isLocal = localRecordings.some(r => r.id === consultation.id);
            
            // Используем createdAt из API (UTC формат), приоритет над date
            const timeSource = consultation.createdAt || consultation.date;
            
            // Конвертируем UTC время в московское время (UTC+3)
            let dateObj: Date | null = null;
            if (timeSource) {
              try {
                // Парсим строку как UTC время
                let parsedDate: Date;
                if (timeSource.includes('+00:00') || timeSource.endsWith('Z')) {
                  parsedDate = new Date(timeSource);
                } else {
                  const utcString = timeSource.endsWith('Z') ? timeSource : timeSource.replace(/\+00:00$/, 'Z');
                  parsedDate = new Date(utcString);
                }
                
                if (isNaN(parsedDate.getTime())) {
                  dateObj = null;
                } else {
                  // Вычисляем московское время напрямую из UTC (UTC+3)
                  const utcHours = parsedDate.getUTCHours();
                  const utcMinutes = parsedDate.getUTCMinutes();
                  const moscowHours = (utcHours + 3) % 24;
                  const moscowMinutes = utcMinutes;
                  
                  // Создаем Date объект для форматирования даты
                  const utcTime = parsedDate.getTime();
                  const moscowOffset = 3 * 60 * 60 * 1000;
                  const moscowTime = new Date(utcTime + moscowOffset);
                  
                  dateObj = moscowTime;
                  
                  // Сохраняем московское время для отображения
                  (dateObj as any).__moscowHours = moscowHours;
                  (dateObj as any).__moscowMinutes = moscowMinutes;
                }
              } catch (error) {
                console.error(`[History] Error parsing date: ${timeSource}`, error);
                dateObj = null;
              }
            }
            
            const cardContent = (
              <Card className={cn(
                "group transition-all duration-300 border-border/50 rounded-2xl md:rounded-3xl overflow-hidden",
                isLocal ? "cursor-default" : "cursor-pointer hover:shadow-md hover:border-primary/20"
              )}>
                <CardContent className="relative p-4 md:p-6">
                  {/* Mobile Layout: Date on left, Name and short info on right */}
                  <div className="flex md:hidden items-start gap-3">
                    {/* Date Box */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 bg-secondary/50 rounded-2xl border border-border/50">
                      <span className="text-xs font-bold uppercase text-muted-foreground">
                        {dateObj ? format(dateObj, 'MMM', { locale: ru }) : '---'}
                      </span>
                      <span className="text-lg font-display font-bold">
                        {dateObj ? format(dateObj, 'd') : '--'}
                      </span>
                    </div>

                    {/* Name, Status (mobile) and Details - all on the right */}
                    <div className="flex-1 min-w-0 space-y-1.5 pr-10 md:pr-0">
                      {/* Name and Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn("text-base font-bold", !consultation.patientName && "text-muted-foreground italic")}>
                          {consultation.patientName || "Пациент не назначен"}
                        </h3>
                        {consultation.type && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {getConsultationTypeName(consultation.type)}
                          </span>
                        )}
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 absolute right-4 top-4 md:static md:right-auto md:top-auto",
                            statusInfo.className
                          )}
                        >
                          {statusInfo.label}
                        </span>
                        {isLocal && (
                          <span className="text-xs text-muted-foreground italic flex-shrink-0">
                            (ожидает отправки)
                          </span>
                        )}
                      </div>

                      {/* Doctor */}
                      {consultation.doctorName && (
                        <p className="text-xs text-muted-foreground">
                          {getConsultationRoleLabel(consultation.roleAlias, consultation.clinicRole)}: {consultation.doctorName}
                        </p>
                      )}

                      {/* Time and Duration */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {dateObj && (
                          <span className="flex items-center gap-1">
                            <img
                              src="/time.png"
                              alt="Время консультации"
                              className="w-3 h-3"
                            /> {
                              // Используем московское время напрямую, если оно сохранено
                              (dateObj as any).__moscowHours !== undefined
                                ? `${String((dateObj as any).__moscowHours).padStart(2, '0')}:${String((dateObj as any).__moscowMinutes).padStart(2, '0')}`
                                : format(dateObj, 'HH:mm')
                            }
                          </span>
                        )}
                        {consultation.duration && (
                          <span>Длительность: {consultation.duration}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout: Date, Content, Action */}
                  <div className="hidden md:flex md:items-center gap-6">
                    {/* Date Box */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-secondary/50 rounded-2xl border border-border/50">
                      <span className="text-xs font-bold uppercase text-muted-foreground">
                        {dateObj ? format(dateObj, 'MMM', { locale: ru }) : '---'}
                      </span>
                      <span className="text-xl font-display font-bold">
                        {dateObj ? format(dateObj, 'd') : '--'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className={cn("text-lg font-bold", !consultation.patientName && "text-muted-foreground italic")}>
                          {consultation.patientName || "Пациент не назначен"}
                        </h3>
                        {consultation.type && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {getConsultationTypeName(consultation.type)}
                          </span>
                        )}
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          statusInfo.className
                        )}>
                          {statusInfo.label}
                        </span>
                        {isLocal && (
                          <span className="text-xs text-muted-foreground italic">
                            (ожидает отправки)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {isLocal
                          ? 'Запись сохранена локально и ожидает отправки'
                          : getConsultationPreview(consultation) || 'Нет описания'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                        {dateObj && (
                          <span className="flex items-center gap-1">
                            <img
                              src="/time.png"
                              alt="Время консультации"
                              className="w-3 h-3"
                            /> {
                              // Используем московское время напрямую, если оно сохранено
                              (dateObj as any).__moscowHours !== undefined
                                ? `${String((dateObj as any).__moscowHours).padStart(2, '0')}:${String((dateObj as any).__moscowMinutes).padStart(2, '0')}`
                                : format(dateObj, 'HH:mm')
                            }
                          </span>
                        )}
                        {consultation.duration && (
                          <span>Длительность: {consultation.duration}</span>
                        )}
                        {consultation.doctorName && (
                          <span>{getConsultationRoleLabel(consultation.roleAlias, consultation.clinicRole)}: {consultation.doctorName}</span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {!isLocal && (
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowUpRight className="w-5 h-5" />
                      </Button>
                      </div>
                    )}
                    </div>
                  </CardContent>
                </Card>
            );

            // Для локальных записей не делаем ссылку (они еще не на сервере)
            if (isLocal) {
              return (
                <div key={consultation.id} className="block mb-6 last:mb-0">
                  {cardContent}
                </div>
              );
            }

            return (
              <Link key={consultation.id} href={`/consultation/${consultation.id}`} className="block mb-6 last:mb-0">
                {cardContent}
              </Link>
            );
          })}

          {/* Сторожевой элемент для подгрузки следующей страницы при прокрутке */}
          {hasNextPage && !isLoading && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {isFetchingNextPage ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <span className="text-sm text-muted-foreground" />
              )}
            </div>
          )}

          {!isLoading && !error && filteredConsultations.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">
                {consultations.length === 0 ? 'Консультации не найдены' : 'Консультации не найдены по запросу'}
              </h3>
              <p className="text-muted-foreground">
                {consultations.length === 0 
                  ? 'У вас пока нет консультаций. Начните запись, чтобы создать первую консультацию.'
                  : 'Попробуйте изменить поисковый запрос.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}