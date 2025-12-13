/**
 * Утилиты для работы с PWA
 */

/**
 * Проверка, установлено ли приложение как PWA
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Проверка для мобильных устройств
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Проверка для десктопов (Chrome, Edge)
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
}

/**
 * Проверка, поддерживается ли установка PWA
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Проверяем наличие события beforeinstallprompt
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Показ промпта установки PWA (если доступно)
 * @param promptEvent - Событие beforeinstallprompt (опционально)
 */
export async function showInstallPrompt(promptEvent?: any): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Используем переданное событие или ищем в window
  const deferredPrompt = promptEvent || (window as any).deferredPrompt;
  
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      // Очищаем deferredPrompt после использования
      (window as any).deferredPrompt = null;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('Ошибка при показе промпта установки:', error);
      return false;
    }
  }
  
  return false;
}

/**
 * Проверка, зарегистрирован ли Service Worker
 */
export async function isServiceWorkerRegistered(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration;
  } catch {
    return false;
  }
}

/**
 * Получение информации о Service Worker
 */
export async function getServiceWorkerInfo(): Promise<{
  registered: boolean;
  active: boolean;
  installing: boolean;
  waiting: boolean;
} | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return {
        registered: false,
        active: false,
        installing: false,
        waiting: false,
      };
    }
    
    return {
      registered: true,
      active: !!registration.active,
      installing: !!registration.installing,
      waiting: !!registration.waiting,
    };
  } catch {
    return null;
  }
}

