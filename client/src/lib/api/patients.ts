import { ApiClient } from './client';
import type { 
  CreatePatientRequest, 
  CreatePatientResponse,
  UpdatePatientRequest,
  UpdatePatientResponse,
  UpdateMedicalRecordRequest,
  UpdateMedicalRecordResponse,
  GetPatientsRequest,
  GetPatientsResponse,
  PatientResponse,
  ConsultationResponse,
  GetConsultationsResponse,
  ApiResponse,
  ApiError
} from './types';

/**
 * API функции для работы с пациентами
 */
export const patientsApi = {
  async getPatientsPage(params: GetPatientsRequest): Promise<{
    data: PatientResponse[];
    hasNext: boolean;
    totalCount?: number;
  }> {
    const requestPayload = {
      ...params,
      // Бэкенд в разных версиях принимает page или pageNumber; отправляем оба для совместимости.
      pageNumber: params.pageNumber ?? params.page,
    };

    const response = await ApiClient.post<ApiResponse<GetPatientsResponse | PatientResponse[]>>(
      'client/get',
      requestPayload,
      { requireAuth: true }
    );

    const normalizePatients = (items: PatientResponse[]) =>
      items.map((patient) => ({
        ...patient,
        id: String(patient.id),
      }));

    if (response.isSuccess && response.value) {
      if (Array.isArray(response.value)) {
        const pageSize = params.pageSize ?? response.value.length;
        return {
          data: normalizePatients(response.value),
          hasNext: response.value.length === pageSize,
        };
      }

      if ('data' in response.value && Array.isArray(response.value.data)) {
        const hasNextByPage =
          typeof response.value.currentPage === 'number' &&
          typeof response.value.totalPages === 'number' &&
          response.value.currentPage < response.value.totalPages;

        return {
          data: normalizePatients(response.value.data),
          hasNext: Boolean(response.value.hasNext ?? hasNextByPage),
          totalCount: response.value.totalCount,
        };
      }

      if ('items' in response.value && Array.isArray(response.value.items)) {
        const items = normalizePatients(response.value.items);
        const pageSize = params.pageSize ?? items.length;
        return {
          data: items,
          hasNext: items.length === pageSize,
        };
      }
    }

    console.warn('Неожиданный формат ответа от сервера при постраничной загрузке пациентов:', response);
    return { data: [], hasNext: false };
  },

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

    const normalizePatients = (items: PatientResponse[]) =>
      items.map((patient) => ({
        ...patient,
        id: String(patient.id),
      }));

    // Бэкенд возвращает обёрнутый ответ { value: { data: [...], currentPage, totalPages, ... }, isSuccess: true, error: null }
    if (response.isSuccess && response.value) {
      // Проверяем, массив ли это напрямую (старый формат)
      if (Array.isArray(response.value)) {
        return normalizePatients(response.value);
      }
      
      // Если это объект с data (новый формат с пагинацией)
      if ('data' in response.value && Array.isArray(response.value.data)) {
        const firstPage = response.value;

        // Если явно запрошена конкретная страница, возвращаем только её
        if (params?.page) {
          return normalizePatients(firstPage.data);
        }

        // Автодогрузка всех страниц пациентов (бэкенд по умолчанию может вернуть только первые 50)
        const allPatients = [...firstPage.data];
        const totalPages = Number(firstPage.totalPages) || 1;

        if (totalPages > 1) {
          const baseParams: GetPatientsRequest = { ...(params || {}) };
          const pageSize = firstPage.pageSize || baseParams.pageSize;

          for (let page = 2; page <= totalPages; page += 1) {
            const pageResponse = await ApiClient.post<ApiResponse<GetPatientsResponse | PatientResponse[]>>(
              'client/get',
              {
                ...baseParams,
                page,
                ...(pageSize ? { pageSize } : {}),
              },
              { requireAuth: true }
            );

            if (!pageResponse.isSuccess || !pageResponse.value) {
              break;
            }

            if (Array.isArray(pageResponse.value)) {
              allPatients.push(...pageResponse.value);
              break;
            }

            if ('data' in pageResponse.value && Array.isArray(pageResponse.value.data)) {
              allPatients.push(...pageResponse.value.data);
            } else {
              break;
            }
          }
        }

        return normalizePatients(allPatients);
      }
      
      // Если это объект с items (старый формат)
      if ('items' in response.value && Array.isArray(response.value.items)) {
        return normalizePatients(response.value.items);
      }
    }

    // Если структура неожиданная, возвращаем пустой массив
    console.warn('Неожиданный формат ответа от сервера при получении списка пациентов:', response);
    return [];
  },

  /**
   * Получение пациента по ID
   * GET /client/{id}
   */
  async getById(id: string | number): Promise<PatientResponse | null> {
    try {
      const response = await ApiClient.get<ApiResponse<PatientResponse>>(
        `client/${id}`,
        { requireAuth: true }
      );

      // Бэкенд возвращает обёрнутый ответ { value: {...}, isSuccess: true, error: null }
      if (response.isSuccess && response.value) {
        const patient = {
          ...response.value,
          id: String(response.value.id),
        };
        
        // Логируем для отладки
        console.log(`[Get Patient By ID] Patient ${id} loaded:`, {
          hasMedicalRecord: !!patient.medicalRecord,
          medicalRecordFields: patient.medicalRecord ? {
            hasAllergy: !!patient.medicalRecord.allergy,
            hasComorbidities: !!patient.medicalRecord.comorbidities,
            hasAnamnesis: !!patient.medicalRecord.anamnesis,
            hasComplaints: !!patient.medicalRecord.complaints,
            hasDiagnosis: !!patient.medicalRecord.diagnosis,
            hasTreatment: !!patient.medicalRecord.treatment,
            hasOtherInfo: !!patient.medicalRecord.otherInfo,
          } : null,
        });
        
        return patient;
      }

      return null;
    } catch (error) {
      console.error('Get patient by ID error:', error);
      // Если пациент не найден (404), возвращаем null
      const apiError = error as ApiError;
      if (apiError.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Обновление пациента
   * PUT /client/update
   */
  async update(data: UpdatePatientRequest): Promise<UpdatePatientResponse> {
    const response = await ApiClient.put<ApiResponse<UpdatePatientResponse>>(
      'client/update',
      data,
      { requireAuth: true }
    );

    // Бэкенд возвращает обёрнутый ответ { value: {...}, isSuccess: true, error: null }
    if (response.isSuccess && response.value) {
      return {
        ...response.value,
        id: String(response.value.id),
      };
    }

    // Если структура неожиданная, пробрасываем ошибку
    throw new Error('Неожиданный формат ответа от сервера');
  },

  /**
   * Удаление пациента
   * DELETE /client/delete/{id}
   */
  async delete(id: string | number): Promise<void> {
    await ApiClient.delete(`client/delete/${id}`, { requireAuth: true });
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

  /**
   * Обновление медицинской карты пациента
   * PUT /client/medical-record/update
   * Передаются только те поля, которые нужно изменить
   */
  async updateMedicalRecord(data: UpdateMedicalRecordRequest): Promise<UpdateMedicalRecordResponse> {
    const response = await ApiClient.put<ApiResponse<UpdateMedicalRecordResponse>>(
      'client/medical-record/update',
      data,
      { requireAuth: true }
    );

    // Бэкенд возвращает обёрнутый ответ { value: {...}, isSuccess: true, error: null }
    if (response.isSuccess && response.value) {
      return response.value;
    }

    // Если структура неожиданная, пробрасываем ошибку
    throw new Error('Неожиданный формат ответа от сервера');
  },
};

