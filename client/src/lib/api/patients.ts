import { ApiClient } from './client';
import type { 
  CreatePatientRequest, 
  CreatePatientResponse, 
  GetPatientsRequest,
  GetPatientsResponse,
  PatientResponse,
  ConsultationResponse,
  GetConsultationsResponse,
  ApiResponse 
} from './types';

/**
 * API функции для работы с пациентами
 */
export const patientsApi = {
  /**
   * Создание нового пациента
   * POST /client/create
   */
  async create(data: CreatePatientRequest): Promise<CreatePatientResponse> {
    const response = await ApiClient.post<ApiResponse<CreatePatientResponse>>(
      'client/create',
      data,
      { requireAuth: true }
    );

    // Бэкенд возвращает обёрнутый ответ { value: {...}, isSuccess: true, error: null }
    // Извлекаем данные из поля value
    if (response.isSuccess && response.value) {
      // Преобразуем id в строку, если он число
      return {
        ...response.value,
        id: String(response.value.id),
      };
    }

    // Если структура неожиданная, пробрасываем ошибку
    throw new Error('Неожиданный формат ответа от сервера');
  },

  /**
   * Получение списка пациентов
   * POST /client/get
   */
  async get(params?: GetPatientsRequest): Promise<PatientResponse[]> {
    const response = await ApiClient.post<ApiResponse<GetPatientsResponse | PatientResponse[]>>(
      'client/get',
      params || {},
      { requireAuth: true }
    );

    // Бэкенд возвращает обёрнутый ответ { value: { data: [...], currentPage, totalPages, ... }, isSuccess: true, error: null }
    if (response.isSuccess && response.value) {
      // Проверяем, массив ли это напрямую (старый формат)
      if (Array.isArray(response.value)) {
        return response.value.map(patient => ({
          ...patient,
          id: String(patient.id),
        }));
      }
      
      // Если это объект с data (новый формат с пагинацией)
      if ('data' in response.value && Array.isArray(response.value.data)) {
        return response.value.data.map(patient => ({
          ...patient,
          id: String(patient.id),
        }));
      }
      
      // Если это объект с items (старый формат)
      if ('items' in response.value && Array.isArray(response.value.items)) {
        return response.value.items.map(patient => ({
          ...patient,
          id: String(patient.id),
        }));
      }
    }

    // Если структура неожиданная, возвращаем пустой массив
    console.warn('Неожиданный формат ответа от сервера при получении списка пациентов:', response);
    return [];
  },

  /**
   * Получение пациента по ID
   * POST /client/get с параметром id
   */
  async getById(id: string | number): Promise<PatientResponse | null> {
    const patients = await this.get({ id });
    return patients.length > 0 ? patients[0] : null;
  },

  /**
   * Получение консультаций пациента
   * POST /consultation/get (предполагаемый endpoint)
   */
  async getConsultations(patientId: string | number): Promise<ConsultationResponse[]> {
    // TODO: Уточнить правильный endpoint для получения консультаций
    // Пока используем предположительный endpoint
    const response = await ApiClient.post<ApiResponse<GetConsultationsResponse | ConsultationResponse[]>>(
      'consultation/get',
      { patientId },
      { requireAuth: true }
    );

    if (response.isSuccess && response.value) {
      // Проверяем, массив ли это напрямую
      if (Array.isArray(response.value)) {
        return response.value.map(consultation => ({
          ...consultation,
          id: String(consultation.id),
          patientId: consultation.patientId ? String(consultation.patientId) : undefined,
        }));
      }
      
      // Если это объект с data
      if ('data' in response.value && Array.isArray(response.value.data)) {
        return response.value.data.map(consultation => ({
          ...consultation,
          id: String(consultation.id),
          patientId: consultation.patientId ? String(consultation.patientId) : undefined,
        }));
      }
    }

    console.warn('Неожиданный формат ответа от сервера при получении консультаций:', response);
    return [];
  },
};

