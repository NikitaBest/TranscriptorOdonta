import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authApi } from '@/lib/api/auth';
import { ApiClient } from '@/lib/api/client';
import { userApi } from '@/lib/api/user';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError, UserProfile } from '@/lib/api/types';
import { normalizePhone, handlePhoneInput } from '@/lib/utils/phone';
import { normalizeDate, handleDateInput, isValidDate, formatDateForDisplay } from '@/lib/utils/date';
import { Loader2, Mail, Lock, CheckCircle2, XCircle, ArrowLeft, User, Save } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Загружаем данные текущего пользователя (базовые)
  const { data: currentUser, isLoading: isLoadingUser, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    retry: false,
  });

  // Загружаем полный профиль пользователя
  const { data: userProfile, isLoading: isLoadingProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => userApi.getProfile(),
    retry: false,
  });

  // Состояния формы для редактирования профиля
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    middleName: string;
    phoneNumber: string;
    birthDate: string;
    gender: number | null;
    hiddenDescription: string;
  }>({
    firstName: '',
    lastName: '',
    middleName: '',
    phoneNumber: '',
    birthDate: '',
    gender: null,
    hiddenDescription: '',
  });


  // Синхронизируем форму с данными профиля
  useEffect(() => {
    if (userProfile) {
      // Форматируем дату для отображения (из YYYY-MM-DD в DD.MM.YYYY)
      const birthDateDisplay = userProfile.birthDate 
        ? formatDateForDisplay(userProfile.birthDate) 
        : '';
      
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        middleName: userProfile.middleName || '',
        phoneNumber: userProfile.phoneNumber || '',
        birthDate: birthDateDisplay, // Храним в формате DD.MM.YYYY для отображения
        gender: userProfile.gender ?? null,
        hiddenDescription: userProfile.hiddenDescription || '',
      });
    }
  }, [userProfile]);

  // Обновляем данные пользователя при изменении localStorage (например, после подтверждения email)
  useEffect(() => {
    const handleStorageChange = () => {
      refetchUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Также проверяем периодически (на случай если данные изменились в той же вкладке)
    const interval = setInterval(() => {
      refetchUser();
    }, 2000); // Проверяем каждые 2 секунды
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [refetchUser]);

  const handleResendConfirmation = async () => {
    if (!currentUser?.email) {
      toast({
        title: 'Ошибка',
        description: 'Email не найден',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingConfirmation(true);
    try {
      // Отправляем тот же запрос, что и при регистрации, чтобы бэкенд повторно выслал письмо подтверждения
      // Бэкенд должен корректно обрабатывать повторный вызов /auth/register для уже существующего пользователя
      await ApiClient.post('auth/register', {
        email: currentUser.email,
      });

      toast({
        title: 'Письмо отправлено',
        description: 'Ссылка для подтверждения email повторно отправлена на ваш адрес.',
      });
    } catch (err) {
      console.error('Resend confirmation error:', err);
      const apiError = err as ApiError;
      toast({
        title: 'Ошибка',
        description: apiError.message || 'Не удалось отправить письмо подтверждения',
        variant: 'destructive',
      });
    } finally {
      setIsSendingConfirmation(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!currentUser?.email) {
      toast({
        title: 'Ошибка',
        description: 'Email не найден',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingPasswordReset(true);
    try {
      const response = await authApi.resetPassword({
        email: currentUser.email,
      });

      if (response.isSuccess) {
        toast({
          title: 'Письмо отправлено',
          description: 'Ссылка для сброса пароля отправлена на ваш email адрес.',
        });
      } else {
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось отправить письмо. Попробуйте еще раз.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Request password reset error:', err);
      const apiError = err as ApiError;
      toast({
        title: 'Ошибка',
        description: apiError.message || 'Не удалось отправить письмо. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile?.id) {
      toast({
        title: 'Ошибка',
        description: 'Профиль пользователя не загружен',
        variant: 'destructive',
      });
      return;
    }

    // Валидация даты рождения, если она указана
    if (formData.birthDate && formData.birthDate.trim() !== '') {
      if (!isValidDate(formData.birthDate)) {
        toast({
          title: 'Ошибка',
          description: 'Неверный формат даты рождения. Используйте формат ДД.ММ.ГГГГ (например, 15.01.1990)',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const updateData = {
        id: userProfile.id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName?.trim() || null,
        hiddenDescription: formData.hiddenDescription?.trim() || null,
        phoneNumber: formData.phoneNumber ? normalizePhone(formData.phoneNumber) : null,
        birthDate: formData.birthDate ? normalizeDate(formData.birthDate) : null,
        gender: formData.gender ?? null,
        additional: {
          rootElement: userProfile.additional?.rootElement?.trim() || null,
        },
      };

      await userApi.updateProfile(updateData);
      
      // Обновляем кэш профиля
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      toast({
        title: 'Профиль обновлен',
        description: 'Данные вашего профиля успешно сохранены',
      });
    } catch (err) {
      console.error('Update profile error:', err);
      const apiError = err as ApiError;
      toast({
        title: 'Ошибка',
        description: apiError.message || 'Не удалось сохранить изменения. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoadingUser || isLoadingProfile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto flex flex-col gap-4 md:gap-8">
          <div className="text-center py-12 md:py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground text-sm md:text-base">Загрузка настроек...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-4 md:gap-8 w-full">
        {/* Navigation & Header */}
        <div className="px-0 md:px-0">
          <Link href="/dashboard">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary mb-2 md:mb-4 gap-2 text-muted-foreground text-sm md:text-base">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Назад к дашборду</span>
              <span className="sm:hidden">Назад</span>
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold tracking-tight">
            Настройки
          </h1>
          <p className="text-xs md:text-sm lg:text-base text-muted-foreground mt-1">
            Управление настройками аккаунта
          </p>
        </div>

        {/* User Profile Section */}
        <Card className="rounded-2xl md:rounded-3xl border-border/50 shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg lg:text-xl xl:text-2xl font-display flex items-center gap-2">
              <User className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>Профиль врача</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Редактирование личных данных вашего аккаунта
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Имя */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  Имя *
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Введите имя"
                  className="h-11 md:h-12 text-sm md:text-base"
                />
              </div>

              {/* Фамилия */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Фамилия *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Введите фамилию"
                  className="h-11 md:h-12 text-sm md:text-base"
                />
              </div>

              {/* Отчество */}
              <div className="space-y-2">
                <Label htmlFor="middleName" className="text-sm font-medium">
                  Отчество
                </Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  placeholder="Введите отчество"
                  className="h-11 md:h-12 text-sm md:text-base"
                />
              </div>

              {/* Телефон - скрыто */}
              {/* <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">
                  Номер телефона
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: handlePhoneInput(e.target.value) })}
                  placeholder="+7 (999) 123-45-67"
                  className="h-11 md:h-12 text-sm md:text-base rounded-xl"
                />
              </div> */}

              {/* Дата рождения */}
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-sm font-medium">
                  Дата рождения
                </Label>
                <Input
                  id="birthDate"
                  type="text"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: handleDateInput(e.target.value) })}
                  placeholder="ДД.ММ.ГГГГ"
                  className="h-11 md:h-12 text-sm md:text-base rounded-xl"
                />
                {formData.birthDate && !isValidDate(formData.birthDate) && (
                  <p className="text-xs text-destructive mt-1">
                    Неверный формат. Используйте ДД.ММ.ГГГГ (например, 15.01.1990)
                  </p>
                )}
              </div>

              {/* Пол - скрыто */}
              {/* <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium">
                  Пол
                </Label>
                <Select
                  value={formData.gender?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, gender: value ? Number(value) : null })}
                >
                  <SelectTrigger id="gender" className="h-11 md:h-12 text-sm md:text-base">
                    <SelectValue placeholder="Выберите пол" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Не указан</SelectItem>
                    <SelectItem value="1">Мужской</SelectItem>
                    <SelectItem value="2">Женский</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
            </div>

            {/* Описание - скрыто */}
            {/* <div className="space-y-2">
              <Label htmlFor="hiddenDescription" className="text-sm font-medium">
                Описание
              </Label>
              <Textarea
                id="hiddenDescription"
                value={formData.hiddenDescription}
                onChange={(e) => setFormData({ ...formData, hiddenDescription: e.target.value })}
                placeholder="Дополнительная информация о себе"
                className="min-h-[100px] text-sm md:text-base resize-none"
                rows={4}
              />
            </div> */}

            {/* Кнопка сохранения */}
            <Button
              onClick={handleSaveProfile}
              disabled={isSavingProfile || !formData.firstName || !formData.lastName || Boolean(formData.birthDate && !isValidDate(formData.birthDate))}
              className="w-full h-11 md:h-12 text-sm md:text-base"
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Email Confirmation Section */}
        <Card className="rounded-2xl md:rounded-3xl border-border/50 shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg lg:text-xl xl:text-2xl font-display flex items-center gap-2">
              <Mail className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>Подтверждение email</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Статус подтверждения вашего email адреса
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm md:text-base truncate">{currentUser?.email || 'Email не загружен'}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {currentUser?.emailConfirmed ? 'Email подтвержден' : 'Email не подтвержден'}
                </p>
              </div>
              {currentUser?.emailConfirmed ? (
                <div className="flex items-center gap-1.5 md:gap-2 text-green-600 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">Подтвержден</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 md:gap-2 text-muted-foreground flex-shrink-0">
                  <XCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">Не подтвержден</span>
                </div>
              )}
            </div>
            
            {currentUser?.email && !currentUser?.emailConfirmed && (
              <>
                <Separator className="my-3 md:my-4" />
                <Button
                  variant="outline"
                  onClick={handleResendConfirmation}
                  disabled={isSendingConfirmation}
                  className="w-full h-11 md:h-12 text-sm md:text-base"
                >
                  {isSendingConfirmation ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="whitespace-nowrap">Отправить письмо подтверждения</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card className="rounded-2xl md:rounded-3xl border-border/50 shadow-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg lg:text-xl xl:text-2xl font-display flex items-center gap-2">
              <Lock className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>Смена пароля</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Для изменения пароля мы отправим ссылку на ваш email адрес
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
            <div className="space-y-3 md:space-y-4">
              <p className="text-xs md:text-sm text-muted-foreground">
                Нажмите кнопку ниже, чтобы получить ссылку для сброса пароля на ваш email адрес <strong className="break-all">{currentUser?.email}</strong>
              </p>
              
              <Button
                onClick={handleRequestPasswordReset}
                disabled={isSendingPasswordReset}
                className="w-full h-11 md:h-12 text-sm md:text-base"
              >
                {isSendingPasswordReset ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Отправить ссылку для сброса пароля
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

