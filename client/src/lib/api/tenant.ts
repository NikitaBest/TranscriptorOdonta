import { ApiClient } from './client';
import type { ApiResponse, TenantDoctor } from './types';

function normalizeDoctor(d: TenantDoctor): TenantDoctor {
  return {
    ...d,
    id: String(d.id),
  };
}

/**
 * API тенанта (пользователи клиники и т.д.).
 */
export const tenantApi = {
  /**
   * Все врачи (пользователи) текущего tenant по JWT.
   * GET /tenant/doctors
   */
  async getDoctors(): Promise<TenantDoctor[]> {
    const response = await ApiClient.get<ApiResponse<TenantDoctor[]> | TenantDoctor[]>(
      'tenant/doctors',
      {
        requireAuth: true,
      }
    );

    if (Array.isArray(response)) {
      return response.map(normalizeDoctor);
    }

    if (response?.isSuccess && Array.isArray(response.value)) {
      return response.value.map(normalizeDoctor);
    }

    console.warn('[tenant/doctors] Неожиданный формат ответа:', response);
    return [];
  },
};
