import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Mic, ChevronRight, Calendar, Phone, Loader2, Copy } from 'lucide-react';
import { Patient } from '@/lib/mock-data';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ru } from 'date-fns/locale';
import { patientsApi } from '@/lib/api/patients';
import type { ApiError, PatientResponse } from '@/lib/api/types';
import { formatDateForDisplay } from '@/lib/utils/date';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Загрузка списка пациентов
  const { data: patientsData = [], isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      console.log('[Dashboard] Запрос списка пациентов...');
      try {
        const result = await patientsApi.get();
        console.log('[Dashboard] Получены пациенты:', result);
        return result;
      } catch (err) {
        console.error('[Dashboard] Ошибка при получении пациентов:', err);
        throw err;
      }
    },
    staleTime: 30000, // 30 секунд
    enabled: true, // Явно включаем запрос
  });

  // Преобразуем данные из API в формат Patient для отображения
  const patients: (Patient & { birthDate?: string })[] = patientsData.map((p: PatientResponse) => ({
    id: String(p.id),
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone || '',
    lastVisit: p.createdAt || new Date().toISOString(),
    summary: p.comment || 'Новый пациент',
    avatar: `${p.firstName[0]}${p.lastName[0]}`.toUpperCase(),
    birthDate: p.birthDate,
  }));

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(search.toLowerCase()) || 
    p.lastName.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

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
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          <Input 
            placeholder="Поиск по имени или телефону..." 
            className="h-12 md:h-14 pl-10 md:pl-12 rounded-2xl bg-white border-border/50 shadow-sm text-base md:text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
              onClick={() => queryClient.invalidateQueries({ queryKey: ['patients'] })}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
            <Link key={patient.id} href={`/patient/${patient.id}`}>
              <Card className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 rounded-3xl overflow-hidden hover:border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg">
                        <AvatarFallback className="rounded-2xl">{patient.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg leading-none mb-1">{patient.firstName} {patient.lastName}</h3>
                        <div 
                          className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors group/phone relative z-10"
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
                          <Phone className="w-3 h-3" />
                          <span>{patient.phone}</span>
                          <Copy className="w-3 h-3 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-secondary/30 p-3 rounded-xl">
                      <p className="text-sm line-clamp-2 text-muted-foreground leading-relaxed">
                        {patient.summary || 'Комментарий отсутствует'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {patient.birthDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Дата рождения: {formatDateForDisplay(patient.birthDate)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>С {format(new Date(patient.lastVisit), 'd MMM yyyy', { locale: ru })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          </div>
        )}
      </div>
    </Layout>
  );
}