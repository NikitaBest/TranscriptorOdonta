import { useState, useMemo, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { consultationsApi } from '@/lib/api/consultations';
import { patientsApi } from '@/lib/api/patients';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import type { ConsultationResponse } from '@/lib/api/types';
import { Search, Calendar, Filter, ArrowUpRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getAllSavedRecordings, type RecordingMetadata } from '@/lib/utils/audio-storage';

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [localRecordings, setLocalRecordings] = useState<RecordingMetadata[]>([]);
  const queryClient = useQueryClient();

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

  // Загрузка списка консультаций с автоматической проверкой статуса
  const { data: consultations = [], isLoading, error } = useQuery({
    queryKey: ['consultations', 'all'],
    queryFn: () => consultationsApi.get({
      pageNumber: 1,
      pageSize: 100, // Загружаем достаточно много для истории
      order: '-createdAt', // Сначала новые (по дате создания в убывающем порядке)
      // Не отправляем clientIds, чтобы получить все консультации
    }),
    // Автоматически обновляем список, если есть консультации в обработке
    refetchInterval: (query) => {
      const data = query.state.data as ConsultationResponse[] | undefined;
      if (data && data.length > 0) {
        // Проверяем, есть ли консультации в статусе обработки
        const hasProcessingConsultations = data.some(c => {
          const status = c.processingStatus ?? 
                        (c.status as ConsultationProcessingStatus) ?? 
                        ConsultationProcessingStatus.None;
          return status === ConsultationProcessingStatus.InProgress || 
                 status === ConsultationProcessingStatus.None;
        });
        
        // Если есть консультации в обработке, проверяем каждые 5 секунд
        if (hasProcessingConsultations) {
          return 5000; // 5 секунд
        }
      }
      
      // Также проверяем, если есть локальные записи, ожидающие отправки
      if (localRecordings.length > 0) {
        return 5000; // 5 секунд
      }
      
      return false; // Если все консультации готовы, не проверяем
    },
    refetchOnWindowFocus: true, // Обновляем при возврате на вкладку
  });

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
    patientsData.forEach(patient => {
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
      // Если уже есть patientName, оставляем как есть
      if (c.patientName) {
        return c;
      }
      
      // Если есть clientId, пытаемся найти пациента в мапе
      if (c.clientId && patientsMap.has(c.clientId)) {
        const patient = patientsMap.get(c.clientId)!;
        return {
          ...c,
          patientName: `${patient.firstName} ${patient.lastName}`,
        };
      }
      
      return c;
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

  // Получаем статус для отображения
  const getStatusInfo = (consultation: ConsultationResponse) => {
    const status = consultation.processingStatus ?? 
                  (consultation.status as ConsultationProcessingStatus) ?? 
                  ConsultationProcessingStatus.None;
    
    switch (status) {
      case ConsultationProcessingStatus.Completed:
        return { label: 'Готово', className: 'bg-green-50 text-green-700 border-green-200' };
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
            placeholder="Поиск по транскрипциям, выжимкам или именам..." 
            className="h-12 md:h-14 pl-10 md:pl-12 rounded-2xl bg-white border-border/50 shadow-sm text-base md:text-lg"
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

          {error && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-destructive">Ошибка загрузки</h3>
              <p className="text-muted-foreground">Не удалось загрузить консультации. Попробуйте обновить страницу.</p>
            </div>
          )}

          {!isLoading && !error && filteredConsultations.map((consultation) => {
            const statusInfo = getStatusInfo(consultation);
            const isLocal = localRecordings.some(r => r.id === consultation.id);
            
            const cardContent = (
              <Card className={cn(
                "group transition-all duration-300 border-border/50 rounded-3xl overflow-hidden",
                isLocal ? "cursor-default" : "cursor-pointer hover:shadow-md hover:border-primary/20"
              )}>
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                  {/* Date Box */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-secondary/50 rounded-2xl border border-border/50">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      {consultation.date ? format(new Date(consultation.date), 'MMM', { locale: ru }) : '---'}
                    </span>
                    <span className="text-xl font-display font-bold">
                      {consultation.date ? format(new Date(consultation.date), 'd') : '--'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className={cn("text-lg font-bold", !consultation.patientName && "text-muted-foreground italic")}>
                        {consultation.patientName || "Пациент не назначен"}
                      </h3>
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
                      {consultation.summary || consultation.transcript || (isLocal ? 'Запись сохранена локально и ожидает отправки' : 'Нет описания')}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      {consultation.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(new Date(consultation.date), 'HH:mm')}
                        </span>
                      )}
                      {consultation.duration && (
                        <span>Длительность: {consultation.duration}</span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {!isLocal && (
                    <div className="flex-shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity self-center">
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowUpRight className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
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