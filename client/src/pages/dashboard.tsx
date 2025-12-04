import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Mic, ChevronRight, Calendar, Phone, Loader2 } from 'lucide-react';
import { Patient } from '@/lib/mock-data';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ru } from 'date-fns/locale';
import { patientsApi } from '@/lib/api/patients';
import type { ApiError, PatientResponse } from '@/lib/api/types';
import { normalizePhone, handlePhoneInput } from '@/lib/utils/phone';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
  const patients: Patient[] = patientsData.map((p: PatientResponse) => ({
    id: String(p.id),
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone || '',
    lastVisit: p.createdAt || new Date().toISOString(),
    summary: p.comment || 'Новый пациент',
    avatar: `${p.firstName[0]}${p.lastName[0]}`.toUpperCase(),
  }));

  // New patient form state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newComment, setNewComment] = useState('');

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(search.toLowerCase()) || 
    p.lastName.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const handleAddPatient = async () => {
    if (!newFirstName || !newLastName) {
      toast({
        title: "Ошибка",
        description: "Заполните имя и фамилию пациента",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await patientsApi.create({
        firstName: newFirstName,
        lastName: newLastName,
        phone: normalizePhone(newPhone),
        comment: newComment || undefined,
      });

      // Создаем объект пациента для отображения
      const newPatient: Patient = {
        id: response.id,
        firstName: response.firstName,
        lastName: response.lastName,
        phone: response.phone,
        lastVisit: response.createdAt || new Date().toISOString(),
        summary: "Регистрация нового пациента",
        avatar: `${response.firstName[0]}${response.lastName[0]}`.toUpperCase()
      };

      // Обновляем кэш React Query
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      
      // Закрываем диалог и очищаем форму
      setNewPatientOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewComment('');
      
      toast({
        title: "Пациент добавлен",
        description: `${response.firstName} ${response.lastName} добавлен в ваш список.`,
      });
    } catch (err) {
      console.error('Create patient error:', err);
      
      const apiError = err as ApiError;
      const errorMessage =
        apiError.message ||
        apiError.errors?.firstName?.[0] ||
        apiError.errors?.lastName?.[0] ||
        apiError.errors?.phone?.[0] ||
        "Произошла ошибка при создании пациента. Попробуйте еще раз.";

      toast({
        title: "Ошибка создания пациента",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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
            
            <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none w-full sm:w-auto h-11 md:h-12 rounded-xl px-4 md:px-6 gap-2 font-medium shadow-lg shadow-primary/20 text-sm md:text-base">
                  <Plus className="w-4 h-4" />
                  Добавить пациента
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-3xl pb-8 md:pb-6">
                <DialogHeader>
                  <DialogTitle className="text-xl md:text-2xl font-display">Новый пациент</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input 
                      id="firstName" 
                      value={newFirstName} 
                      onChange={e => setNewFirstName(e.target.value)} 
                      className="rounded-xl h-11"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input 
                      id="lastName" 
                      value={newLastName} 
                      onChange={e => setNewLastName(e.target.value)} 
                      className="rounded-xl h-11"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      value={newPhone} 
                      onChange={e => setNewPhone(handlePhoneInput(e.target.value))} 
                      className="rounded-xl h-11" 
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="comment">Комментарий (необязательно)</Label>
                    <Input 
                      id="comment" 
                      value={newComment} 
                      onChange={e => setNewComment(e.target.value)} 
                      className="rounded-xl h-11"
                      placeholder="Дополнительная информация о пациенте"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleAddPatient} 
                    className="w-full rounded-xl h-11 md:h-12"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      'Создать профиль'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {patient.phone}
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(patient.lastVisit), 'd MMM yyyy', { locale: ru })}
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