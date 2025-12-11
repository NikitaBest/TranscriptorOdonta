/**
 * Конфигурация API
 */
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://transcriptor-backend-api.odonta.burtimaxbot.ru',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000, // 30 секунд
} as const;

/**
 * Получить полный URL для API запроса
 */
export function getApiUrl(path: string): string {
  // Убираем ведущий слэш если есть
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_CONFIG.baseURL}/${cleanPath}`;
}

