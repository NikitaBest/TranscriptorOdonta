import { useEffect, useRef } from 'react';
import { authApi } from '@/lib/api/auth';
import { ApiClient } from '@/lib/api/client';

/**
 * Интервал проверки необходимости обновить токен (в миллисекундах).
 * Это не «жёсткий» интервал refresh, а интервал, с которым мы смотрим,
 * не подошёл ли токен к окончанию срока действия.
 */
const REFRESH_CHECK_INTERVAL = 10 * 60 * 1000; // каждые 10 минут

/**
 * За сколько времени до истечения токена начинать его обновлять.
 * Например, за 1 час до exp.
 */
const REFRESH_MARGIN_MS = 60 * 60 * 1000; // 1 час

/**
 * Извлекает exp (Unix timestamp в секундах) из JWT токена.
 */
function getTokenExpMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload || typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

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

    // Функция, которая по exp токена решает, нужно ли его сейчас обновлять
    const maybeRefreshToken = async () => {
      // Предотвращаем параллельные запросы
      if (isRefreshingRef.current) {
        return;
      }

      const currentToken = ApiClient.getAuthToken();
      const expMs = getTokenExpMs(currentToken);
      const now = Date.now();

      if (expMs && now < expMs - REFRESH_MARGIN_MS) {
        // До истечения ещё больше часа — не дергаем refresh
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

    // НЕ обновляем токен сразу при монтировании — он свежий после логина.
    // Через 5 минут начинаем периодически проверять, не подошёл ли он к exp.
    const FIRST_CHECK_DELAY = 5 * 60 * 1000; // 5 минут

    const firstCheckTimeout = setTimeout(() => {
      maybeRefreshToken();
      // После первой проверки запускаем периодические проверки
      intervalRef.current = setInterval(maybeRefreshToken, REFRESH_CHECK_INTERVAL);
    }, FIRST_CHECK_DELAY);

    // Очистка при размонтировании
    return () => {
      if (firstCheckTimeout) {
        clearTimeout(firstCheckTimeout);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Запускаем только при монтировании

  // При переходе по вкладкам refresh не вызываем — достаточно проверки по интервалу (раз в 10 мин, только если до exp < 1 ч)
}

