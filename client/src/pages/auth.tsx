import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setLocation('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold tracking-tighter">Transcriptor</h1>
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
                  placeholder="doctor@clinic.com"
                  type="email"
                  required
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>
              <Button className="w-full h-12 rounded-xl text-base font-medium mt-4" disabled={isLoading}>
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