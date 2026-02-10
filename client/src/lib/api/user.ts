import { ApiClient } from './client';
import type { 
  ApiResponse,
  UserProfile,
  UpdateUserProfileRequest
} from './types';

/**
 * API функции для работы с профилем пользователя (врача)
 */
export const userApi = {
  /**
   * Получение данных текущего пользователя
   * GET /user/me
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      const response = await ApiClient.get<ApiResponse<UserProfile>>(
        'user/me',
        { requireAuth: true }
      );

      if (response.isSuccess && response.value) {
        return response.value;
      }

      return null;
    } catch (error) {
      console.error('Get user profile error:', error);
      const apiError = error as { status?: number };
      if (apiError.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Обновление профиля пользователя
   * PUT /user/update
   */
  async updateProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
    const response = await ApiClient.put<ApiResponse<UserProfile>>(
      'user/update',
      data,
      { requireAuth: true }
    );

    if (response.isSuccess && response.value) {
      return response.value;
    }

    if (!response.isSuccess && response.error) {
      const error: any = new Error(response.error);
      error.status = 400;
      throw error;
    }

    throw new Error('Неожиданный формат ответа от сервера');
  },
};

