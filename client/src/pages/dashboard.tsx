import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function normalizeFilterDateRaw(raw: string): string {
  let s = raw.trim().replace(/\s+/g, '').replace(/,/g, '.');
  s = s.replace(/\.{2,}/g, '.').replace(/\/{2,}/g, '/').replace(/-{2,}/g, '-');
  return s;
}

function useYearFirstDigitGrouping(digits: string): boolean {
  if (digits.length < 4) return false;
  const yyyy = parseInt(digits.slice(0, 4), 10);
  const dd = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const dayFirstHeaderValid = dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12;
  const yearPlausible = yyyy >= 1900 && yyyy <= 2100;
  if (!yearPlausible) return false;
  if (!dayFirstHeaderValid) return true;
  if (mm > 12) return true;
  if (dd > 31) return true;
  return false;
}

function formatDigitsDayFirstWhileTyping(d: string): string {
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

function formatDigitsYearFirstWhileTyping(d: string): string {
  if (d.length <= 4) return d.slice(0, 4);
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}

function formatFilterDateWhileTyping(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 0) {
    return useYearFirstDigitGrouping(digits)
      ? formatDigitsYearFirstWhileTyping(digits)
      : formatDigitsDayFirstWhileTyping(digits);
  }
  return normalizeFilterDateRaw(trimmed).slice(0, 32);
}

function tryParseYmdFromCompactString(s: string): string | null {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const mo = Number(iso[2]);
    const d = Number(iso[3]);
    if (!isValidYmd(y, mo, d)) return null;
    return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  const ymdSep = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(s);
  if (ymdSep) {
    const y = Number(ymdSep[1]);
    const mo = Number(ymdSep[2]);
    const d = Number(ymdSep[3]);
    if (!isValidYmd(y, mo, d)) return null;
    return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  if (dmy) {
    const d = Number(dmy[1]);
    const mo = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (!isValidYmd(y, mo, d)) return null;
    return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  if (/^\d{8}$/.test(s)) {
    const yIso = Number(s.slice(0, 4));
    const mIso = Number(s.slice(4, 6));
    const dIso = Number(s.slice(6, 8));
    if (isValidYmd(yIso, mIso, dIso)) return `${yIso}-${pad2(mIso)}-${pad2(dIso)}`;
    const dEu = Number(s.slice(0, 2));
    const m2 = Number(s.slice(2, 4));
    const yEu = Number(s.slice(4, 8));
    if (isValidYmd(yEu, m2, dEu)) return `${yEu}-${pad2(m2)}-${pad2(dEu)}`;
  }
  return null;
}

function parseFilterDateToYmd(raw: string): string | null {
  const n = normalizeFilterDateRaw(raw);
  if (!n) return null;
  const candidates: string[] = [n];
  const dmy = n.match(/\d{1,2}[./-]\d{1,2}[./-]\d{4}/);
  if (dmy && !candidates.includes(dmy[0])) candidates.push(dmy[0]);
  const iso = n.match(/\d{4}-\d{1,2}-\d{1,2}/);
  if (iso && !candidates.includes(iso[0])) candidates.push(iso[0]);
  for (const c of candidates) {
    const ymd = tryParseYmdFromCompactString(c);
    if (ymd) return ymd;
  }
  return null;
}

function formatYmdAsRuDisplay(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
}

function commitFilterDateDisplay(raw: string): string {
  const ymd = parseFilterDateToYmd(raw);
  if (ymd) return formatYmdAsRuDisplay(ymd);
  return normalizeFilterDateRaw(raw);
}

const patientFilterLabelClass = 'text-muted-foreground text-xs font-normal leading-none sm:text-sm';
const patientFilterControlClass =
  'min-w-0 bg-background px-2.5 font-normal text-sm leading-snug shadow-sm placeholder:text-muted-foreground sm:px-3';
const patientFilterFieldHeightClass = 'h-10 min-h-10 sm:h-11 sm:min-h-11 md:h-10 md:min-h-0';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastNameFilter, setLastNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [createdDateFrom, setCreatedDateFrom] = useState('');
  const [createdDateTo, setCreatedDateTo] = useState('');
  const [consultationDateFrom, setConsultationDateFrom] = useState('');
  const [consultationDateTo, setConsultationDateTo] = useState('');
  const [createdDateFromTouched, setCreatedDateFromTouched] = useState(false);
  const [createdDateToTouched, setCreatedDateToTouched] = useState(false);
  const [consultationDateFromTouched, setConsultationDateFromTouched] = useState(false);
  const [consultationDateToTouched, setConsultationDateToTouched] = useState(false);
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

  const parsedCreatedDateFrom = useMemo(
    () => parseFilterDateToYmd(createdDateFrom),
    [createdDateFrom]
  );
  const parsedCreatedDateTo = useMemo(
    () => parseFilterDateToYmd(createdDateTo),
    [createdDateTo]
  );
  const parsedConsultationDateFrom = useMemo(
    () => parseFilterDateToYmd(consultationDateFrom),
    [consultationDateFrom]
  );
  const parsedConsultationDateTo = useMemo(
    () => parseFilterDateToYmd(consultationDateTo),
    [consultationDateTo]
  );

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
    queryKey: ['patients', 'infinite', debouncedSearch],
    queryFn: async ({ pageParam }) => {
      console.log('[Dashboard] Запрос списка пациентов, страница:', pageParam);
      return patientsApi.getPatientsPage({
        page: pageParam,
        pageNumber: pageParam,
        pageSize: PATIENTS_PAGE_SIZE,
        order: '-updatedAt',
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
    // Для длинного списка отключаем авто-перезапросы, чтобы лента не "прыгала" при скролле.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
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
  const patients: (Patient & { birthDate?: string; createdAt?: string; updatedAt?: string })[] = patientsData.map((p: PatientResponse) => ({
    id: String(p.id),
    firstName: p.firstName,
    lastName: p.lastName,
    middleName: p.middleName ?? undefined,
    phone: p.phone || '',
    lastVisit: p.createdAt || new Date().toISOString(),
    summary: p.comment || 'Новый пациент',
    avatar: `${p.firstName[0]}${p.lastName[0]}`.toUpperCase(),
    birthDate: p.birthDate,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const toDayStartMs = (value?: string | null): number | null => {
    if (!value) return null;
    const ms = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  const toDayEndMs = (value?: string | null): number | null => {
    if (!value) return null;
    const ms = new Date(`${value}T23:59:59.999`).getTime();
    return Number.isNaN(ms) ? null : ms;
  };

  // Локальные фильтры поверх порядка с бэкенда.
  const filteredPatients = useMemo(() => {
    const normalizedLastName = lastNameFilter.trim().toLowerCase();
    const normalizedPhone = phoneFilter.trim().toLowerCase();
    const createdFromMs = toDayStartMs(parsedCreatedDateFrom);
    const createdToMs = toDayEndMs(parsedCreatedDateTo);
    const consultationFromMs = toDayStartMs(parsedConsultationDateFrom);
    const consultationToMs = toDayEndMs(parsedConsultationDateTo);

    return patients.filter((patient) => {
      const matchesLastName =
        normalizedLastName.length === 0 ||
        patient.lastName.toLowerCase().includes(normalizedLastName);

      const matchesPhone =
        normalizedPhone.length === 0 ||
        (patient.phone || '').toLowerCase().includes(normalizedPhone);

      const createdMs = patient.createdAt ? new Date(patient.createdAt).getTime() : NaN;
      const matchesCreatedFrom =
        createdFromMs == null || (!Number.isNaN(createdMs) && createdMs >= createdFromMs);
      const matchesCreatedTo =
        createdToMs == null || (!Number.isNaN(createdMs) && createdMs <= createdToMs);

      // На клиенте используем updatedAt как "дату консультации/последней активности".
      const consultationMs = patient.updatedAt ? new Date(patient.updatedAt).getTime() : NaN;
      const matchesConsultationFrom =
        consultationFromMs == null ||
        (!Number.isNaN(consultationMs) && consultationMs >= consultationFromMs);
      const matchesConsultationTo =
        consultationToMs == null ||
        (!Number.isNaN(consultationMs) && consultationMs <= consultationToMs);

      return (
        matchesLastName &&
        matchesPhone &&
        matchesCreatedFrom &&
        matchesCreatedTo &&
        matchesConsultationFrom &&
        matchesConsultationTo
      );
    });
  }, [
    patients,
    lastNameFilter,
    phoneFilter,
    parsedCreatedDateFrom,
    parsedCreatedDateTo,
    parsedConsultationDateFrom,
    parsedConsultationDateTo,
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
              <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:contents">
                <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-2">
                  <Label className={patientFilterLabelClass}>Дата добавления: с</Label>
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder="ДД.ММ.ГГГГ"
                    value={createdDateFrom}
                    onChange={(e) => setCreatedDateFrom(formatFilterDateWhileTyping(e.target.value))}
                    onFocus={() => setCreatedDateFromTouched(false)}
                    onBlur={() => {
                      setCreatedDateFromTouched(true);
                      setCreatedDateFrom((v) => commitFilterDateDisplay(v));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    aria-invalid={
                      createdDateFromTouched &&
                      normalizeFilterDateRaw(createdDateFrom) !== '' &&
                      parsedCreatedDateFrom === null
                    }
                    className={cn(
                      patientFilterFieldHeightClass,
                      patientFilterControlClass,
                      createdDateFromTouched &&
                        normalizeFilterDateRaw(createdDateFrom) !== '' &&
                        parsedCreatedDateFrom === null &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {createdDateFromTouched &&
                    normalizeFilterDateRaw(createdDateFrom) !== '' &&
                    parsedCreatedDateFrom === null && (
                      <p role="alert" className="text-destructive text-[0.6875rem] leading-snug sm:text-xs">
                        Неверная дата. Примеры: 08.04.2026, 2026-04-08, 20260408.
                      </p>
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-2">
                  <Label className={patientFilterLabelClass}>Дата добавления: по</Label>
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder="ДД.ММ.ГГГГ"
                    value={createdDateTo}
                    onChange={(e) => setCreatedDateTo(formatFilterDateWhileTyping(e.target.value))}
                    onFocus={() => setCreatedDateToTouched(false)}
                    onBlur={() => {
                      setCreatedDateToTouched(true);
                      setCreatedDateTo((v) => commitFilterDateDisplay(v));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    aria-invalid={
                      createdDateToTouched &&
                      normalizeFilterDateRaw(createdDateTo) !== '' &&
                      parsedCreatedDateTo === null
                    }
                    className={cn(
                      patientFilterFieldHeightClass,
                      patientFilterControlClass,
                      createdDateToTouched &&
                        normalizeFilterDateRaw(createdDateTo) !== '' &&
                        parsedCreatedDateTo === null &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {createdDateToTouched &&
                    normalizeFilterDateRaw(createdDateTo) !== '' &&
                    parsedCreatedDateTo === null && (
                      <p role="alert" className="text-destructive text-[0.6875rem] leading-snug sm:text-xs">
                        Неверная дата. Примеры: 08.04.2026, 2026-04-08, 20260408.
                      </p>
                    )}
                </div>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:contents">
                <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-2">
                  <Label className={patientFilterLabelClass}>Дата консультации: с</Label>
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder="ДД.ММ.ГГГГ"
                    value={consultationDateFrom}
                    onChange={(e) => setConsultationDateFrom(formatFilterDateWhileTyping(e.target.value))}
                    onFocus={() => setConsultationDateFromTouched(false)}
                    onBlur={() => {
                      setConsultationDateFromTouched(true);
                      setConsultationDateFrom((v) => commitFilterDateDisplay(v));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    aria-invalid={
                      consultationDateFromTouched &&
                      normalizeFilterDateRaw(consultationDateFrom) !== '' &&
                      parsedConsultationDateFrom === null
                    }
                    className={cn(
                      patientFilterFieldHeightClass,
                      patientFilterControlClass,
                      consultationDateFromTouched &&
                        normalizeFilterDateRaw(consultationDateFrom) !== '' &&
                        parsedConsultationDateFrom === null &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {consultationDateFromTouched &&
                    normalizeFilterDateRaw(consultationDateFrom) !== '' &&
                    parsedConsultationDateFrom === null && (
                      <p role="alert" className="text-destructive text-[0.6875rem] leading-snug sm:text-xs">
                        Неверная дата. Примеры: 08.04.2026, 2026-04-08, 20260408.
                      </p>
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 lg:col-span-2">
                  <Label className={patientFilterLabelClass}>Дата консультации: по</Label>
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder="ДД.ММ.ГГГГ"
                    value={consultationDateTo}
                    onChange={(e) => setConsultationDateTo(formatFilterDateWhileTyping(e.target.value))}
                    onFocus={() => setConsultationDateToTouched(false)}
                    onBlur={() => {
                      setConsultationDateToTouched(true);
                      setConsultationDateTo((v) => commitFilterDateDisplay(v));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    aria-invalid={
                      consultationDateToTouched &&
                      normalizeFilterDateRaw(consultationDateTo) !== '' &&
                      parsedConsultationDateTo === null
                    }
                    className={cn(
                      patientFilterFieldHeightClass,
                      patientFilterControlClass,
                      consultationDateToTouched &&
                        normalizeFilterDateRaw(consultationDateTo) !== '' &&
                        parsedConsultationDateTo === null &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {consultationDateToTouched &&
                    normalizeFilterDateRaw(consultationDateTo) !== '' &&
                    parsedConsultationDateTo === null && (
                      <p role="alert" className="text-destructive text-[0.6875rem] leading-snug sm:text-xs">
                        Неверная дата. Примеры: 08.04.2026, 2026-04-08, 20260408.
                      </p>
                    )}
                </div>
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
                    setLastNameFilter('');
                    setPhoneFilter('');
                    setCreatedDateFrom('');
                    setCreatedDateTo('');
                    setConsultationDateFrom('');
                    setConsultationDateTo('');
                    setCreatedDateFromTouched(false);
                    setCreatedDateToTouched(false);
                    setConsultationDateFromTouched(false);
                    setConsultationDateToTouched(false);
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