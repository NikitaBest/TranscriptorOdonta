import { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/types';
import { Loader2, Mail, Lock, CheckCircle2, XCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Загружаем данные текущего пользователя
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    retry: false,
  });

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

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) {
      return 'Пароль обязателен';
    }
    if (pwd.length < 6) {
      return 'Пароль должен содержать минимум 6 символов';
    }
    return null;
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Валидация
    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    if (!currentPassword) {
      setPasswordError('Введите текущий пароль');
      return;
    }

    setPasswordError(null);
    setIsChangingPassword(true);

    try {
      // Здесь нужно добавить эндпоинт для смены пароля авторизованным пользователем
      // Пока используем общий change-password, но нужен отдельный /auth/change-password для авторизованных
      toast({
        title: 'Информация',
        description: 'Функция смены пароля для авторизованных пользователей будет добавлена позже',
      });
      
      // Очищаем поля после успешной смены
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Change password error:', err);
      const apiError = err as ApiError;
      setPasswordError(apiError.message || 'Не удалось изменить пароль');
      toast({
        title: 'Ошибка',
        description: apiError.message || 'Не удалось изменить пароль. Попробуйте еще раз.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
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
                  {currentUser?.email ? 'Email подтвержден' : 'Email не подтвержден'}
                </p>
              </div>
              {currentUser?.email ? (
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
            
            {!currentUser?.email && (
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
              Измените пароль для вашего аккаунта
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleChangePassword} className="space-y-3 md:space-y-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="currentPassword" className="text-sm md:text-base">Текущий пароль</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    className="h-11 md:h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all pr-10 text-sm md:text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                    aria-label={showCurrentPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="newPassword" className="text-sm md:text-base">Новый пароль</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    className="h-11 md:h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all pr-10 text-sm md:text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                    aria-label={showNewPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm md:text-base">Повторите новый пароль</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    className="h-11 md:h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all pr-10 text-sm md:text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                    aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </button>
                </div>
              </div>

              {passwordError && (
                <p className="text-xs md:text-sm text-destructive text-center px-2">{passwordError}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 md:h-12 rounded-xl text-sm md:text-base font-medium mt-2 md:mt-4"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Изменение...
                  </>
                ) : (
                  'Изменить пароль'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

