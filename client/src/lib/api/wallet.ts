import { ApiClient } from './client';
import type { ApiError } from './types';
import type {
  WalletBalanceResponse,
  CreatePaymentRequest,
  InitiatePaymentResponse,
  TariffItem,
  WalletHistoryResponse,
  PaymentHistoryResponse,
  PaymentStatusResponse,
  UsageHistoryResponse,
} from './types';

/**
 * API для кошелька и оплат (минуты расшифровки).
 * Эндпоинты бэкенда: /tenant/balance, /tenant/balance/payment/initiate и др.
 */
export const walletApi = {
  /**
   * Получить баланс тенанта (доступные минуты/секунды).
   * GET /tenant/balance
   */
  async getBalance(): Promise<WalletBalanceResponse> {
    const response = await ApiClient.get<WalletBalanceResponse>(
      'tenant/balance',
      { requireAuth: true }
    );
    return response;
  },

  /**
   * Тарифные планы для покупки минут. GET /tenant/balance/tariff
   * Возвращает массив уровней (minMinutes, pricePerMinuteDisplay и т.д.).
   */
  async getTariff(): Promise<TariffItem[]> {
    const response = await ApiClient.get<TariffItem[]>(
      'tenant/balance/tariff',
      { requireAuth: true }
    );
    return Array.isArray(response) ? response : [];
  },

  /**
   * Инициация оплаты (покупка минут). POST /tenant/balance/payment/initiate
   * Возвращает paymentId, paymentURL для перехода на платёжную форму и amount.
   */
  async createPayment(data: CreatePaymentRequest): Promise<InitiatePaymentResponse> {
    const response = await ApiClient.post<{ isSuccess: boolean; error?: string; value?: InitiatePaymentResponse }>(
      'tenant/balance/payment/initiate',
      { minutesToPurchase: data.minutes },
      { requireAuth: true }
    );
    if (!response.isSuccess || response.value == null) {
      const err: ApiError = { message: response.error || 'Не удалось инициировать платёж' };
      throw err;
    }
    return response.value;
  },

  /**
   * Статус платежа из платёжной системы. GET /tenant/balance/payment/{id}/status
   */
  async getPaymentStatus(id: string): Promise<PaymentStatusResponse> {
    const path = `tenant/balance/payment/${encodeURIComponent(id)}/status`;
    const response = await ApiClient.get<{ isSuccess: boolean; error?: string; value?: PaymentStatusResponse }>(
      path,
      { requireAuth: true }
    );
    if (!response.isSuccess || response.value == null) {
      const err: ApiError = { message: response.error || 'Не удалось получить статус платежа' };
      throw err;
    }
    return response.value;
  },

  /**
   * История списаний баланса за консультации. GET /tenant/balance/usage-history
   */
  async getUsageHistory(params: { pageNumber: number; pageSize: number }): Promise<UsageHistoryResponse> {
    const path = `tenant/balance/usage-history?pageNumber=${params.pageNumber}&pageSize=${params.pageSize}`;
    const response = await ApiClient.get<{ isSuccess: boolean; error?: string; value?: UsageHistoryResponse }>(
      path,
      { requireAuth: true }
    );
    if (!response.isSuccess || response.value == null) {
      const err: ApiError = { message: response.error || 'Не удалось загрузить историю списаний' };
      throw err;
    }
    return response.value;
  },

  /**
   * История платежей (пополнения баланса). GET /tenant/balance/payment-history
   */
  async getPaymentHistory(params: { pageNumber: number; pageSize: number }): Promise<PaymentHistoryResponse> {
    const path = `tenant/balance/payment-history?pageNumber=${params.pageNumber}&pageSize=${params.pageSize}`;
    const response = await ApiClient.get<{ isSuccess: boolean; error?: string; value?: PaymentHistoryResponse }>(
      path,
      { requireAuth: true }
    );
    if (!response.isSuccess || response.value == null) {
      const err: ApiError = { message: response.error || 'Не удалось загрузить историю платежей' };
      throw err;
    }
    return response.value;
  },

  /**
   * История операций по кошельку (пополнения, списания минут).
   * GET /wallet/history (или аналог)
   */
  async getHistory(params?: { limit?: number; offset?: number }): Promise<WalletHistoryResponse> {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const query = search.toString();
    const path = query ? `wallet/history?${query}` : 'wallet/history';
    const response = await ApiClient.get<WalletHistoryResponse>(path, { requireAuth: true });
    return response;
  },
};
