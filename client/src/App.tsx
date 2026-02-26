import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { usePageTitle } from "@/hooks/use-page-title";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthRefresh } from "@/hooks/use-auth-refresh";
import { useOnline } from "@/hooks/use-online";
import { useBackgroundUpload } from "@/hooks/use-background-upload";
import { ApiClient } from "@/lib/api/client";
import { Loader2, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth";
import RegisterPage from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import PatientProfile from "@/pages/patient";
import PatientEditPage from "@/pages/patient-edit";
import PatientCreatePage from "@/pages/patient-create";
import RecordPage from "@/pages/record";
import ConsultationPage from "@/pages/consultation";
import ConsultationAIReportPage from "@/pages/consultation-ai-report";
import HistoryPage from "@/pages/history";
import ShareConsultationPage from "@/pages/share-consultation";
import ConfirmEmailPage from "@/pages/confirm-email";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import SettingsPage from "@/pages/settings";

// Публичные маршруты, которые не требуют авторизации
const PUBLIC_ROUTES = ['/auth', '/register', '/share', '/confirm-email', '/forgot-password', '/reset-password'];

// Вспомогательная функция для извлечения exp (в мс) из JWT токена
function getTokenExpMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!payload || typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Эталонный заголовок вкладки по маршруту + защита от подмены (расширения, кэш)
  usePageTitle(location);

  useEffect(() => {
    const checkAuth = async () => {
      // Проверяем, является ли текущий маршрут публичным
      const isPublicRoute = PUBLIC_ROUTES.some(route => location.startsWith(route));
      
      if (isPublicRoute) {
        setIsChecking(false);
        setIsAuthenticated(false);
        return;
      }

      // Проверяем наличие токена
      const token = ApiClient.getAuthToken();
      
      if (!token) {
        // Токена нет, перенаправляем на авторизацию
        setIsAuthenticated(false);
        setIsChecking(false);
        if (location !== '/auth' && location !== '/register') {
          setLocation('/auth');
        }
        return;
      }

      // Локально проверяем срок жизни токена по exp
      const expMs = getTokenExpMs(token);
      const now = Date.now();

      if (expMs && now >= expMs) {
        // Токен уже истёк — удаляем и уводим на авторизацию
        ApiClient.removeAuthToken();
        setIsAuthenticated(false);
        setIsChecking(false);
        if (location !== '/auth' && location !== '/register') {
          setLocation('/auth');
        }
        return;
      }

      // Токен есть и по exp ещё жив — считаем пользователя авторизованным без запроса на бэкенд
      setIsAuthenticated(true);
      setIsChecking(false);

      // Если пользователь на странице авторизации/регистрации или на главной, перенаправляем на дашборд
      if (location === '/' || location === '/auth' || location === '/register') {
        setLocation('/dashboard');
      }
    };

    checkAuth();
  }, [location, setLocation]);

  // Показываем индикатор загрузки во время проверки
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Если маршрут публичный, показываем содержимое без проверки
  const isPublicRoute = PUBLIC_ROUTES.some(route => location.startsWith(route));
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Если не авторизован и не на публичной странице, показываем индикатор загрузки
  // (перенаправление произойдет в useEffect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Перенаправление...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/confirm-email" component={ConfirmEmailPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/patient/new" component={PatientCreatePage} />
        <Route path="/patient/:id" component={PatientProfile} />
        <Route path="/patient/:id/edit" component={PatientEditPage} />
        <Route path="/record" component={RecordPage} />
        <Route path="/consultation/:id" component={ConsultationPage} />
        <Route path="/consultation/:id/ai-report" component={ConsultationAIReportPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/share/consultation/:id" component={ShareConsultationPage} />
        <Route path="/share/consultation/:id/:token" component={ShareConsultationPage} />
        
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function AppContent() {
  // Автоматическое обновление токена
  useAuthRefresh();
  // Отслеживание онлайн/оффлайн статуса
  const { isOffline } = useOnline();
  // Фоновая отправка записей из IndexedDB
  useBackgroundUpload();

  return (
    <TooltipProvider>
      <Toaster />
      {/* Индикатор оффлайн режима */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 p-2">
          <Alert variant="default" className="bg-muted border-border">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span>Работа в оффлайн режиме. Некоторые функции могут быть недоступны.</span>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <Router />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;