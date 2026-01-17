import { ApiClient } from './client';
import type { 
  RegisterRequest, 
  RegisterResponse, 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenResponse,
  ConfirmEmailRequest,
  ConfirmEmailResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  CheckResetPasswordTokenRequest,
  CheckResetPasswordTokenResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ApiResponse
} from './types';

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

    // Сохраняем данные пользователя в localStorage, если они пришли
    if (response.user) {
      localStorage.setItem('user_data', JSON.stringify(response.user));
    } else {
      // Если user не пришел в ответе, сохраняем email из запроса
      localStorage.setItem('user_data', JSON.stringify({
        id: '',
        email: data.email,
      }));
    }

    return response;
  },

  /**
   * Авторизация пользователя
   * POST /auth/email-login
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // Увеличиваем таймаут для запросов авторизации до 60 секунд
    // Это помогает при медленном соединении или долгой обработке на сервере
    const response = await ApiClient.post<LoginResponse>(
      'auth/email-login',
      data,
      { timeout: 60000 } // 60 секунд вместо 30
    );

    // Сохраняем токен после успешной авторизации
    if (response.token) {
      ApiClient.setAuthToken(response.token);
    }

    // Сохраняем данные пользователя в localStorage, если они пришли
    if (response.user) {
      localStorage.setItem('user_data', JSON.stringify(response.user));
    } else {
      // Если user не пришел в ответе, сохраняем email из запроса
      localStorage.setItem('user_data', JSON.stringify({
        id: '',
        email: data.email,
      }));
    }

    return response;
  },

  /**
   * Выход из системы
   * Удаляет токен из localStorage (endpoint /auth/logout не существует на сервере)
   */
  async logout(): Promise<void> {
    // Удаляем токен и данные пользователя
    ApiClient.removeAuthToken();
    localStorage.removeItem('user_data');
  },

  /**
   * Получение данных текущего пользователя
   * Использует данные из localStorage (сохраненные при логине)
   */
  async getCurrentUser(): Promise<{ id: string; email: string }> {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    // Если данных нет, возвращаем пустой объект
    return { id: '', email: '' };
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

  /**
   * Подтверждение email
   * POST /auth/confirm-email
   */
  async confirmEmail(data: ConfirmEmailRequest): Promise<ConfirmEmailResponse> {
    const response = await ApiClient.post<ApiResponse<ConfirmEmailResponse | string> | ConfirmEmailResponse>(
      'auth/confirm-email',
      data
    );

    // Проверяем, обернут ли ответ в ApiResponse
    if ('value' in response && 'isSuccess' in response) {
      // Ответ обернут в ApiResponse
      if (response.isSuccess) {
        // Если value - это строка, создаем объект ConfirmEmailResponse из полей ApiResponse
        if (typeof response.value === 'string') {
          return {
            isSuccess: response.isSuccess,
            error: response.error || '',
          };
        }
        // Если value - это объект, возвращаем его
        if (response.value) {
          return response.value;
        }
        // Если value отсутствует, создаем объект из полей ApiResponse
        return {
          isSuccess: response.isSuccess,
          error: response.error || '',
        };
      }
      throw new Error(response.error || 'Ошибка подтверждения email');
    }

    // Ответ приходит напрямую в формате {isSuccess, error}
    if (response.isSuccess) {
      return response;
    }

    throw new Error(response.error || 'Ошибка подтверждения email');
  },

  /**
   * Запрос на сброс пароля (отправка email)
   * POST /auth/reset-password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await ApiClient.post<ApiResponse<ResetPasswordResponse | string> | ResetPasswordResponse>(
      'auth/reset-password',
      data
    );

    console.log('[Auth API] resetPassword response:', response);

    // Проверяем, обернут ли ответ в ApiResponse
    if ('value' in response && 'isSuccess' in response) {
      // Ответ обернут в ApiResponse
      const apiResponse = response as ApiResponse<ResetPasswordResponse | string>;
      
      if (apiResponse.isSuccess) {
        // Если value - это строка, создаем объект ResetPasswordResponse из полей ApiResponse
        if (typeof apiResponse.value === 'string') {
          const result: ResetPasswordResponse = {
            isSuccess: apiResponse.isSuccess,
            error: apiResponse.error || '',
          };
          console.log('[Auth API] resetPassword returning (string value):', result);
          return result;
        }
        // Если value - это объект, возвращаем его
        if (apiResponse.value && typeof apiResponse.value === 'object') {
          console.log('[Auth API] resetPassword returning (object value):', apiResponse.value);
          return apiResponse.value as ResetPasswordResponse;
        }
        // Если value отсутствует, создаем объект из полей ApiResponse
        const result: ResetPasswordResponse = {
          isSuccess: apiResponse.isSuccess,
          error: apiResponse.error || '',
        };
        console.log('[Auth API] resetPassword returning (no value):', result);
        return result;
      }
      const error = new Error(apiResponse.error || 'Ошибка запроса сброса пароля');
      console.error('[Auth API] resetPassword error:', error);
      throw error;
    }

    // Ответ приходит напрямую в формате {isSuccess, error}
    const directResponse = response as ResetPasswordResponse;
    if (directResponse.isSuccess) {
      console.log('[Auth API] resetPassword returning (direct response):', directResponse);
      return directResponse;
    }

    const error = new Error(directResponse.error || 'Ошибка запроса сброса пароля');
    console.error('[Auth API] resetPassword error:', error);
    throw error;
  },

  /**
   * Проверка токена сброса пароля
   * POST /auth/check-reset-password-token
   */
  async checkResetPasswordToken(data: CheckResetPasswordTokenRequest): Promise<CheckResetPasswordTokenResponse> {
    const response = await ApiClient.post<ApiResponse<CheckResetPasswordTokenResponse | string> | CheckResetPasswordTokenResponse>(
      'auth/check-reset-password-token',
      data
    );

    // Проверяем, обернут ли ответ в ApiResponse
    if ('value' in response && 'isSuccess' in response) {
      // Ответ обернут в ApiResponse
      if (response.isSuccess) {
        // Если value - это строка, создаем объект CheckResetPasswordTokenResponse из полей ApiResponse
        if (typeof response.value === 'string') {
          return {
            isSuccess: response.isSuccess,
            error: response.error || '',
          };
        }
        // Если value - это объект, возвращаем его
        if (response.value) {
          return response.value;
        }
        // Если value отсутствует, создаем объект из полей ApiResponse
        return {
          isSuccess: response.isSuccess,
          error: response.error || '',
        };
      }
      throw new Error(response.error || 'Ошибка проверки токена');
    }

    // Ответ приходит напрямую в формате {isSuccess, error}
    if (response.isSuccess) {
      return response;
    }

    throw new Error(response.error || 'Ошибка проверки токена');
  },

  /**
   * Смена пароля
   * POST /auth/change-password
   */
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await ApiClient.post<ApiResponse<ChangePasswordResponse | string> | ChangePasswordResponse>(
      'auth/change-password',
      data
    );

    // Проверяем, обернут ли ответ в ApiResponse
    if ('value' in response && 'isSuccess' in response) {
      // Ответ обернут в ApiResponse
      if (response.isSuccess) {
        // Если value - это строка, создаем объект ChangePasswordResponse из полей ApiResponse
        if (typeof response.value === 'string') {
          return {
            isSuccess: response.isSuccess,
            error: response.error || '',
          };
        }
        // Если value - это объект, возвращаем его
        if (response.value) {
          return response.value;
        }
        // Если value отсутствует, создаем объект из полей ApiResponse
        return {
          isSuccess: response.isSuccess,
          error: response.error || '',
        };
      }
      throw new Error(response.error || 'Ошибка смены пароля');
    }

    // Ответ приходит напрямую в формате {isSuccess, error}
    if (response.isSuccess) {
      return response;
    }

    throw new Error(response.error || 'Ошибка смены пароля');
  },
};

