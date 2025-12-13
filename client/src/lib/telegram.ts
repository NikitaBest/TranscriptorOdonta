/**
 * Утилиты для работы с Telegram Web App API
 */

// Типы для Telegram Web App API
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        ready: () => void;
        expand: () => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        disableVerticalSwipes: () => void;
        enableVerticalSwipes: () => void;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}

/**
 * Проверяет, запущено ли приложение в Telegram
 */
export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && typeof window.Telegram !== 'undefined' && !!window.Telegram?.WebApp;
}

/**
 * Получает экземпляр Telegram Web App
 */
export function getTelegramWebApp() {
  if (!isTelegramWebApp()) {
    return null;
  }
  return window.Telegram!.WebApp;
}

/**
 * Инициализирует Telegram Web App
 */
export function initTelegramWebApp() {
  const tg = getTelegramWebApp();
  if (!tg) {
    return;
  }

  // Расширяем приложение на весь экран
  tg.expand();
  
  // Отключаем закрытие при свайпе вниз
  disableSwipeToClose();
  
  // Принудительно устанавливаем светлую цветовую схему для правильного цвета курсора
  // Даже если Telegram определяет темную схему, мы используем светлую для UI
  if (typeof document !== 'undefined') {
    document.documentElement.style.colorScheme = 'light';
    // Также устанавливаем для body и всех input/textarea
    document.body.style.colorScheme = 'light';
  }
  
  // Уведомляем Telegram, что приложение готово
  tg.ready();
  
  return tg;
}

/**
 * Отключает возможность закрытия приложения при свайпе вниз
 * Использует disableVerticalSwipes() для отключения вертикальных жестов
 */
export function disableSwipeToClose() {
  const tg = getTelegramWebApp();
  if (!tg) {
    return;
  }

  // Отключаем вертикальные жесты для закрытия или сворачивания мини-приложения
  // Это предотвращает закрытие при скролле или свайпе вниз
  if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
  }
}

/**
 * Включает возможность закрытия приложения при свайпе вниз
 * Использует enableVerticalSwipes() для включения вертикальных жестов
 */
export function enableSwipeToClose() {
  const tg = getTelegramWebApp();
  if (!tg) {
    return;
  }

  // Включаем вертикальные жесты для закрытия или сворачивания мини-приложения
  if (tg.enableVerticalSwipes) {
    tg.enableVerticalSwipes();
  }
}

/**
 * Получает данные пользователя из Telegram
 */
export function getTelegramUser() {
  const tg = getTelegramWebApp();
  if (!tg) {
    return null;
  }
  return tg.initDataUnsafe.user || null;
}

