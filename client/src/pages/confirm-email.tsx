import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { ApiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import type { ApiError } from '@/lib/api/types';

export default function ConfirmEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Получаем параметры из URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const token = urlParams.get('token');

        if (!userId || !token) {
          setStatus('error');
          setErrorMessage('Неверная ссылка подтверждения. Проверьте ссылку из письма.');
          return;
        }

        // Вызываем API для подтверждения email
        const response = await authApi.confirmEmail({
          userId,
          token,
        });

        if (response.isSuccess) {
          setStatus('success');
          
          toast({
            title: 'Email подтвержден',
            description: 'Ваш email успешно подтвержден.',
          });

          // Проверяем, авторизован ли пользователь
          const authToken = ApiClient.getAuthToken();
          
          // Редиректим на главную, если пользователь авторизован, иначе на авторизацию
          setTimeout(() => {
            if (authToken) {
              setLocation('/dashboard');
            } else {
              setLocation('/auth');
            }
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(response.error || 'Ошибка подтверждения email');
        }
      } catch (err) {
        console.error('Confirm email error:', err);
        
        const apiError = err as ApiError;
        setStatus('error');
        setErrorMessage(
          apiError.message || 
          'Не удалось подтвердить email. Ссылка может быть недействительной или истекшей.'
        );
      }
    };

    confirmEmail();
  }, [setLocation, toast]);

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
            <CardTitle className="text-2xl text-center">Подтверждение email</CardTitle>
            <CardDescription className="text-center">
              {status === 'loading' && 'Подтверждение вашего email адреса...'}
              {status === 'success' && 'Email успешно подтвержден'}
              {status === 'error' && 'Ошибка подтверждения'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            {status === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground text-center">
                  Пожалуйста, подождите...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  Ваш email успешно подтвержден. Вы будете перенаправлены...
                </p>
                <Button 
                  onClick={() => {
                    const authToken = ApiClient.getAuthToken();
                    if (authToken) {
                      setLocation('/dashboard');
                    } else {
                      setLocation('/auth');
                    }
                  }}
                  className="mt-4"
                >
                  Продолжить
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <AlertCircle className="w-16 h-16 text-destructive mb-4" />
                <p className="text-destructive text-center mb-4">
                  {errorMessage}
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/auth')}
                  className="mt-4"
                >
                  Вернуться к авторизации
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

