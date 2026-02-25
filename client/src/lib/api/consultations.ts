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
import { ConsultationProcessingStatus, ConsultationType } from './types';

/**
 * API функции для работы с консультациями
 */
export const consultationsApi = {
  /**
   * Загрузка аудиофайла консультации
   * POST /consultation/upload
   * @param clientId - ID пациента
   * @param audioFile - аудиофайл (Blob или File)
   * @param type - тип консультации (обязательный)
   * @returns информация о созданной консультации
   */
  async uploadConsultation(
    clientId: string | number,
    audioFile: Blob | File,
    type: ConsultationType
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
    
    // Добавляем все поля в FormData для нового эндпоинта
    formData.append('clientId', String(clientId)); // ID пациента
    formData.append('type', String(type)); // Тип консультации (1, 2 или 3)
    formData.append('file', fileToUpload); // Аудиофайл

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
        'consultation/upload',
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
          status: response.value.status ?? ConsultationProcessingStatus.None,
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
   * GET /consultation/{id}
   */
  async getById(id: string | number): Promise<ConsultationResponse | null> {
    try {
      const response = await ApiClient.get<ApiResponse<ConsultationResponse>>(
        `consultation/${id}`,
        { requireAuth: true }
      );

      if (response.isSuccess && response.value) {
        // Используем normalizeConsultation для обработки новой структуры
        const normalized = this.normalizeConsultation(response.value);
        
        // Логируем для отладки
        console.log(`[Get Consultation By ID] Consultation ${id} loaded:`, {
          hasClientId: !!normalized.clientId,
          hasClient: !!normalized.client,
          hasAudioNotes: !!(normalized.audioNotes && normalized.audioNotes.length > 0),
          propertiesCount: normalized.properties?.length || 0,
        });
        
        return normalized;
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
   * GET /consultation/get
   */
  async get(params?: GetConsultationsRequest): Promise<ConsultationResponse[]> {
    // Формируем query параметры для GET запроса
    const queryParams = new URLSearchParams();
    
    if (params?.pageNumber) {
      queryParams.append('pageNumber', String(params.pageNumber));
    } else {
      queryParams.append('pageNumber', '1');
    }
    
    if (params?.pageSize) {
      queryParams.append('pageSize', String(params.pageSize));
    } else {
      queryParams.append('pageSize', '20');
    }
    
    // Добавляем clientIds только если они указаны и массив не пустой
    if (params?.clientIds && params.clientIds.length > 0) {
      params.clientIds.forEach(id => queryParams.append('clientIds', String(id)));
    }
    
    // Добавляем order если указан
    if (params?.order) {
      queryParams.append('order', params.order);
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `consultation/get?${queryString}` : 'consultation/get';
    
    const response = await ApiClient.get<ApiResponse<GetConsultationsResponse | ConsultationResponse[]>>(
      url,
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
   * Получение одной страницы консультаций (для постраничной подгрузки).
   * @returns { data, hasNext } — данные страницы и флаг «есть ли ещё страницы»
   */
  async getConsultationsPage(params: {
    pageNumber: number;
    pageSize: number;
    order?: string;
    clientIds?: (string | number)[];
  }): Promise<{ data: ConsultationResponse[]; hasNext: boolean }> {
    const pageSize = params.pageSize ?? 20;
    const queryParams = new URLSearchParams();
    queryParams.append('pageNumber', String(params.pageNumber));
    queryParams.append('pageSize', String(pageSize));
    if (params.order) queryParams.append('order', params.order);
    if (params.clientIds?.length) params.clientIds.forEach(id => queryParams.append('clientIds', String(id)));

    const response = await ApiClient.get<ApiResponse<GetConsultationsResponse | ConsultationResponse[]>>(
      `consultation/get?${queryParams.toString()}`,
      { requireAuth: true }
    );

    let data: ConsultationResponse[] = [];
    let hasNext = false;

    if (response.isSuccess && response.value) {
      if (Array.isArray(response.value)) {
        data = response.value.map(c => this.normalizeConsultation(c));
        hasNext = data.length === pageSize;
      } else if ('data' in response.value && Array.isArray(response.value.data)) {
        data = response.value.data.map(c => this.normalizeConsultation(c));
        const raw = response.value as GetConsultationsResponse;
        hasNext = raw.hasNext ?? data.length === pageSize;
      }
    }

    return { data, hasNext };
  },

  /**
   * Обновление свойства консультации
   * PATCH /consultation/property
   */
  async update(data: UpdateConsultationRequest): Promise<ConsultationResponse> {
    const response = await ApiClient.request<ApiResponse<ConsultationResponse>>(
      'PATCH',
      'consultation/property',
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
   * DELETE /consultation/{id}
   */
  async delete(id: string | number): Promise<void> {
    await ApiClient.delete(`consultation/${id}`, { requireAuth: true });
  },


  /**
   * Переобработка консультации
   * POST /consultation/reprocess
   * Перезапускает весь пайплайн обработки консультации: очищает историю шагов и очередь заданий, перепланирует выполнение с начала
   */
  async reprocess(id: string | number): Promise<ConsultationResponse> {
    const response = await ApiClient.post<ApiResponse<ConsultationResponse>>(
      'consultation/reprocess',
      { id: String(id) },
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
   * Примечание: эндпоинт для получения аудио может отличаться, уточнить у бэкенда
   */
  getAudioDirectUrl(id: string | number): string {
    // ПРИМЕЧАНИЕ: Прямой URL не будет работать для audio элемента, если сервер требует POST
    // Audio элемент может использовать только GET запросы
    // Поэтому для прямого URL мы все равно возвращаем URL с токеном,
    // но он может не работать, если сервер требует POST
    const url = getApiUrl(`consultation/${id}/audio`);
    const token = ApiClient.getAuthToken();
    
    // Для мобильных браузеров audio элемент не может использовать заголовки Authorization
    // Если сервер поддерживает токен в query параметре, добавляем его
    // ВАЖНО: Если сервер требует POST, прямой URL не будет работать с audio элементом
    // В этом случае нужно использовать Blob URL через getAudioUrl
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
    
    return url;
  },

  /**
   * Получение URL аудиофайла консультации
   * Использует link из audioNotes, если он доступен
   * @param id - ID консультации
   * @param consultationData - данные консультации (опционально, для получения link из audioNotes)
   * @returns Promise с прямой ссылкой на аудио или прямой URL
   */
  async getAudioUrl(id: string | number, consultationData?: ConsultationResponse): Promise<string> {
    // Сначала проверяем, есть ли link в audioNotes консультации
    if (consultationData?.audioNotes && Array.isArray(consultationData.audioNotes) && consultationData.audioNotes.length > 0) {
      const firstAudio = consultationData.audioNotes[0];
      if (firstAudio.link) {
        console.log(`[Get Audio URL] Using link from audioNotes: ${firstAudio.link}`);
        return firstAudio.link; // Возвращаем прямую ссылку на S3
      }
    }
    
    // Если данных консультации нет, пытаемся получить их из кэша
    // Это можно сделать через queryClient, но проще передать consultationData при вызове
    
    // Fallback: если link нет, возвращаем прямой URL (старый способ)
    console.warn(`[Get Audio URL] No link in audioNotes for consultation ${id}, using direct URL fallback`);
    return this.getAudioDirectUrl(id);
  },

  /**
   * Нормализация данных консультации для отображения
   * Извлекает данные из properties массива и audioNotes
   */
  normalizeConsultation(consultation: ConsultationResponse): ConsultationResponse {
    // ВАЖНО: Сохраняем исходный createdAt из API, так как это единственный надежный источник времени
    const originalCreatedAt = consultation.createdAt;
    const isValidCreatedAt = originalCreatedAt && !isNaN(new Date(originalCreatedAt).getTime());
    
    // Извлекаем данные из properties массива (новая структура)
    let complaints: string | null = null;
    let objective: string | null = null;
    let treatmentPlan: string | null = null;
    let summary: string | null = null;
    let comment: string | null = null;
    
    if (consultation.properties && Array.isArray(consultation.properties)) {
      consultation.properties.forEach((prop) => {
        const key = prop.parent?.key;
        const value = prop.value;
        
        switch (key) {
          case 'complaints':
            complaints = value;
            break;
          case 'objective':
            objective = value;
            break;
          case 'treatment_plan':
            treatmentPlan = value;
            break;
          case 'summary':
            summary = value;
            break;
          case 'comment':
            comment = value;
            break;
        }
      });
    }
    
    // Извлекаем транскрипцию и аудио URL из audioNotes (новая структура)
    let transcriptionResult: string | null = null;
    let audioDuration: number | null = null;
    let audioUrl: string | null = null;
    
    if (consultation.audioNotes && Array.isArray(consultation.audioNotes) && consultation.audioNotes.length > 0) {
      // Берем первую аудио запись
      const firstAudio = consultation.audioNotes[0];
      transcriptionResult = firstAudio.transcription || null;
      audioDuration = firstAudio.durationSeconds ? Math.round(firstAudio.durationSeconds) : null;
      audioUrl = firstAudio.link || null; // Используем прямую ссылку на аудио из S3
    }
    
    // Определяем статус обработки
    // В новой структуре status - обязательное поле (number)
    let processingStatus: ConsultationProcessingStatus;
    
    if (typeof consultation.status === 'number') {
      processingStatus = consultation.status;
    } else if (typeof consultation.status === 'string') {
      const parsed = parseInt(consultation.status, 10);
      processingStatus = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
    } else {
      // Fallback на processingStatus для обратной совместимости
      const fallbackStatus = consultation.processingStatus;
      if (typeof fallbackStatus === 'number') {
        processingStatus = fallbackStatus;
      } else if (typeof fallbackStatus === 'string') {
        const parsed = parseInt(fallbackStatus, 10);
        processingStatus = !isNaN(parsed) ? parsed : ConsultationProcessingStatus.None;
      } else {
        processingStatus = ConsultationProcessingStatus.None;
      }
    }
    
    console.log(`[Normalize Consultation] Status for consultation ${consultation.id}:`, {
      originalStatus: consultation.status,
      processingStatus,
      statusName: ConsultationProcessingStatus[processingStatus],
      audioUrl: audioUrl || 'not found',
      hasAudioNotes: !!(consultation.audioNotes && consultation.audioNotes.length > 0),
    });
    
    // Форматируем длительность
    const duration = audioDuration 
      ? `${Math.floor(audioDuration / 60)}:${String(audioDuration % 60).padStart(2, '0')}`
      : (consultation.audioDuration ? `${Math.floor(consultation.audioDuration / 60)}:${String(consultation.audioDuration % 60).padStart(2, '0')}` : '0:00');
    
    // Определяем имя врача
    // Формат строго: "Фамилия Имя Отчество"
    let doctorName: string | undefined;
    if (consultation.createdByUser?.lastName || consultation.createdByUser?.firstName) {
      const parts = [
        consultation.createdByUser.lastName,
        consultation.createdByUser.firstName,
        consultation.createdByUser.middleName,
      ].filter(Boolean);
      doctorName = parts.join(' ');
    } else if (consultation.createdByUser?.alias) {
      // Fallback на alias, если фамилия/имя отсутствуют
      doctorName = consultation.createdByUser.alias;
    }

    // Роль с бэкенда (подпись «Врач», «Координатор» и т.д.) — с консультации или из createdByUser
    const roleAlias =
      consultation.roleAlias ?? consultation.createdByUser?.roleAlias ?? null;
    // Роль в клинике (doctor, coordinator) — с консультации или из createdByUser
    const clinicRole =
      consultation.clinicRole ?? consultation.createdByUser?.clinicRole ?? null;

    // ВАЖНО: Сохраняем ВСЕ исходные поля из consultation, чтобы не потерять данные
    return {
      ...consultation, // Сохраняем все исходные поля (включая audioNotes, properties, client, clientId)
      id: String(consultation.id),
      clientId: consultation.clientId ? String(consultation.clientId) : undefined,
      patientId: consultation.clientId ? String(consultation.clientId) : undefined,
      patientName: consultation.client ? `${consultation.client.firstName} ${consultation.client.lastName}` : undefined,
      doctorName,
      roleAlias,
      clinicRole,
      createdAt: isValidCreatedAt ? originalCreatedAt : (consultation.createdAt || consultation.date),
      date: isValidCreatedAt ? originalCreatedAt : (consultation.createdAt || consultation.date || new Date().toISOString()),
      // Данные из properties (дополняем, не заменяем)
      complaints: complaints || consultation.complaints || null,
      objective: objective || consultation.objective || null,
      treatmentPlan: treatmentPlan || consultation.treatmentPlan || null,
      summary: summary || consultation.summary || null,
      comment: comment || consultation.comment || null,
      // Транскрипция из audioNotes
      transcriptionResult: transcriptionResult || consultation.transcriptionResult || null,
      transcript: transcriptionResult || consultation.transcriptionResult || consultation.transcript || null,
      // Длительность из audioNotes
      audioDuration: audioDuration || consultation.audioDuration || null,
      duration: duration,
      // URL аудио из audioNotes
      audioUrl: audioUrl || consultation.audioUrl || undefined,
      plan: treatmentPlan || consultation.treatmentPlan || consultation.plan || null,
      comments: comment || consultation.comment || consultation.comments || null,
      // Статус
      status: processingStatus,
      processingStatus: processingStatus,
      // Сообщение о статусе
      statusMessage: consultation.statusMessage || undefined,
      // КРИТИЧЕСКИ ВАЖНО: Явно сохраняем эти поля из исходного объекта
      // spread оператор сохранит их, но мы явно указываем для ясности
      audioNotes: consultation.audioNotes,
      properties: consultation.properties,
      client: consultation.client,
    };
  },
};

