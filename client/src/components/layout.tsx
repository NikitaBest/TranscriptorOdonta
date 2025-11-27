import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  Mic, 
  History, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const navItems = [
    { href: '/dashboard', icon: Users, label: 'Пациенты' },
    { href: '/history', icon: History, label: 'История' },
    { href: '/record', icon: Mic, label: 'Быстрая запись', variant: 'accent' },
  ];

  const NavContent = () => (
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
        <Link href="/profile">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:bg-secondary cursor-pointer text-sm",
            location === '/profile' && "bg-secondary"
          )}>
            <Settings className="w-4 h-4" />
            <span>Настройки</span>
          </div>
        </Link>
        <Link href="/auth">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:bg-destructive/10 hover:text-destructive cursor-pointer text-sm">
            <LogOut className="w-4 h-4" />
            <span>Выйти</span>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-border/50 sticky top-0 h-screen bg-background/50 backdrop-blur-xl z-50">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl z-50 flex items-center justify-between px-4">
        <span className="font-display font-bold text-lg">Transcriptor</span>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r border-border/50">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-screen-2xl mx-auto w-full animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}