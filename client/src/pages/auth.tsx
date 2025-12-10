import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import type { ApiError } from '@/lib/api/types';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await authApi.login({
        email,
        password,
      });

      toast({
        title: 'Вход выполнен',
        description: 'Добро пожаловать! Вы будете перенаправлены...',
      });

      // Перенаправляем на дашборд после успешной авторизации
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Login error:', err);
      
      const apiError = err as ApiError;
      let errorMessage =
        apiError.message ||
        apiError.errors?.email?.[0] ||
        apiError.errors?.password?.[0];

      // Если это сетевая ошибка (статус 0), даем более понятное сообщение
      if (apiError.status === 0) {
        errorMessage = apiError.message || 'Не удалось подключиться к серверу. Проверьте подключение к интернету.';
      }

      // Если сообщение все еще пустое, используем дефолтное
      if (!errorMessage) {
        errorMessage = 'Неверный email или пароль. Попробуйте еще раз.';
      }

      setError(errorMessage);

      toast({
        title: 'Ошибка входа',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="text-muted-foreground">ИИ-ассистент для стоматологических консультаций</p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Добро пожаловать</CardTitle>
            <CardDescription className="text-center">
              Введите данные для входа в систему
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="doctor@clinic.com"
                  type="email"
                  required
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
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

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button 
                className="w-full h-12 rounded-xl text-base font-medium mt-4" 
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Вход..." : "Войти"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Нет аккаунта? </span>
          <Link href="/register" className="font-medium hover:underline">Регистрация</Link>
        </div>
      </div>
    </div>
  );
}