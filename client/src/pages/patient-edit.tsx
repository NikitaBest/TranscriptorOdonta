import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { patientsApi } from '@/lib/api/patients';
import { useToast } from '@/hooks/use-toast';
import type { ApiError } from '@/lib/api/types';
import { normalizePhone, handlePhoneInput, formatPhoneForDisplay } from '@/lib/utils/phone';
import { normalizeDate, handleDateInput, isValidDate, formatDateForDisplay } from '@/lib/utils/date';

export default function PatientEditPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResizeComment = () => {
    if (commentTextareaRef.current) {
      commentTextareaRef.current.style.height = 'auto';
      commentTextareaRef.current.style.height = `${commentTextareaRef.current.scrollHeight}px`;
    }
  };

  // Загрузка данных пациента
  const { data: patientData, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => {
      if (!id) throw new Error('ID пациента не указан');
      return patientsApi.getById(id);
    },
    enabled: !!id,
  });

  // Заполняем форму данными пациента
  useEffect(() => {
    if (patientData) {
      setFirstName(patientData.firstName || '');
      setLastName(patientData.lastName || '');
      // Форматируем телефон для отображения
      setPhone(patientData.phone ? formatPhoneForDisplay(patientData.phone) : '');
      // Форматируем дату рождения для отображения (DD.MM.YYYY)
      setDateOfBirth(patientData.birthDate ? formatDateForDisplay(patientData.birthDate) : '');
      setComment(patientData.comment || '');
    }
  }, [patientData]);

  // Автоматическое изменение высоты поля комментария при изменении текста
  useEffect(() => {
    autoResizeComment();
  }, [comment]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id) {
      toast({
        title: "Ошибка",
        description: "ID пациента не указан",
        variant: "destructive",
      });
      return;
    }

    if (!firstName || !lastName) {
      toast({
        title: "Ошибка",
        description: "Заполните имя и фамилию пациента",
        variant: "destructive",
      });
      return;
    }

    // Валидация даты рождения, если она указана
    if (dateOfBirth && dateOfBirth.trim() !== '') {
      if (!isValidDate(dateOfBirth)) {
        toast({
          title: "Ошибка",
          description: "Неверный формат даты рождения. Используйте формат ДД.ММ.ГГГГ (например, 15.01.1990)",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload: Parameters<typeof patientsApi.update>[0] = {
        id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: dateOfBirth ? normalizeDate(dateOfBirth) : undefined,
        comment: comment.trim() || undefined,
      };
      if (phone?.trim()) {
        payload.phone = normalizePhone(phone);
      }
      const updatedPatient = await patientsApi.update(payload);

      // Обновляем кэш напрямую с новыми данными
      queryClient.setQueryData(['patient', id], {
        id: updatedPatient.id,
        firstName: updatedPatient.firstName,
        lastName: updatedPatient.lastName,
        phone: updatedPatient.phone,
        birthDate: updatedPatient.birthDate,
        comment: updatedPatient.comment,
        createdAt: updatedPatient.createdAt,
        updatedAt: updatedPatient.updatedAt,
      });
      
      // Инвалидируем запросы для обновления списка пациентов
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      toast({
        title: "Пациент обновлен",
        description: "Данные пациента успешно сохранены.",
      });

      // Возвращаемся на страницу пациента
      setLocation(`/patient/${id}`);
    } catch (err) {
      console.error('Update patient error:', err);
      
      const apiError = err as ApiError;
      const errorMessage =
        apiError.message ||
        apiError.errors?.firstName?.[0] ||
        apiError.errors?.lastName?.[0] ||
        apiError.errors?.phone?.[0] ||
        apiError.errors?.birthDate?.[0] ||
        "Произошла ошибка при обновлении пациента. Попробуйте еще раз.";

      toast({
        title: "Ошибка обновления",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      toast({
        title: "Ошибка",
        description: "ID пациента не указан",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      await patientsApi.delete(id);

      // Обновляем кэш
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.removeQueries({ queryKey: ['patient', id] });
      queryClient.removeQueries({ queryKey: ['patient-consultations', id] });

      toast({
        title: "Пациент удален",
        description: "Пациент успешно удален из системы.",
      });

      // Возвращаемся на список пациентов
      setLocation('/dashboard');
    } catch (err) {
      console.error('Delete patient error:', err);
      
      const apiError = err as ApiError;
      const errorMessage =
        apiError.message ||
        "Произошла ошибка при удалении пациента. Попробуйте еще раз.";

      toast({
        title: "Ошибка удаления",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Загрузка данных пациента...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !patientData) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto flex flex-col gap-8">
          <div className="text-center py-20">
            <h2 className="text-xl font-bold mb-2">Пациент не найден</h2>
            <p className="text-muted-foreground mb-4">Пациент с ID {id} не найден</p>
            <Link href="/dashboard">
              <Button variant="outline">Вернуться к списку</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Navigation & Header */}
        <div>
          <Link href={`/patient/${id}`}>
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary mb-4 gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Назад к пациенту
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
            Редактирование пациента
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Измените данные пациента и сохраните изменения
          </p>
        </div>

        {/* Form */}
        <Card className="rounded-3xl border-border/50 shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-display">Данные пациента</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid gap-3 sm:gap-4">
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="firstName" className="text-sm sm:text-base">Имя *</Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="lastName" className="text-sm sm:text-base">Фамилия *</Label>
                  <Input 
                    id="lastName" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base">Телефон</Label>
                  <Input 
                    id="phone" 
                    type="tel"
                    value={phone} 
                    onChange={e => setPhone(handlePhoneInput(e.target.value))} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    placeholder="+7 (999) 123-45-67"
                    disabled={isSaving}
                  />
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="dateOfBirth" className="text-sm sm:text-base">Дата рождения</Label>
                  <Input 
                    id="dateOfBirth" 
                    type="text"
                    value={dateOfBirth} 
                    onChange={e => setDateOfBirth(handleDateInput(e.target.value))} 
                    className="rounded-xl h-11 sm:h-12 text-sm sm:text-base"
                    placeholder="ДД.ММ.ГГГГ"
                    disabled={isSaving}
                  />
                  {dateOfBirth && !isValidDate(dateOfBirth) && (
                    <p className="text-xs text-destructive mt-1">
                      Неверный формат. Используйте ДД.ММ.ГГГГ (например, 15.01.1990)
                    </p>
                  )}
                </div>

                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="comment" className="text-sm sm:text-base">Комментарий</Label>
                  <Textarea
                    id="comment" 
                    ref={commentTextareaRef}
                    value={comment} 
                    onChange={e => setComment(e.target.value)} 
                    className="rounded-xl min-h-[80px] text-sm sm:text-base resize-none overflow-hidden"
                    placeholder="Дополнительная информация о пациенте"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-2 sm:gap-3">
                  <Link href={`/patient/${id}`} className="flex-1 min-w-0">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full rounded-xl h-11 sm:h-12 text-sm sm:text-base px-3 sm:px-4"
                      disabled={isSaving || isDeleting}
                    >
                      Отмена
                    </Button>
                  </Link>
                  <Button 
                    type="submit" 
                    className="flex-1 min-w-0 rounded-xl h-11 sm:h-12 text-sm sm:text-base px-3 sm:px-4"
                    disabled={isSaving || isDeleting}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                        <span className="truncate">Сохранение...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline truncate">Сохранить изменения</span>
                        <span className="sm:hidden truncate">Сохранить</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button"
                      variant="destructive" 
                      className="w-full rounded-xl h-11 sm:h-12 text-sm sm:text-base px-3 sm:px-4"
                      disabled={isSaving || isDeleting}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="truncate">Удалить пациента</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить пациента?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Вы уверены, что хотите удалить пациента <strong>{firstName} {lastName}</strong>? 
                        Это действие нельзя отменить. Все данные пациента будут безвозвратно удалены.
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
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

