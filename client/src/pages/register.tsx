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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authApi } from "@/lib/api/auth";
import { useToast } from "@/hooks/use-toast";
import type { ApiError } from "@/lib/api/types";
import { Eye, EyeOff, Mail } from "lucide-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [marketingConsentAccepted, setMarketingConsentAccepted] = useState(false);
  const [showEmailConfirmationDialog, setShowEmailConfirmationDialog] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const confirm = formData.get("confirm")?.toString();
    const firstName = formData.get("firstName")?.toString().trim();
    const lastName = formData.get("lastName")?.toString().trim();
    const middleName = formData.get("middleName")?.toString().trim();
    const clinicRole = formData.get("clinicRole")?.toString().trim();
    const specializationRaw = formData.get("specialization")?.toString().trim();
    const specialization =
      specializationRaw && specializationRaw.length > 0
        ? specializationRaw.slice(0, 50)
        : undefined;

    if (!email || !password || !confirm || !firstName || !lastName) {
      setError("Заполните все обязательные поля");
      return;
    }

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    if (!consentAccepted) {
      setError("Необходимо согласиться на обработку персональных данных");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await authApi.register({
        email,
        password,
        firstName,
        lastName,
        middleName: middleName || undefined, // Отчество опциональное
        clinicRole: clinicRole || null,
        specialization,
      });

      // Сохраняем email для показа в диалоге
      setRegisteredEmail(email);
      
      // Показываем диалог о подтверждении email
      setShowEmailConfirmationDialog(true);

      toast({
        title: "Регистрация успешна",
        description: "Пожалуйста, подтвердите ваш email адрес",
      });
    } catch (err) {
      console.error('Registration error:', err);
      
      const apiError = err as ApiError;
      let errorMessage =
        apiError.message ||
        apiError.errors?.email?.[0] ||
        apiError.errors?.password?.[0] ||
        apiError.errors?.firstName?.[0] ||
        apiError.errors?.lastName?.[0] ||
        apiError.errors?.middleName?.[0];

      // Если это сетевая ошибка (статус 0), даем более понятное сообщение
      if (apiError.status === 0) {
        errorMessage = apiError.message || 'Не удалось подключиться к серверу. Проверьте подключение к интернету.';
      }

      // Если сообщение все еще пустое, используем дефолтное
      if (!errorMessage) {
        errorMessage = "Произошла ошибка при регистрации. Попробуйте еще раз.";
      }

      setError(errorMessage);

      toast({
        title: "Ошибка регистрации",
        description: errorMessage,
        variant: "destructive",
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
            <h1 className="text-4xl font-display font-bold tracking-tighter">
              Odonta AI
            </h1>
          </div>
          <p className="text-muted-foreground">
            Создайте аккаунт стоматологической команды
          </p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center">Регистрация</CardTitle>
            <CardDescription className="text-center">
              Заполните данные для создания аккаунта
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Иванов"
                    required
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Иван"
                    required
                    className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Отчество</Label>
                <Input
                  id="middleName"
                  name="middleName"
                  type="text"
                  placeholder="Иванович"
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicRole">Роль в клинике</Label>
                <select
                  id="clinicRole"
                  name="clinicRole"
                  defaultValue=""
                  className="h-12 w-full rounded-xl bg-secondary/30 border border-transparent px-3 text-sm focus:border-primary focus:bg-background focus:outline-none transition-all"
                >
                  <option value="">Не выбрана</option>
                  <option value="doctor">Врач</option>
                  <option value="coordinator">Координатор</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Необязательное поле. Можно выбрать «Врач» или «Координатор».
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Специализация</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  type="text"
                  placeholder="Например, ортодонт"
                  maxLength={50}
                  className="h-12 rounded-xl bg-secondary/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
                <p className="text-xs text-muted-foreground">
                  Необязательное поле, до 50 символов.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirm">Повторите пароль</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    name="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    required
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

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="consent"
                    checked={consentAccepted}
                    onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="consent"
                    className="text-sm font-normal leading-relaxed cursor-pointer"
                  >
                    Я даю{" "}
                    <a
                      href="https://disk.yandex.ru/i/v_4_gmraHoTdJA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium hover:text-blue-700"
                    >
                      согласие
                    </a>
                    {" "}на обработку моих персональных данных согласно{" "}
                    <a
                      href="https://disk.yandex.ru/i/AsAMtZQ5NgcdBA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium hover:text-blue-700"
                    >
                      Политике
                    </a>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="marketing-consent"
                    checked={marketingConsentAccepted}
                    onCheckedChange={(checked) => setMarketingConsentAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="marketing-consent"
                    className="text-sm font-normal leading-relaxed cursor-pointer"
                  >
                    Я даю{" "}
                    <a
                      href="https://disk.yandex.ru/i/AsAMtZQ5NgcdBA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium hover:text-blue-700"
                    >
                      согласие
                    </a>
                    {" "}на рекламную рассылку <span className="text-muted-foreground">(необязательно)</span>
                  </Label>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button
                className="w-full h-12 rounded-xl text-base font-medium mt-4"
                disabled={isLoading || !consentAccepted}
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

      {/* Dialog для подтверждения email */}
      <Dialog open={showEmailConfirmationDialog} onOpenChange={() => {
        // Диалог можно закрыть только через кнопки внутри
        // Не закрываем при клике вне диалога или ESC
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl md:rounded-3xl p-4 md:p-6 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center mb-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-xl md:text-2xl text-center font-display">
              Подтвердите ваш email
            </DialogTitle>
            <DialogDescription className="text-center text-sm md:text-base pt-1">
              Мы отправили письмо с подтверждением на адрес
            </DialogDescription>
            <div className="text-center mt-3 px-2">
              <p className="font-semibold text-sm md:text-base break-all bg-secondary/30 rounded-lg p-2 md:p-3">
                {registeredEmail}
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-2 md:space-y-3 py-3 md:py-4">
            <p className="text-xs md:text-sm text-muted-foreground text-center px-2">
              Пожалуйста, проверьте вашу почту и перейдите по ссылке для подтверждения email адреса.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground text-center px-2">
              Если письмо не пришло, проверьте папку "Спам" или запросите повторную отправку в настройках.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => {
                setShowEmailConfirmationDialog(false);
                setLocation("/dashboard");
              }}
              className="w-full h-11 md:h-12 text-sm md:text-base"
            >
              Продолжить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

