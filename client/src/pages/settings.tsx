import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/types';
import { Loader2, Mail, Lock, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);

  // Загружаем данные текущего пользователя
  const { data: currentUser, isLoading: isLoadingUser, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    retry: false,
  });

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
      // Здесь можно добавить отдельный эндпоинт для повторной отправки подтверждения
      // Пока используем тот же reset-password, но это не совсем правильно
      // В идеале должен быть /auth/resend-confirmation
      toast({
        title: 'Информация',
        description: 'Функция повторной отправки подтверждения будет добавлена позже',
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

  if (isLoadingUser) {
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

