import React from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { 
  Users, 
  Mic, 
  History, 
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const navItems = [
    { href: '/dashboard', icon: Users, label: 'Пациенты' },
    { href: '/history', icon: History, label: 'История' },
    { href: '/record', icon: Mic, label: 'Запись' },
  ];

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    try {
      await authApi.logout();
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы",
      });
      setLocation('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      // В любом случае перенаправляем на страницу авторизации
      setLocation('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-border/50 sticky top-0 md:h-screen bg-background/50 backdrop-blur-xl z-50">
        <div className="flex flex-col h-full">
          <div className="p-6 mb-8">
            <h1 className="text-2xl font-display font-bold tracking-tighter">Transcriptor</h1>
            <p className="text-xs text-muted-foreground mt-1">ИИ-ассистент стоматолога</p>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group cursor-pointer",
                    location === item.href 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", location === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-border/50 space-y-2">
            <div 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:bg-destructive/10 hover:text-destructive cursor-pointer text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border/50 bg-background/95 backdrop-blur-xl z-50 flex items-center justify-between px-4">
        <span className="font-display font-bold text-lg">Transcriptor</span>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-border/70 text-muted-foreground hover:text-destructive hover:border-destructive/60 transition-colors"
          aria-label="Выйти из аккаунта"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8 pb-20 md:pb-8 max-w-screen-2xl mx-auto w-full animate-in fade-in duration-500">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border/50 bg-background/95 backdrop-blur-xl z-50 flex items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex-1">
            <div 
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200",
                location === item.href 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", location === item.href && "text-primary")} />
              <span className={cn("text-[10px] font-medium", location === item.href && "text-primary")}>
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}