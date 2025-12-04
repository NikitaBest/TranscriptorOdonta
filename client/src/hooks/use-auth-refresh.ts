import { useEffect, useRef } from 'react';
import { authApi } from '@/lib/api/auth';
import { ApiClient } from '@/lib/api/client';

/**
 * Интервал обновления токена (в миллисекундах)
 * Обновляем токен каждые 14 минут (840000 мс)
 * Обычно JWT токены живут 15 минут, обновляем чуть раньше
 */
const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 минут

/**
 * Хук для автоматического обновления JWT токена
 * Работает только если пользователь авторизован (есть токен)
 */
export function useAuthRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Проверяем, есть ли токен
    const token = ApiClient.getAuthToken();
    
    if (!token) {
      // Если токена нет, ничего не делаем
      return;
    }

    // Функция для обновления токена
    const refreshToken = async () => {
      // Предотвращаем параллельные запросы
      if (isRefreshingRef.current) {
        return;
      }

      try {
        isRefreshingRef.current = true;
        await authApi.refreshToken();
        console.log('[Auth] Token refreshed successfully');
      } catch (error) {
        console.error('[Auth] Failed to refresh token:', error);
        // Если токен не удалось обновить, возможно он истек
        // НЕ удаляем токен сразу - может быть временная ошибка сети
        // Удалим только если это точно ошибка авторизации (401)
        const apiError = error as { status?: number };
        if (apiError.status === 401) {
          ApiClient.removeAuthToken();
        }
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // НЕ обновляем токен сразу при монтировании - он еще свежий после авторизации
    // Ждем минимум 5 минут перед первым обновлением, затем обновляем каждые 14 минут
    const FIRST_REFRESH_DELAY = 5 * 60 * 1000; // 5 минут
    
    const firstRefreshTimeout = setTimeout(() => {
      refreshToken();
      // После первого обновления устанавливаем интервал
      intervalRef.current = setInterval(refreshToken, REFRESH_INTERVAL);
    }, FIRST_REFRESH_DELAY);

    // Очистка при размонтировании
    return () => {
      if (firstRefreshTimeout) {
        clearTimeout(firstRefreshTimeout);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Очистка при размонтировании
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Запускаем только при монтировании

  // Также обновляем токен при возврате фокуса на вкладку (но не сразу, а через небольшую задержку)
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const token = ApiClient.getAuthToken();
        if (token && !isRefreshingRef.current) {
          // Не обновляем сразу, ждем немного (чтобы не было слишком частых запросов)
          if (visibilityTimeout) {
            clearTimeout(visibilityTimeout);
          }
          
          visibilityTimeout = setTimeout(async () => {
            try {
              isRefreshingRef.current = true;
              await authApi.refreshToken();
              console.log('[Auth] Token refreshed on visibility change');
            } catch (error) {
              console.error('[Auth] Failed to refresh token on visibility change:', error);
              // Не удаляем токен при ошибке - может быть временная проблема
              const apiError = error as { status?: number };
              if (apiError.status === 401) {
                ApiClient.removeAuthToken();
              }
            } finally {
              isRefreshingRef.current = false;
            }
          }, 2000); // Ждем 2 секунды после возврата фокуса
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

