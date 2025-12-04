/**
 * Типы для API запросов и ответов
 */

/**
 * Запрос на регистрацию пользователя
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Ответ при успешной регистрации
 */
export interface RegisterResponse {
  token: string;
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Запрос на авторизацию
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Ответ при успешной авторизации
 */
export interface LoginResponse {
  token: string;
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Ответ при обновлении токена
 */
export interface RefreshTokenResponse {
  token: string;
}

/**
 * Ошибка API
 */
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

