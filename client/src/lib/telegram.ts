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
  
  // Уведомляем Telegram, что приложение готово
  tg.ready();
  
  return tg;
}

/**
 * Отключает возможность закрытия приложения при свайпе вниз
 */
export function disableSwipeToClose() {
  const tg = getTelegramWebApp();
  if (!tg) {
    return;
  }

  // Скрываем кнопку "Назад", чтобы предотвратить закрытие
  if (tg.BackButton) {
    tg.BackButton.hide();
  }

  // Включаем подтверждение перед закрытием (требует подтверждение пользователя)
  if (tg.enableClosingConfirmation) {
    tg.enableClosingConfirmation();
  }
}

/**
 * Включает возможность закрытия приложения при свайпе вниз
 */
export function enableSwipeToClose() {
  const tg = getTelegramWebApp();
  if (!tg) {
    return;
  }

  // Показываем кнопку "Назад"
  if (tg.BackButton) {
    tg.BackButton.show();
  }

  // Отключаем подтверждение перед закрытием
  if (tg.disableClosingConfirmation) {
    tg.disableClosingConfirmation();
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

