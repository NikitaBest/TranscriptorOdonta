import { ApiClient } from './client';
import type { RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, RefreshTokenResponse } from './types';

/**
 * API функции для аутентификации
 */
export const authApi = {
  /**
   * Регистрация нового пользователя
   * POST /auth/register
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await ApiClient.post<RegisterResponse>(
      'auth/register',
      data
    );

    // Сохраняем токен после успешной регистрации
    if (response.token) {
      ApiClient.setAuthToken(response.token);
    }

    return response;
  },

  /**
   * Авторизация пользователя
   * POST /auth/email-login
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await ApiClient.post<LoginResponse>(
      'auth/email-login',
      data
    );

    // Сохраняем токен после успешной авторизации
    if (response.token) {
      ApiClient.setAuthToken(response.token);
    }

    return response;
  },

  /**
   * Выход из системы
   * POST /auth/logout
   */
  async logout(): Promise<void> {
    try {
      await ApiClient.post('auth/logout', undefined, { requireAuth: true });
    } finally {
      // Удаляем токен в любом случае
      ApiClient.removeAuthToken();
    }
  },

  /**
   * Проверка текущей авторизации
   * GET /auth/me
   */
  async getCurrentUser(): Promise<{ id: string; email: string }> {
    return ApiClient.get<{ id: string; email: string }>('auth/me', {
      requireAuth: true,
    });
  },

  /**
   * Обновление JWT токена
   * POST /auth/refresh-token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await ApiClient.post<RefreshTokenResponse>(
      'auth/refresh-token',
      undefined,
      { requireAuth: true }
    );

    // Обновляем токен после успешного обновления
    if (response.token) {
      ApiClient.setAuthToken(response.token);
    }

    return response;
  },
};

