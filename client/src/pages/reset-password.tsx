import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import type { ApiError } from '@/lib/api/types';
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    // Получаем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    const urlToken = urlParams.get('token');

    if (!urlUserId || !urlToken) {
      setIsCheckingToken(false);
      setIsTokenValid(false);
      setError('Неверная ссылка сброса пароля. Проверьте ссылку из письма.');
      return;
    }

    setUserId(urlUserId);
    setToken(urlToken);

    // Проверяем токен
    const checkToken = async () => {
      try {
        const response = await authApi.checkResetPasswordToken({
          userId: urlUserId,
          token: urlToken,
        });

        if (response.isSuccess) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
          setError(response.error || 'Токен сброса пароля недействителен или истек.');
        }
      } catch (err) {
        console.error('Check reset password token error:', err);
        const apiError = err as ApiError;
        setIsTokenValid(false);
        setError(
          apiError.message || 
          'Токен сброса пароля недействителен или истек. Запросите новую ссылку.'
        );
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkToken();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) {
      return 'Пароль обязателен';
    }
    if (pwd.length < 6) {
      return 'Пароль должен содержать минимум 6 символов';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId || !token) {
      setError('Неверная ссылка сброса пароля');
      return;
    }

    // Валидация паролей
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    setError(null);
    setPasswordError(null);
    setIsLoading(true);

    try {
      const response = await authApi.changePassword({
        userId,
        token,
        newPassword: password,
      });

      if (response.isSuccess) {
        setIsSuccess(true);
        
        toast({
          title: 'Пароль изменен',
          description: 'Ваш пароль успешно изменен. Теперь вы можете войти в систему.',
        });

        // Редиректим на страницу авторизации через 2 секунды
        setTimeout(() => {
          setLocation('/auth');
        }, 2000);
      } else {
        setError(response.error || 'Ошибка при смене пароля');
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось изменить пароль. Попробуйте еще раз.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Change password error:', err);
      
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Не удалось изменить пароль. Попробуйте еще раз.';
      setError(errorMessage);

      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-center">
                Проверка ссылки сброса пароля...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="/OdontaLogo.svg" 
                alt="Odonta AI Logo" 
                className="w-12 h-12"
              />
              <h1 className="text-4xl font-display font-bold tracking-tighter">Odonta AI</h1>
            </div>
          </div>

          <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center">Ошибка</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="w-16 h-16 text-destructive mb-4" />
              <p className="text-destructive text-center mb-4">
                {error || 'Ссылка сброса пароля недействительна или истекла.'}
              </p>
              <Button 
                variant="outline"
                onClick={() => setLocation('/auth')}
                className="mt-4"
              >
                Вернуться к авторизации
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="/OdontaLogo.svg" 
                alt="Odonta AI Logo" 
                className="w-12 h-12"
              />
              <h1 className="text-4xl font-display font-bold tracking-tighter">Odonta AI</h1>
            </div>
          </div>

          <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                Пароль успешно изменен. Вы будете перенаправлены на страницу авторизации...
              </p>
              <Button 
                onClick={() => setLocation('/auth')}
                className="mt-4"
              >
                Перейти к авторизации
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img 
              src="/OdontaLogo.svg" 
              alt="Odonta AI Logo" 
              className="w-12 h-12"
            />
            <h1 className="text-4xl font-display font-bold tracking-tighter">Odonta AI</h1>
          </div>
          <p className="text-muted-foreground">Сброс пароля</p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Новый пароль</CardTitle>
            <CardDescription className="text-center">
              Введите новый пароль для вашего аккаунта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Новый пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Повторите пароль</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {(error || passwordError) && (
                <p className="text-sm text-destructive text-center">
                  {passwordError || error}
                </p>
              )}

              <Button 
                className="w-full h-12 rounded-xl text-base font-medium mt-4" 
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
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
    </div>
  );
}

