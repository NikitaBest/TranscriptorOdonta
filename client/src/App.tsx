import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthRefresh } from "@/hooks/use-auth-refresh";
import NotFound from "@/pages/not-found";

import AuthPage from "@/pages/auth";
import RegisterPage from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import PatientProfile from "@/pages/patient";
import RecordPage from "@/pages/record";
import ConsultationPage from "@/pages/consultation";
import HistoryPage from "@/pages/history";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/patient/:id" component={PatientProfile} />
      <Route path="/record" component={RecordPage} />
      <Route path="/consultation/:id" component={ConsultationPage} />
      <Route path="/history" component={HistoryPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // Автоматическое обновление токена
  useAuthRefresh();

  return (
    <TooltipProvider>
      <Toaster />
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