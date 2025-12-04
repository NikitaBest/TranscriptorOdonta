/**
 * Конфигурация API
 */
export const API_CONFIG = {
  baseURL: 'https://transcriptor-backend-api.odonta.burtimaxbot.ru',
  timeout: 30000, // 30 секунд
} as const;

/**
 * Получить полный URL для API запроса
 */
export function getApiUrl(path: string): string {
  // Убираем ведущий слэш если есть
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_CONFIG.baseURL}/${cleanPath}`;
}

