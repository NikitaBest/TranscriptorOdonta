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
 * Консультация из API
 */
export interface ConsultationResponse {
  id: string | number;
  patientId?: string | number;
  patientName?: string;
  date: string;
  duration: string;
  status: 'processing' | 'ready' | 'error' | 'recording';
  summary: string;
  complaints?: string;
  objective?: string;
  plan?: string;
  comments?: string;
  transcript?: string;
  audioUrl?: string;
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
 * Ошибка API
 */
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

