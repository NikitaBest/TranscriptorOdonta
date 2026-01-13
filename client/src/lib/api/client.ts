import { getApiUrl, API_CONFIG } from './config';
import type { ApiError } from './types';

/**
 * Базовый клиент для API запросов
 */
export class ApiClient {
  /**
   * Выполнить API запрос
   */
  static async request<T>(
    method: string,
    path: string,
    data?: unknown,
    options?: {
      headers?: Record<string, string>;
      requireAuth?: boolean;
      isFormData?: boolean;
      timeout?: number; // Таймаут в миллисекундах (по умолчанию из конфига)
    }
  ): Promise<T> {
    // Убеждаемся, что таймаут не меньше 30 секунд для обычных запросов
    const minTimeout = 30000;
    const url = getApiUrl(path);
    const headers: Record<string, string> = {
      ...options?.headers,
    };

    // Для FormData не добавляем Content-Type, браузер установит его автоматически с boundary
    if (data && !options?.isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Добавляем токен авторизации если требуется
    if (options?.requireAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Определяем таймаут: для загрузки файлов используем увеличенный таймаут
    const timeout = options?.timeout || (options?.isFormData ? 300000 : API_CONFIG.timeout);

    // Создаем AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      // Логируем размер файла если это FormData
      if (options?.isFormData && data instanceof FormData) {
        const file = data.get('file') as File | Blob;
        if (file) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
          console.log(`[API] ${method} ${url} [FormData]`, {
            fileSize: `${sizeMB} MB`,
            timeout: `${timeout / 1000}s`,
          });
        }
      } else {
        console.log(`[API] ${method} ${url}`, options?.isFormData ? '[FormData]' : data ? { body: data } : '');
      }
      console.log(`[API] Headers:`, headers);
      
      // Не используем credentials для всех запросов, так как мы используем Bearer token в заголовке
      // Credentials нужны только для cookies/sessions, а мы используем JWT токены
      // Это также решает проблему CORS, когда бэкенд возвращает Access-Control-Allow-Origin: *
      const useCredentials = false;
      
      const response = await fetch(url, {
        method,
        headers,
        body: options?.isFormData ? (data as FormData) : (data ? JSON.stringify(data) : undefined),
        credentials: useCredentials ? 'include' : 'omit',
        mode: 'cors', // Явно указываем CORS режим
        signal: controller.signal, // Добавляем signal для возможности отмены
      });

      // Очищаем таймаут если запрос успешно завершился
      clearTimeout(timeoutId);

      console.log(`[API] Response status: ${response.status}`, response);

      // Обработка ошибок
      if (!response.ok) {
        await this.handleError(response);
      }

      // Если ответ пустой (например, 204 No Content)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const jsonData = await response.json();
      console.log(`[API] Response data:`, jsonData);
      return jsonData;
    } catch (error) {
      // Очищаем таймаут в случае ошибки
      clearTimeout(timeoutId);
      
      console.error(`[API] Request failed:`, error);
      console.error(`[API] Request details:`, {
        method,
        url,
        timeout: `${timeout / 1000}s`,
        hasSignal: !!controller.signal,
        signalAborted: controller.signal?.aborted,
      });
      
      // Обработка ошибки таймаута
      if (error instanceof Error && (error.name === 'AbortError' || controller.signal?.aborted)) {
        const apiError: ApiError = {
          message: options?.isFormData 
            ? `Превышено время ожидания загрузки файла (${timeout / 1000} сек). Файл слишком большой или медленное соединение. Попробуйте записать более короткое аудио или проверьте подключение к интернету.`
            : `Превышено время ожидания ответа от сервера (${timeout / 1000} сек). Проверьте подключение к интернету или попробуйте позже.`,
          status: 0,
        };
        throw apiError;
      }
      
      // Обработка сетевых ошибок (CORS, нет интернета, таймаут и т.д.)
      if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('network'))) {
        const apiError: ApiError = {
          message: 'Не удалось подключиться к серверу. Проверьте подключение к интернету или обратитесь к администратору.',
          status: 0,
        };
        throw apiError;
      }
      
      // Если это уже наш ApiError, пробрасываем дальше
      if (error && typeof error === 'object' && 'message' in error) {
        throw error;
      }
      
      // Для остальных ошибок
      if (error instanceof Error) {
        const apiError: ApiError = {
          message: error.message || 'Произошла неизвестная ошибка при выполнении запроса',
          status: 0,
        };
        throw apiError;
      }
      
      throw {
        message: 'Произошла неизвестная ошибка при выполнении запроса',
        status: 0,
      } as ApiError;
    }
  }

  /**
   * Обработка ошибок API
   */
  private static async handleError(response: Response): Promise<never> {
    let errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
    let errors: Record<string, string[]> | undefined;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        // Бэкенд может возвращать ошибку в поле error (ApiResponse формат)
        errorMessage = errorData.message || errorData.error || (errorData.value === null && errorData.isSuccess === false ? errorData.error : null) || errorMessage;
        errors = errorData.errors;
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }
    } catch {
      // Если не удалось распарсить ошибку, используем дефолтное сообщение
    }

    const apiError: ApiError = {
      message: errorMessage,
      status: response.status,
      errors,
    };

    throw apiError;
  }

  /**
   * Получить токен авторизации из localStorage
   */
  static getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Сохранить токен авторизации
   */
  static setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  /**
   * Удалить токен авторизации
   */
  static removeAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  /**
   * GET запрос
   */
  static get<T>(path: string, options?: { requireAuth?: boolean }): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * POST запрос
   */
  static post<T>(
    path: string,
    data?: unknown,
    options?: { requireAuth?: boolean }
  ): Promise<T> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * PUT запрос
   */
  static put<T>(
    path: string,
    data?: unknown,
    options?: { requireAuth?: boolean }
  ): Promise<T> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * PATCH запрос
   */
  static patch<T>(
    path: string,
    data?: unknown,
    options?: { requireAuth?: boolean }
  ): Promise<T> {
    return this.request<T>('PATCH', path, data, options);
  }

  /**
   * DELETE запрос
   */
  static delete<T>(
    path: string,
    options?: { requireAuth?: boolean }
  ): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

