import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthRefresh } from "@/hooks/use-auth-refresh";
import { useOnline } from "@/hooks/use-online";
import type { ApiError } from "@/lib/api/types";
import { useBackgroundUpload } from "@/hooks/use-background-upload";
import { ApiClient } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";
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
import HistoryPage from "@/pages/history";
import ShareConsultationPage from "@/pages/share-consultation";
import ConfirmEmailPage from "@/pages/confirm-email";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import SettingsPage from "@/pages/settings";

// Публичные маршруты, которые не требуют авторизации
const PUBLIC_ROUTES = ['/auth', '/register', '/share', '/confirm-email', '/forgot-password', '/reset-password'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

      // Проверяем валидность токена через API (используем refresh-token, так как /auth/me может не существовать)
      try {
        // Пробуем обновить токен - если токен валиден, это сработает
        await authApi.refreshToken();
        // Токен валиден
        setIsAuthenticated(true);
        
        // Если пользователь на странице авторизации/регистрации или на главной, перенаправляем на дашборд
        if (location === '/' || location === '/auth' || location === '/register') {
          setLocation('/dashboard');
        }
      } catch (error) {
        // Проверяем тип ошибки
        const apiError = error as ApiError;
        
        // Если это сетевая ошибка (нет интернета) - разрешаем работу в оффлайн режиме
        // Пользователь остается авторизованным, если есть токен
        if (apiError.status === 0 || 
            (error instanceof Error && (
              error.message.includes('Failed to fetch') || 
              error.message.includes('network') ||
              error.message.includes('ERR_INTERNET_DISCONNECTED')
            ))) {
          console.warn('Token validation failed due to network error. Allowing offline mode:', error);
          // Разрешаем работу в оффлайн режиме - токен остается, пользователь остается авторизованным
          setIsAuthenticated(true);
          
          // Если пользователь на странице авторизации/регистрации, перенаправляем на дашборд
          if (location === '/' || location === '/auth' || location === '/register') {
            setLocation('/dashboard');
          }
        } else if (apiError.status === 401) {
          // Токен невалиден или истек (401 Unauthorized)
          console.error('Token validation failed: Unauthorized (401)', error);
          ApiClient.removeAuthToken();
          setIsAuthenticated(false);
          
          // Перенаправляем на авторизацию, если не на публичной странице
          if (location !== '/auth' && location !== '/register') {
            setLocation('/auth');
          }
        } else {
          // Другие ошибки (500, 503 и т.д.) - разрешаем работу, возможно временная проблема сервера
          console.warn('Token validation failed with non-auth error. Allowing access:', error);
          setIsAuthenticated(true);
          
          // Если пользователь на странице авторизации/регистрации, перенаправляем на дашборд
          if (location === '/' || location === '/auth' || location === '/register') {
            setLocation('/dashboard');
          }
        }
      } finally {
        setIsChecking(false);
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