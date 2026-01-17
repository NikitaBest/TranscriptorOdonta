import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import type { ApiError } from '@/lib/api/types';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !email.trim()) {
      setError('Введите email адрес');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        email: email.trim(),
      });

      console.log('[ForgotPassword] resetPassword response:', response);

      if (response.isSuccess) {
        setIsSuccess(true);
        setError(null);
        toast({
          title: 'Письмо отправлено',
          description: 'Инструкции по сбросу пароля отправлены на ваш email.',
        });
      } else {
        console.error('[ForgotPassword] resetPassword failed:', response);
        setError(response.error || 'Ошибка при отправке письма');
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось отправить письмо. Попробуйте еще раз.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[ForgotPassword] Reset password error:', err);
      
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Не удалось отправить письмо. Попробуйте еще раз.';
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

  const handleResend = async () => {
    if (!email || !email.trim()) {
      setError('Введите email адрес');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        email: email.trim(),
      });

      console.log('[ForgotPassword] resend resetPassword response:', response);

      if (response.isSuccess) {
        setError(null);
        toast({
          title: 'Письмо отправлено',
          description: 'Инструкции по сбросу пароля отправлены на ваш email.',
        });
      } else {
        console.error('[ForgotPassword] resend resetPassword failed:', response);
        setError(response.error || 'Ошибка при отправке письма');
        toast({
          title: 'Ошибка',
          description: response.error || 'Не удалось отправить письмо. Попробуйте еще раз.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[ForgotPassword] Resend reset password error:', err);
      
      const apiError = err as ApiError;
      const errorMessage = apiError.message || 'Не удалось отправить письмо. Попробуйте еще раз.';
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
          <p className="text-muted-foreground">Восстановление пароля</p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Забыли пароль?</CardTitle>
            <CardDescription className="text-center">
              {isSuccess 
                ? 'Проверьте вашу почту для получения инструкций по сбросу пароля'
                : 'Введите email адрес, и мы отправим вам ссылку для сброса пароля'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-6">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                  <p className="text-center text-muted-foreground mb-4">
                    Письмо с инструкциями по сбросу пароля отправлено на адрес <strong>{email}</strong>
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full h-12 rounded-xl text-base font-medium" 
                    onClick={handleResend}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Отправить еще раз
                      </>
                    )}
                  </Button>
                  
                  <Link href="/auth">
                    <Button 
                      variant="outline" 
                      className="w-full h-12 rounded-xl text-base font-medium"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Вернуться к авторизации
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="doctor@clinic.com"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button 
                  className="w-full h-12 rounded-xl text-base font-medium mt-4" 
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Отправить ссылку
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        <div className="text-center text-sm">
          <Link href="/auth" className="font-medium hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Вернуться к авторизации
          </Link>
        </div>
      </div>
    </div>
  );
}

