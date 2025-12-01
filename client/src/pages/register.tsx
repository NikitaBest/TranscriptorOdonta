import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const confirm = formData.get("confirm")?.toString();

    if (!name || !email || !password || !confirm) {
      setError("Заполните все поля");
      return;
    }

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      setLocation("/dashboard");
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold tracking-tighter">
            Transcriptor
          </h1>
          <p className="text-muted-foreground">
            Создайте аккаунт стоматологической команды
          </p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Регистрация</CardTitle>
            <CardDescription className="text-center">
              Укажите данные для создания рабочего профиля
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя и фамилия</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ирина Смирнова"
                  required
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="doctor@clinic.com"
                  required
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Повторите пароль</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
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
                {isLoading ? "Создание..." : "Создать аккаунт"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Уже есть аккаунт? </span>
          <Link href="/auth" className="font-medium hover:underline">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}

