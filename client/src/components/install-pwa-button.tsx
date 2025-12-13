import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { showInstallPrompt, isPWAInstalled } from '@/lib/pwa';

export function InstallPWAButton() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Проверяем, установлено ли уже приложение
    setIsInstalled(isPWAInstalled());

    // Обработка события beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Предотвращаем автоматический показ промпта
      e.preventDefault();
      // Сохраняем событие
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Обработка успешной установки
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Проверяем, есть ли уже сохраненный deferredPrompt
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        const accepted = await showInstallPrompt(deferredPrompt);
        if (accepted) {
          setShowPrompt(false);
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch (error) {
        console.error('Ошибка при установке PWA:', error);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Сохраняем deferredPrompt для показа позже
    (window as any).deferredPrompt = deferredPrompt;
  };

  // Не показываем, если уже установлено или нет промпта
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)' // Учитываем safe area на мобильных
      }}
    >
      <Alert className="bg-background border-border shadow-lg">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <AlertDescription className="text-sm">
              <strong className="font-semibold">Установите приложение</strong>
              <p className="text-muted-foreground mt-1">
                Установите Odonta AI на свой рабочий стол для быстрого доступа и работы оффлайн.
              </p>
            </AlertDescription>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Установить
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}

