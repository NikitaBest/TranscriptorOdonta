import { useEffect, useState } from 'react';
import { 
  isTelegramWebApp, 
  getTelegramWebApp, 
  initTelegramWebApp,
  getTelegramUser
} from '@/lib/telegram';

/**
 * Хук для работы с Telegram Web App
 */
export function useTelegram() {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [telegramUser, setTelegramUser] = useState<ReturnType<typeof getTelegramUser>>(null);
  const [webApp, setWebApp] = useState<ReturnType<typeof getTelegramWebApp>>(null);

  useEffect(() => {
    const inTelegram = isTelegramWebApp();
    setIsInTelegram(inTelegram);

    if (inTelegram) {
      const tg = initTelegramWebApp();
      setWebApp(tg);
      setTelegramUser(getTelegramUser());
    }
  }, []);

  return {
    isInTelegram,
    telegramUser,
    webApp,
  };
}

