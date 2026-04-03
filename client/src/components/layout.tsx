import React, { useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { 
  Users, 
  Mic, 
  History, 
  LogOut,
  MessageCircle,
  Settings,
  Wallet,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/hooks/use-toast';
import { InstallPWAButton } from '@/components/install-pwa-button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

function DocumentIcon({ className }: { className?: string }) {
  return <img src="/document.png" alt="" className={cn("w-4 h-4 object-contain", className)} />;
}

interface LayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
}

export function Layout({ children, hideNavigation = false }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', icon: Users, label: 'Пациенты' },
    { href: '/history', icon: History, label: 'История' },
    { href: '/record', icon: Mic, label: 'Запись' },
  ];

  const isMainNavActive = (href: string) =>
    href === '/record'
      ? location === '/record' || location.startsWith('/record/')
      : location === href;

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Удаляем токен и перенаправляем на страницу авторизации
    authApi.logout();
    toast({
      title: "Выход выполнен",
      description: "Вы успешно вышли из системы",
    });
    setLocation('/auth');
  };

  const mobileSections: Array<
    | { type: 'route'; href: string; label: string; icon: React.ComponentType<{ className?: string }> | 'document' }
    | { type: 'external'; href: string; label: string; icon: React.ComponentType<{ className?: string }> }
    | { type: 'action'; label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }
  > = [
    { type: 'route', href: '/documents', label: 'Документы', icon: 'document' },
    { type: 'route', href: '/wallet', label: 'Баланс', icon: Wallet },
    { type: 'external', href: 'https://t.me/odonta_ai_support', label: 'Поддержка', icon: MessageCircle },
    {
      type: 'action',
      label: 'Выйти',
      icon: LogOut,
      onClick: () => {
        authApi.logout();
        toast({ title: 'Выход выполнен', description: 'Вы успешно вышли из системы' });
        setLocation('/auth');
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      {!hideNavigation && (
        <aside className="hidden md:block w-64 border-r border-border/50 sticky top-0 md:h-screen bg-background/50 backdrop-blur-xl z-50">
          <div className="flex flex-col h-full">
            <div className="p-6 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src="/OdontaLogo.svg" 
                  alt="Odonta AI Logo" 
                  className="w-8 h-8"
                />
                <h1 className="text-2xl font-display font-bold tracking-tighter">Odonta AI</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">ИИ-ассистент стоматолога</p>
            </div>

            <nav className="flex-1 px-4 space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group cursor-pointer",
                      isMainNavActive(item.href)
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "hover:bg-secondary text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isMainNavActive(item.href) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              ))}
            </nav>

            <div className="p-4 mt-auto border-t border-border/50 space-y-2">
              <Link href="/documents">
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer text-sm",
                    location === '/documents'
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  <DocumentIcon className={cn(location === '/documents' ? "brightness-[3]" : "opacity-80")} />
                  <span>Документы</span>
                </div>
              </Link>
              <Link href="/wallet">
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer text-sm",
                    location === '/wallet'
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  <Wallet className={cn("w-4 h-4", location === '/wallet' ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>Баланс</span>
                </div>
              </Link>
              <Link href="/settings">
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer text-sm",
                    location === '/settings'
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  <Settings className={cn("w-4 h-4", location === '/settings' ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>Настройки</span>
                </div>
              </Link>
              <a
                href="https://t.me/odonta_ai_support"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:bg-secondary cursor-pointer text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Поддержка</span>
              </a>
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
      )}

      {/* Mobile Header */}
      {!hideNavigation && (
        <div
          className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border/50 bg-background/95 backdrop-blur-xl z-50 flex items-center justify-between px-4 cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label="Открыть меню разделов"
          onClick={() => setMobileNavOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setMobileNavOpen(true);
          }}
        >
          <div className="flex items-center gap-2">
            <img 
              src="/OdontaLogo.svg" 
              alt="Odonta AI Logo" 
              className="w-6 h-6"
            />
            <span className="font-display font-bold text-lg">Odonta AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMobileNavOpen(true);
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors"
              aria-label="Меню разделов"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sections Menu (3 dots) */}
      {!hideNavigation && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="top" className="p-0 rounded-b-2xl">
            <div className="p-4 pb-3 border-b border-border/60">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle className="font-display font-bold tracking-tight">Разделы</SheetTitle>
              </SheetHeader>
            </div>
            <div className="p-2">
              <div className="space-y-1">
                {mobileSections.map((item) => {
                  if (item.type === 'external') {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-secondary transition-colors min-h-[48px]"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </a>
                    );
                  }

                  if (item.type === 'action') {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setMobileNavOpen(false);
                          item.onClick();
                        }}
                        className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors min-h-[48px]"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  }

                  const isActive = location === item.href;
                  const Icon =
                    item.icon === 'document'
                      ? null
                      : (item.icon as React.ComponentType<{ className?: string }>);

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setMobileNavOpen(false);
                        setLocation(item.href);
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors min-h-[48px]",
                        isActive ? "bg-secondary" : "hover:bg-secondary"
                      )}
                    >
                      {item.icon === 'document' ? (
                        <DocumentIcon className="w-4 h-4 opacity-90" />
                      ) : (
                        Icon && <Icon className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{item.label}</span>
                      {isActive ? (
                        <span className="ml-auto text-xs text-muted-foreground">Текущая</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-4 md:p-8 max-w-screen-2xl mx-auto w-full animate-in fade-in duration-500",
        hideNavigation ? "pt-4 pb-4 md:pt-8 md:pb-8" : "pt-16 md:pt-8 pb-20 md:pb-8"
      )}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!hideNavigation && (
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border/50 bg-background/95 backdrop-blur-xl z-50 flex items-center justify-around px-2"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex-1">
              <div 
                className={cn(
                  "flex flex-col items-center justify-center gap-1 pt-1.5 pb-2 rounded-xl transition-all duration-200",
                  isMainNavActive(item.href)
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isMainNavActive(item.href) && "text-primary")} />
                <span className={cn("text-[10px] font-medium", isMainNavActive(item.href) && "text-primary")}>
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
          <Link href="/settings" className="flex-1">
            <div 
              className={cn(
                "flex flex-col items-center justify-center gap-1 pt-1.5 pb-2 rounded-xl transition-all duration-200",
                location === '/settings'
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Settings className={cn("w-5 h-5", location === '/settings' && "text-primary")} />
              <span className={cn("text-[10px] font-medium", location === '/settings' && "text-primary")}>
                Настройки
              </span>
            </div>
          </Link>
        </nav>
      )}

      {/* PWA Install Button */}
      <InstallPWAButton />
    </div>
  );
}