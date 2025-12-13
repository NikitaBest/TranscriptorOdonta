import { ApiClient } from './client';
import { getApiUrl } from './config';
import type { 
  ApiResponse, 
  UploadConsultationResponse,
  ConsultationResponse,
  GetConsultationsRequest,
  GetConsultationsResponse,
  UpdateConsultationRequest
} from './types';
import { ConsultationProcessingStatus } from './types';

/**
 * API функции для работы с консультациями
 */
export const consultationsApi = {
  /**
   * Загрузка аудиофайла консультации
   * POST /note/upload-consultation/{clientId}
   * @param clientId - ID пациента
   * @param audioFile - аудиофайл (Blob или File)
   * @returns информация о созданной консультации
   */
  async uploadConsultation(
    clientId: string | number,
    audioFile: Blob | File
  ): Promise<UploadConsultationResponse> {
    const formData = new FormData();
    
    // Если это Blob, создаем File с правильным именем и расширением
    let fileToUpload: File;
    if (audioFile instanceof File) {
      fileToUpload = audioFile;
    } else {
      // Определяем расширение на основе MIME типа (учитываем codecs в типе)
      // Поддерживаемые форматы:
      // - audio/mp4 -> .mp4 (AAC) - лучшая совместимость для воспроизведения
      // - audio/webm;codecs=opus -> .webm (Opus) - отличное качество
      // - audio/webm -> .webm
      // - audio/ogg;codecs=opus -> .ogg (Opus)
      // - audio/wav -> .wav (несжатый)
      // - audio/mp3 -> .mp3
      
      let extension = 'webm'; // fallback
      const mimeType = audioFile.type || 'audio/webm';
      
      if (mimeType.includes('mp4')) {
        extension = 'mp4'; // AAC в MP4 - лучшая совместимость
      } else if (mimeType.includes('webm')) {
        extension = 'webm'; // WebM с Opus или без
      } else if (mimeType.includes('ogg')) {
        extension = 'ogg'; // OGG с Opus
      } else if (mimeType.includes('wav')) {
        extension = 'wav'; // WAV - универсальный, но большой
      } else if (mimeType.includes('mp3')) {
        extension = 'mp3'; // MP3
      }
      
      // Создаем File из Blob с правильным именем и расширением
      fileToUpload = new File([audioFile], `consultation_${Date.now()}.${extension}`, {
        type: mimeType,
      });
      
      // Логируем информацию о файле для отладки
      console.log('Uploading audio file:', {
        name: fileToUpload.name,
        size: fileToUpload.size,
        sizeMB: (fileToUpload.size / (1024 * 1024)).toFixed(2),
        type: fileToUpload.type,
        extension: extension,
      });
    }
    
    formData.append('file', fileToUpload);

    try {
      // Динамический таймаут на основе размера файла
      // Расчет: предполагаем минимальную скорость загрузки 10 KB/s (очень медленный интернет)
      // Добавляем запас 50% для надежности
      const fileSizeBytes = fileToUpload.size;
      const fileSizeMB = fileSizeBytes / (1024 * 1024);
      
      // Минимальная скорость загрузки: 10 KB/s (для очень медленного интернета)
      const minUploadSpeedKBps = 10;
      const estimatedUploadTimeSeconds = (fileSizeBytes / 1024) / minUploadSpeedKBps;
      
      // Добавляем запас 50% + минимум 2 минуты для обработки на сервере
      const timeoutSeconds = Math.max(
        estimatedUploadTimeSeconds * 1.5 + 120, // 50% запас + 2 минуты на обработку
        300 // Минимум 5 минут
      );
      
      // Максимальный таймаут: 30 минут (для очень больших файлов на очень медленном интернете)
      const timeoutMs = Math.min(timeoutSeconds * 1000, 1800000); // 30 минут максимум
      
      console.log('Calculated upload timeout:', {
        fileSizeMB: fileSizeMB.toFixed(2),
        estimatedUploadTimeSeconds: estimatedUploadTimeSeconds.toFixed(0),
        timeoutMinutes: (timeoutMs / 60000).toFixed(1),
      });

      const response = await ApiClient.request<ApiResponse<UploadConsultationResponse>>(
        'POST',
        `note/upload-consultation/${clientId}`,
        formData,
        {
          requireAuth: true,
          isFormData: true,
          timeout: timeoutMs,
        }
      );

      // Бэкенд возвращает обёрнутый ответ { value: {...}, isSuccess: true, error: null }
      if (response.isSuccess && response.value) {
        return {
          ...response.value,
          id: String(response.value.id),
          clientId: String(response.value.clientId),
        };
      }

      // Если isSuccess = false, бэкенд вернул ошибку в поле error
      if (!response.isSuccess) {
        const errorMessage = response.error || 'Ошибка при загрузке консультации';
        const error: any = new Error(errorMessage);
        error.status = 400;
        throw error;
      }

      // Если структура неожиданная, пробрасываем ошибку
      throw new Error('Неожиданный формат ответа от сервера');
    } catch (error: any) {
      // Если это уже обработанная ошибка, пробрасываем дальше
      if (error.status && error.message) {
        throw error;
      }
      // Иначе пробрасываем как есть
      throw error;
    }
  },

  /**
   * Получение консультации по ID
   * GET /note/{id}
   */
  async getById(id: string | number): Promise<ConsultationResponse | null> {
    try {
      const response = await ApiClient.get<ApiResponse<ConsultationResponse>>(
        `note/${id}`,
        { requireAuth: true }
      );

      if (response.isSuccess && response.value) {
        const consultation = response.value;
        // Определяем статус обработки (может быть в разных полях ответа)
        const processingStatus = (consultation as any).processingStatus || 
                                 (consultation as any).status || 
                                 ConsultationProcessingStatus.None;
        
        // Преобразуем данные для совместимости
        return {
          ...consultation,
          id: String(consultation.id),
          clientId: consultation.clientId ? String(consultation.clientId) : undefined,
          patientId: consultation.clientId ? String(consultation.clientId) : undefined,
          patientName: consultation.client ? `${consultation.client.firstName} ${consultation.client.lastName}` : undefined,
          date: consultation.createdAt || new Date().toISOString(),
          duration: consultation.audioDuration ? `${Math.floor(consultation.audioDuration / 60)}:${String(consultation.audioDuration % 60).padStart(2, '0')}` : '0:00',
          transcript: consultation.transcriptionResult || undefined,
          summary: consultation.summary || undefined,
          complaints: consultation.complaints || undefined,
          objective: consultation.objective || undefined,
          plan: consultation.treatmentPlan || undefined,
          comments: consultation.comment || undefined,
          processingStatus: typeof processingStatus === 'number' ? processingStatus : ConsultationProcessingStatus.None,
          status: typeof processingStatus === 'number' ? processingStatus : ConsultationProcessingStatus.None,
        };
      }

      return null;
    } catch (error) {
      console.error('Get consultation by ID error:', error);
      const apiError = error as any;
      if (apiError.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Получение списка консультаций
   * POST /note/get
   */
  async get(params?: GetConsultationsRequest): Promise<ConsultationResponse[]> {
    // Формируем тело запроса согласно API
    const requestBody: any = {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 20,
    };
    
    // Добавляем clientIds только если они указаны и массив не пустой
    if (params?.clientIds && params.clientIds.length > 0) {
      requestBody.clientIds = params.clientIds;
    }
    
    // Добавляем order если указан
    if (params?.order) {
      requestBody.order = params.order;
    }
    
    const response = await ApiClient.post<ApiResponse<GetConsultationsResponse | ConsultationResponse[]>>(
      'note/get',
      requestBody,
      { requireAuth: true }
    );

    if (response.isSuccess && response.value) {
      // Проверяем, массив ли это напрямую
      if (Array.isArray(response.value)) {
        return response.value.map(consultation => this.normalizeConsultation(consultation));
      }
      
      // Если это объект с data
      if ('data' in response.value && Array.isArray(response.value.data)) {
        return response.value.data.map(consultation => this.normalizeConsultation(consultation));
      }
    }

    console.warn('Неожиданный формат ответа от сервера при получении списка консультаций:', response);
    return [];
  },

  /**
   * Обновление консультации
   * PUT /note/update
   */
  async update(data: UpdateConsultationRequest): Promise<ConsultationResponse> {
    const response = await ApiClient.put<ApiResponse<ConsultationResponse>>(
      'note/update',
      data,
      { requireAuth: true }
    );

    if (response.isSuccess && response.value) {
      return this.normalizeConsultation(response.value);
    }

    if (!response.isSuccess && response.error) {
      const error: any = new Error(response.error);
      error.status = 400;
      throw error;
    }

    throw new Error('Неожиданный формат ответа от сервера');
  },

  /**
   * Удаление консультации
   * DELETE /note/delete/{id}
   */
  async delete(id: string | number): Promise<void> {
    await ApiClient.delete(`note/delete/${id}`, { requireAuth: true });
  },

  /**
   * Переобработка консультации
   * POST /note/reprocess
   */
  async reprocess(id: string | number): Promise<ConsultationResponse> {
    const response = await ApiClient.post<ApiResponse<ConsultationResponse>>(
      'note/reprocess',
      { id },
      { requireAuth: true }
    );

    if (response.isSuccess && response.value) {
      return this.normalizeConsultation(response.value);
    }

    if (!response.isSuccess && response.error) {
      const error: any = new Error(response.error);
      error.status = 400;
      throw error;
    }

    throw new Error('Неожиданный формат ответа от сервера');
  },

  /**
   * Получение прямого URL аудиофайла (для мобильных браузеров)
   * @param id - ID консультации
   * @returns Прямой URL к аудиофайлу с токеном в query параметре (если сервер поддерживает)
   */
  getAudioDirectUrl(id: string | number): string {
    const url = getApiUrl(`note/consultation-audio/${id}`);
    const token = ApiClient.getAuthToken();
    
    // Для мобильных браузеров audio элемент не может использовать заголовки Authorization
    // Если сервер поддерживает токен в query параметре, добавляем его
    // В противном случае сервер должен поддерживать cookies или другой метод авторизации
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
    
    return url;
  },

  /**
   * Получение URL аудиофайла консультации
   * GET /note/consultation-audio/{id}
   * @param id - ID консультации
   * @param useDirectUrl - использовать прямой URL вместо Blob URL (лучше для мобильных)
   * @returns Promise с Blob URL или прямой URL для использования в audio элементе
   */
  async getAudioUrl(id: string | number, useDirectUrl: boolean = false): Promise<string> {
    const url = getApiUrl(`note/consultation-audio/${id}`);
    const token = ApiClient.getAuthToken();
    
    // Для мобильных устройств используем прямой URL, если возможно
    // Это более надежно, чем Blob URL на некоторых мобильных браузерах
    if (useDirectUrl) {
      // Проверяем, поддерживает ли браузер прямую загрузку с авторизацией
      // Если нет, вернемся к Blob URL
      return url;
    }
    
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Добавляем таймаут для мобильных устройств
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд
      
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers,
          credentials: 'omit',
          mode: 'cors',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Если это ошибка таймаута или сети, пробуем прямой URL
        if (fetchError.name === 'AbortError' || fetchError.message.includes('network') || fetchError.message.includes('Failed to fetch')) {
          console.warn('Fetch failed, trying direct URL:', fetchError);
          return this.getAudioDirectUrl(id);
        }
        throw fetchError;
      }
      
      if (!response.ok) {
        // Если ошибка авторизации или доступа, пробуем прямой URL
        if (response.status === 401 || response.status === 403) {
          console.warn('Auth error, trying direct URL');
          return this.getAudioDirectUrl(id);
        }
        throw new Error(`Ошибка загрузки аудио: ${response.status} ${response.statusText}`);
      }
      
      // Получаем Content-Type из заголовков ответа
      let contentType = response.headers.get('content-type') || '';
      
      // Нормализуем MIME тип для лучшей совместимости с мобильными браузерами
      // Поддерживаемые форматы на мобильных:
      // - audio/mpeg, audio/mp3 - универсальная поддержка
      // - audio/mp4, audio/m4a - iOS Safari, Chrome
      // - audio/webm - Chrome, Firefox, Edge
      // - audio/ogg - Firefox
      // - audio/wav - универсальный, но большой
      
      // Если тип не указан или неопределенный, пытаемся определить по URL или используем универсальный
      if (!contentType || contentType === 'application/octet-stream') {
        // Проверяем расширение файла в URL (если есть)
        const urlLower = url.toLowerCase();
        if (urlLower.includes('.mp3') || urlLower.includes('.mpeg')) {
          contentType = 'audio/mpeg';
        } else if (urlLower.includes('.mp4') || urlLower.includes('.m4a')) {
          contentType = 'audio/mp4';
        } else if (urlLower.includes('.webm')) {
          contentType = 'audio/webm';
        } else if (urlLower.includes('.ogg')) {
          contentType = 'audio/ogg';
        } else if (urlLower.includes('.wav')) {
          contentType = 'audio/wav';
        } else {
          // Используем универсальный тип, который поддерживается большинством браузеров
          contentType = 'audio/mpeg';
        }
      }
      
      // Получаем аудио как Blob
      const blob = await response.blob();
      
      // Проверяем размер файла
      if (blob.size === 0) {
        throw new Error('Получен пустой аудиофайл');
      }
      
      // Создаем Blob с правильным MIME типом для совместимости с мобильными браузерами
      // Если blob уже имеет правильный тип, используем его, иначе создаем новый с явным типом
      let audioBlob: Blob;
      if (blob.type && blob.type !== 'application/octet-stream') {
        audioBlob = blob;
      } else {
        // Создаем новый Blob с явным указанием типа
        audioBlob = new Blob([blob], { type: contentType });
      }
      
      console.log('Audio loaded:', {
        originalType: blob.type,
        contentType: contentType,
        finalType: audioBlob.type,
        size: audioBlob.size,
        sizeMB: (audioBlob.size / (1024 * 1024)).toFixed(2),
        userAgent: navigator.userAgent,
      });
      
      // Создаем object URL для использования в audio элементе
      return URL.createObjectURL(audioBlob);
    } catch (error: any) {
      console.error('Get audio URL error:', error);
      
      // Если ошибка при создании Blob URL, пробуем прямой URL
      if (error.message && (
        error.message.includes('Blob') || 
        error.message.includes('URL') ||
        error.name === 'TypeError'
      )) {
        console.warn('Blob URL failed, trying direct URL');
        return this.getAudioDirectUrl(id);
      }
      
      throw error;
    }
  },

  /**
   * Нормализация данных консультации для отображения
   */
  normalizeConsultation(consultation: ConsultationResponse): ConsultationResponse {
    return {
      ...consultation,
      id: String(consultation.id),
      clientId: consultation.clientId ? String(consultation.clientId) : undefined,
      patientId: consultation.clientId ? String(consultation.clientId) : undefined,
      patientName: consultation.client ? `${consultation.client.firstName} ${consultation.client.lastName}` : undefined,
      date: consultation.createdAt || new Date().toISOString(),
      duration: consultation.audioDuration ? `${Math.floor(consultation.audioDuration / 60)}:${String(consultation.audioDuration % 60).padStart(2, '0')}` : '0:00',
      transcript: consultation.transcriptionResult || undefined,
      summary: consultation.summary || undefined,
      complaints: consultation.complaints || undefined,
      objective: consultation.objective || undefined,
      plan: consultation.treatmentPlan || undefined,
      comments: consultation.comment || undefined,
    };
  },
};

