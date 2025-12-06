/**
 * Типы для API запросов и ответов
 */

/**
 * Запрос на регистрацию пользователя
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Ответ при успешной регистрации
 */
export interface RegisterResponse {
  token: string;
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Запрос на авторизацию
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Ответ при успешной авторизации
 */
export interface LoginResponse {
  token: string;
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Ответ при обновлении токена
 */
export interface RefreshTokenResponse {
  token: string;
}

/**
 * Запрос на создание пациента
 */
export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  phone: string;
  comment?: string;
}

/**
 * Ответ при успешном создании пациента
 */
export interface CreatePatientResponse {
  id: string | number;
  firstName: string;
  lastName: string;
  phone: string;
  comment?: string;
  createdAt?: string;
}

/**
 * Запрос на обновление пациента
 * PUT /client/update
 */
export interface UpdatePatientRequest {
  id: string | number;
  firstName: string;
  lastName: string;
  phone: string;
  comment?: string;
}

/**
 * Ответ при успешном обновлении пациента
 */
export interface UpdatePatientResponse {
  id: string | number;
  firstName: string;
  lastName: string;
  phone: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Запрос на получение списка пациентов
 * POST /client/get
 */
export interface GetPatientsRequest {
  page?: number;
  pageSize?: number;
  search?: string;
  id?: string | number;
}

/**
 * Пациент из API
 */
export interface PatientResponse {
  id: string | number;
  firstName: string;
  lastName: string;
  phone: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Ответ при получении списка пациентов
 */
export interface GetPatientsResponse {
  data: PatientResponse[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * Обёрнутый ответ от API (стандартный формат бэкенда)
 */
export interface ApiResponse<T> {
  value: T;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Консультация из API (полный ответ от бэкенда)
 */
export interface ConsultationResponse {
  id: string | number;
  tempFileName?: string;
  externalAudioFileId?: number;
  audioDuration?: number | null;
  transcriptionResult?: string | null;
  complaints?: string | null;
  objective?: string | null;
  treatmentPlan?: string | null;
  summary?: string | null;
  comment?: string | null;
  tenantId?: number;
  userId?: number;
  clientId?: string | number;
  client?: {
    id: string | number;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  // Статус обработки от бэкенда (может быть в разных полях)
  processingStatus?: ConsultationProcessingStatus;
  status?: ConsultationProcessingStatus | 'processing' | 'ready' | 'error' | 'recording';
  // Вычисляемые поля для совместимости
  patientId?: string | number;
  patientName?: string;
  date?: string;
  duration?: string;
  plan?: string;
  comments?: string;
  transcript?: string;
  audioUrl?: string;
}

/**
 * Запрос на получение списка консультаций
 * POST /note/get
 */
export interface GetConsultationsRequest {
  page?: number;
  pageSize?: number;
  clientId?: string | number;
  search?: string;
}

/**
 * Запрос на обновление консультации
 * PUT /note/update
 */
export interface UpdateConsultationRequest {
  id: string | number;
  complaints?: string;
  objective?: string;
  treatmentPlan?: string;
  summary?: string;
  comment?: string;
}

/**
 * Ответ при получении списка консультаций
 */
export interface GetConsultationsResponse {
  data: ConsultationResponse[];
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalCount?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

/**
 * Статус обработки консультации
 */
export enum ConsultationProcessingStatus {
  None = 0,
  InProgress = 1,
  Failed = 2,
  Completed = 3,
}

/**
 * Ответ при загрузке аудиофайла консультации
 */
export interface UploadConsultationResponse {
  id: string | number;
  clientId: string | number;
  status: ConsultationProcessingStatus;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Ошибка API
 */
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

