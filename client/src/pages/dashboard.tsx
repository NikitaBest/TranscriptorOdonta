import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Mic, ChevronRight, Calendar, Phone, Loader2, Copy, Filter } from 'lucide-react';
import { Patient } from '@/lib/mock-data';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ru } from 'date-fns/locale';
import { patientsApi } from '@/lib/api/patients';
import type { ApiError, PatientResponse } from '@/lib/api/types';
import { formatDateForDisplay } from '@/lib/utils/date';
import { formatPatientFullName } from '@/lib/utils/patient-display';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const patientFilterLabelClass = 'text-muted-foreground text-xs font-normal leading-none sm:text-sm';
const patientFilterControlClass =
  'min-w-0 bg-background px-2.5 font-normal text-sm leading-snug shadow-sm placeholder:text-muted-foreground sm:px-3';
const patientFilterFieldHeightClass = 'h-10 min-h-10 sm:h-11 sm:min-h-11 md:h-10 md:min-h-0';
type PatientsConsultationOrder = '-lastVisitedAt' | 'lastVisitedAt';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastNameFilter, setLastNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [consultationOrder, setConsultationOrder] =
    useState<PatientsConsultationOrder>('-lastVisitedAt');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const PATIENTS_PAGE_SIZE = 20;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  // Постраничная загрузка пациентов
  const {
    data: patientsPages,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['patients', 'infinite', debouncedSearch, consultationOrder],
    queryFn: async ({ pageParam }) => {
      console.log('[Dashboard] Запрос списка пациентов, страница:', pageParam);
      return patientsApi.getPatientsPage({
        page: pageParam,
        pageNumber: pageParam,
        pageSize: PATIENTS_PAGE_SIZE,
        order: consultationOrder,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasNext) return undefined;

      // Защита от зацикливания: если новая страница не принесла новых id, прекращаем подгрузку
      const seenIds = new Set<string>();
      for (let i = 0; i < allPages.length - 1; i += 1) {
        allPages[i].data.forEach((p) => seenIds.add(String(p.id)));
      }
      const hasNewPatients = lastPage.data.some((p) => !seenIds.has(String(p.id)));

      return hasNewPatients ? allPages.length + 1 : undefined;
    },
    staleTime: 30000,
    // При возврате на вкладку/страницу пациентов всегда запрашиваем актуальные данные.
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '180px', threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const patientsData = useMemo(() => {
    const raw = patientsPages?.pages.flatMap((page) => page.data) ?? [];
    const unique = new Map<string, PatientResponse>();
    raw.forEach((patient) => {
      const id = String(patient.id);
      if (!unique.has(id)) unique.set(id, patient);
    });
    return Array.from(unique.values());
  }, [patientsPages]);
  const totalCount = patientsPages?.pages[0]?.totalCount;

  // Преобразуем данные из API в формат Patient для отображения
  const patients: (Patient & { birthDate?: string; createdAt?: string; lastVisitedAt?: string })[] = patientsData.map((p: PatientResponse) => ({
    id: String(p.id),
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName ?? undefined,
    phone: p.phone || '',
    lastVisit: p.lastVisitedAt || p.createdAt || new Date().toISOString(),
    summary: p.comment || 'Новый пациент',
    avatar: `${p.firstName[0]}${p.lastName[0]}`.toUpperCase(),
    birthDate: p.birthDate,
    createdAt: p.createdAt,
    lastVisitedAt: p.lastVisitedAt,
  }));

  // Локальные фильтры поверх порядка с бэкенда.
  const filteredPatients = useMemo(() => {
    const normalizedLastName = lastNameFilter.trim().toLowerCase();
    const normalizedPhone = phoneFilter.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesLastName =
        normalizedLastName.length === 0 ||
        patient.lastName.toLowerCase().includes(normalizedLastName);

      const matchesPhone =
        normalizedPhone.length === 0 ||
        (patient.phone || '').toLowerCase().includes(normalizedPhone);
      return matchesLastName && matchesPhone;
    });
  }, [
    patients,
    lastNameFilter,
    phoneFilter,
  ]);

  const handleCopyPhone = async (e: React.MouseEvent, phone: string) => {
    e.stopPropagation(); // Предотвращаем переход на страницу пациента
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


  return (
    <Layout>
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Пациенты</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Управление записями пациентов и консультациями.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
             <Link href="/record" className="flex-1 sm:flex-none">
              <Button variant="secondary" className="w-full sm:w-auto h-11 md:h-12 rounded-xl px-4 md:px-6 gap-2 font-medium text-sm md:text-base">
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">Быстрая заметка</span>
                <span className="sm:hidden">Заметка</span>
              </Button>
            </Link>
            
            <Link href="/patient/new" className="flex-1 sm:flex-none">
              <Button className="flex-1 sm:flex-none w-full sm:w-auto h-11 md:h-12 rounded-xl px-4 md:px-6 gap-2 font-medium shadow-lg shadow-primary/20 text-sm md:text-base">
                <Plus className="w-4 h-4" />
                Добавить пациента
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-2">
          <div className="flex items-stretch gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-4 md:h-5 md:w-5" />
              <Input
                placeholder={isMobile ? 'Поиск: имя, телефон, заметка' : 'Поиск пациента по имени, телефону или заметке...'}
                className="h-11 min-h-11 w-full rounded-2xl border-border/50 bg-white pl-9 pr-4 text-base shadow-sm placeholder:text-sm sm:h-12 sm:pl-10 sm:pr-4 sm:text-sm md:h-14 md:pl-12 md:pr-5 md:text-lg md:placeholder:text-base"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              aria-expanded={showFilters}
              aria-controls="patients-filters-panel"
              className={cn(
                'h-11 min-h-11 shrink-0 gap-1 rounded-2xl border-border/50 px-2.5 font-medium shadow-sm sm:h-12 sm:min-h-12 sm:gap-1.5 sm:px-3.5 md:h-14 md:min-h-14 md:px-4',
                showFilters && 'border-primary/35 bg-primary/[0.06]'
              )}
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" />
              <span className="whitespace-nowrap text-[0.6875rem] leading-tight sm:text-xs md:text-sm">
                Фильтры
              </span>
            </Button>
          </div>
        </div>
        {showFilters && (
          <div
            id="patients-filters-panel"
            className="rounded-2xl border border-border/50 bg-white p-3 shadow-sm sm:p-4 md:p-5"
          >
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12 lg:items-start lg:gap-x-4 lg:gap-y-4">
              <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-4">
                <Label className={patientFilterLabelClass}>Фамилия</Label>
                <Input
                  placeholder="Введите фамилию"
                  value={lastNameFilter}
                  onChange={(e) => setLastNameFilter(e.target.value)}
                  className={cn(patientFilterFieldHeightClass, patientFilterControlClass)}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-4">
                <Label className={patientFilterLabelClass}>Номер телефона</Label>
                <Input
                  placeholder="+7..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  className={cn(patientFilterFieldHeightClass, patientFilterControlClass)}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-4">
                <Label className={patientFilterLabelClass}>Сортировка консультаций</Label>
                <Select
                  value={consultationOrder}
                  onValueChange={(v) => {
                    if (v === '-lastVisitedAt' || v === 'lastVisitedAt') {
                      setConsultationOrder(v);
                    }
                  }}
                >
                  <SelectTrigger className={cn(patientFilterFieldHeightClass, patientFilterControlClass)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-lastVisitedAt">Сначала последние консультации</SelectItem>
                    <SelectItem value="lastVisitedAt">Сначала давние консультации</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-2">
                <Label
                  aria-hidden
                  className={cn(
                    patientFilterLabelClass,
                    'pointer-events-none hidden select-none text-transparent lg:block'
                  )}
                >
                  Сброс
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(patientFilterFieldHeightClass, 'w-full shrink-0 text-sm font-normal')}
                  onClick={() => {
                    setConsultationOrder('-lastVisitedAt');
                    setLastNameFilter('');
                    setPhoneFilter('');
                  }}
                >
                  Сбросить фильтры
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="text-xs md:text-sm text-muted-foreground -mt-4">
          {debouncedSearch ? (
            isLoading ? (
              <>Ищем пациентов по запросу "{debouncedSearch}"...</>
            ) : (
              <>
                По запросу "{debouncedSearch}" найдено: <span className="font-medium text-foreground">{filteredPatients.length}</span>
              </>
            )
          ) : (
            <>
              Показано пациентов: <span className="font-medium text-foreground">{filteredPatients.length}</span>
              {typeof totalCount === 'number' ? <> из <span className="font-medium text-foreground">{totalCount}</span></> : null}
            </>
          )}
        </div>

        {/* Patient Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Загрузка пациентов...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-bold mb-2">Ошибка загрузки</h3>
            <p className="text-muted-foreground mb-4">
              {(error as ApiError)?.message || 'Не удалось загрузить список пациентов'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
            >
              Попробовать снова
            </Button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">
              {search ? 'Пациенты не найдены' : 'Пациенты не найдены'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'Попробуйте изменить поисковый запрос' : 'Начните с добавления первого пациента'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {filteredPatients.map((patient) => {
                const fullName = formatPatientFullName({
                  firstName: patient.firstName,
                  lastName: patient.lastName,
                  middleName: patient.middleName,
                });
                const isLongName = fullName.length > 18;

                return (
                  <Link key={patient.id} href={`/patient/${patient.id}?from=/dashboard`}>
                    <Card className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 rounded-xl md:rounded-3xl overflow-hidden hover:border-primary/20">
                      <CardContent className="p-3 md:p-6">
                        <div className="flex items-start justify-between mb-2 md:mb-6">
                          <div className="flex items-center gap-2 md:gap-4 min-w-0">
                            <Avatar className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl bg-secondary text-secondary-foreground font-bold text-xs md:text-lg flex-shrink-0">
                              <AvatarFallback className="rounded-lg md:rounded-2xl">{patient.avatar}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h3
                                className={`font-bold leading-tight mb-0.5 md:mb-1 md:text-lg ${
                                  isLongName ? 'text-[11px]' : 'text-sm'
                                }`}
                              >
                                {fullName}
                              </h3>
                              {patient.phone?.trim() && (
                                <div
                                  className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group/phone relative z-10 truncate"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCopyPhone(e, patient.phone);
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  title="Нажмите, чтобы скопировать номер"
                                >
                                  <Phone className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />
                                  <span className="truncate">{patient.phone}</span>
                                  <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 opacity-0 group-hover/phone:opacity-100 transition-opacity flex-shrink-0 hidden md:inline" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden md:flex -mr-2 -mt-2">
                            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                          </div>
                        </div>

                        <div className="space-y-2 md:space-y-4">
                          <div className="bg-secondary/30 p-2 md:p-3 rounded-lg md:rounded-xl">
                            <p className="text-[10px] md:text-sm line-clamp-2 text-muted-foreground leading-snug md:leading-relaxed">
                              {patient.summary || 'Комментарий отсутствует'}
                            </p>
                          </div>
                          <div className="flex flex-col gap-0.5 md:gap-2">
                            {patient.birthDate && (
                              <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                                <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />
                                <span className="truncate">Рожд.: {formatDateForDisplay(patient.birthDate)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                              <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />
                              <span className="truncate">С {format(new Date(patient.lastVisit), 'd MMM yyyy', { locale: ru })}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
            <div ref={loadMoreRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center pt-4">
                <div className="inline-flex items-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Загружаем ещё пациентов...
                </div>
              </div>
            )}
            {hasNextPage && !isFetchingNextPage && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => fetchNextPage()}>
                  Показать ещё пациентов
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}