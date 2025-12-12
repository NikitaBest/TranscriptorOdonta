/**
 * Конфигурация API
 */
const getBaseURL = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error(
      'VITE_API_BASE_URL не установлен в переменных окружения. ' +
      'Пожалуйста, создайте файл .env и укажите VITE_API_BASE_URL.'
    );
  }
  return url;
};

export const API_CONFIG = {
  baseURL: getBaseURL(),
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

