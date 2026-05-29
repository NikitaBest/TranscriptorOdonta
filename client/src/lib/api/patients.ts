import { ApiClient } from './client';
import { fileForMultipartUpload, formatClientDocumentUploadError, logFormDataPayload } from './config';
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
  ApiError,
  ClientDocument,
  CreateClientDocumentParams,
  UpdateClientDocumentParams,
  GetClientDocumentsRequest,
  GetClientDocumentsResponse,
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
   * Список документов клиента
   * POST /client/document/get
   */
  async getDocuments(params: GetClientDocumentsRequest): Promise<{
    data: ClientDocument[];
    totalCount: number;
  }> {
    const pageSize = params.pageSize ?? 50;
    let pageNumber = params.pageNumber ?? params.page ?? 1;
    const all: ClientDocument[] = [];
    let totalCount = 0;
    let hasNext = true;
    const maxPages = 20;

    while (hasNext && pageNumber <= maxPages) {
      const response = await ApiClient.post<ApiResponse<GetClientDocumentsResponse>>(
        'client/document/get',
        {
          clientId: params.clientId,
          search: params.search?.trim() || undefined,
          order: params.order || undefined,
          pageNumber,
          pageSize,
        },
        { requireAuth: true }
      );

      if (!response.isSuccess || !response.value) {
        if (all.length === 0) {
          throw new Error(response.error || 'Не удалось загрузить документы');
        }
        break;
      }

      const page = response.value;
      totalCount = page.totalCount ?? all.length + (page.data?.length ?? 0);

      if (Array.isArray(page.data)) {
        all.push(
          ...page.data.map((doc) => ({
            ...doc,
            id: String(doc.id),
          }))
        );
      }

      const moreByFlag = Boolean(page.hasNext);
      const moreByPage =
        typeof page.currentPage === 'number' &&
        typeof page.totalPages === 'number' &&
        page.currentPage < page.totalPages;

      hasNext = moreByFlag || moreByPage;
      pageNumber += 1;

      if (!page.data?.length) {
        break;
      }
    }

    return { data: all, totalCount: totalCount || all.length };
  },

  /**
   * Создать документ клиента с файлом
   * POST /client/document (multipart/form-data)
   * @see API.md — ApplicationModelsClientCreateClientDocumentRequest
   * Обязательно: file; clientId и/или consultationId
   */
  async createDocument(params: CreateClientDocumentParams): Promise<ClientDocument> {
    const hasClient = Boolean(params.clientId?.trim());
    const hasConsultation = Boolean(params.consultationId?.trim());
    if (!hasClient && !hasConsultation) {
      throw new Error('Укажите clientId или consultationId');
    }
    if (!params.file || params.file.size === 0) {
      throw new Error('Файл пустой или не выбран');
    }
    if (params.file.size > 50 * 1024 * 1024) {
      throw new Error('Размер файла не должен превышать 50 МБ');
    }

    const formData = new FormData();
    const title = params.title?.trim() || params.file.name;
    const { blob: fileBlob, name: fileName } = fileForMultipartUpload(params.file);

    // file — первым (часть ASP.NET/FastEndpoints биндеров чувствительна к порядку)
    formData.append('file', fileBlob, fileName);

    if (hasClient) {
      formData.append('clientId', params.clientId.trim());
    }
    if (hasConsultation) {
      formData.append('consultationId', params.consultationId!.trim());
    }
    formData.append('title', title);
    if (params.description?.trim()) {
      formData.append('description', params.description.trim());
    }
    if (params.comment?.trim()) {
      formData.append('comment', params.comment.trim());
    }

    logFormDataPayload('POST /client/document', formData);

    const fileSizeBytes = params.file.size;
    const minUploadSpeedKBps = 10;
    const estimatedUploadTimeSeconds = (fileSizeBytes / 1024) / minUploadSpeedKBps;
    const timeoutSeconds = Math.max(estimatedUploadTimeSeconds * 1.5 + 60, 120);
    const timeoutMs = Math.min(timeoutSeconds * 1000, 900000); // до 15 минут

    const response = await ApiClient.request<ApiResponse<ClientDocument>>(
      'POST',
      'client/document',
      formData,
      {
        requireAuth: true,
        isFormData: true,
        timeout: timeoutMs,
      }
    );

    if (response.isSuccess && response.value) {
      return {
        ...response.value,
        id: String(response.value.id),
      };
    }

    throw new Error(
      formatClientDocumentUploadError(response.error || 'Не удалось загрузить документ')
    );
  },

  /**
   * Обновить документ клиента
   * PUT /client/document/{id} (multipart/form-data)
   */
  async updateDocument(
    documentId: string,
    params: UpdateClientDocumentParams
  ): Promise<ClientDocument> {
    const formData = new FormData();

    if (params.file) {
      if (params.file.size === 0) {
        throw new Error('Файл пустой');
      }
      if (params.file.size > 50 * 1024 * 1024) {
        throw new Error('Размер файла не должен превышать 50 МБ');
      }
      const { blob: fileBlob, name: fileName } = fileForMultipartUpload(params.file);
      formData.append('file', fileBlob, fileName);
    }

    if (params.clientId?.trim()) {
      formData.append('clientId', params.clientId.trim());
    }
    if (params.consultationId !== undefined && params.consultationId !== null) {
      formData.append('consultationId', params.consultationId);
    }
    if (params.title !== undefined) {
      formData.append('title', params.title);
    }
    if (params.description !== undefined) {
      formData.append('description', params.description);
    }
    if (params.comment !== undefined) {
      formData.append('comment', params.comment);
    }

    logFormDataPayload(`PUT /client/document/${documentId}`, formData);

    const timeoutMs = params.file
      ? Math.min(
          Math.max(((params.file.size / 1024) / 10) * 1.5 + 60, 120) * 1000,
          900000
        )
      : 60000;

    const response = await ApiClient.request<ApiResponse<ClientDocument>>(
      'PUT',
      `client/document/${encodeURIComponent(documentId)}`,
      formData,
      {
        requireAuth: true,
        isFormData: true,
        timeout: timeoutMs,
      }
    );

    if (response.isSuccess && response.value) {
      return {
        ...response.value,
        id: String(response.value.id),
      };
    }

    throw new Error(response.error || 'Не удалось сохранить изменения');
  },

  /**
   * Удалить документ клиента
   * DELETE /client/document/{documentId}
   */
  async deleteDocument(documentId: string): Promise<void> {
    const id = encodeURIComponent(documentId);
    const response = await ApiClient.delete<ApiResponse<unknown>>(
      `client/document/${id}`,
      { requireAuth: true }
    );

    if (
      response &&
      typeof response === 'object' &&
      'isSuccess' in response &&
      response.isSuccess === false
    ) {
      throw new Error(response.error || 'Не удалось удалить документ');
    }
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

