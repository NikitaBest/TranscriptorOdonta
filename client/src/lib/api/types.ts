/**
 * Типы для API запросов и ответов
 */

/**
 * Запрос на регистрацию пользователя
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string; // Имя (обязательное)
  lastName: string; // Фамилия (обязательное)
  middleName?: string; // Отчество (опциональное)
}

/**
 * Ответ при успешной регистрации
 */
export interface RegisterResponse {
  token: string;
  user?: User;
}

/**
 * Запрос на авторизацию
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Данные пользователя (базовые)
 */
export interface User {
  id: string;
  email: string;
  emailConfirmed?: boolean; // Статус подтверждения email
}

/**
 * Полный профиль пользователя (врача)
 */
export interface UserProfile {
  id: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  hiddenDescription?: string | null;
  phoneNumber?: string | null;
  birthDate?: string | null; // Дата в формате ISO (YYYY-MM-DD)
  gender?: number | null; // 0 - не указан, 1 - мужской, 2 - женский и т.д.
  additional?: {
    rootElement?: string | null;
  } | null;
  email?: string; // Email может быть в профиле
  emailConfirmed?: boolean; // Статус подтверждения email
}

/**
 * Запрос на обновление профиля пользователя
 * Все поля присутствуют в теле запроса, как в спецификации бэкенда.
 */
export interface UpdateUserProfileRequest {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  hiddenDescription: string;
  phoneNumber: string;
  birthDate: string; // Дата в формате ISO (YYYY-MM-DD)
  gender: number;
  additional: {
    rootElement: string;
  };
}

/**
 * Ответ при успешной авторизации
 */
export interface LoginResponse {
  token: string;
  user?: User;
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
  birthDate?: string; // Дата рождения в формате ISO (YYYY-MM-DD)
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
  birthDate?: string;
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
  phone?: string | null; // необязательно; при отсутствии — null
  comment?: string;
  birthDate?: string; // Дата рождения в формате ISO (YYYY-MM-DD)
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
  birthDate?: string;
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
export interface MedicalRecord {
  tenantId?: string | number;
  clientId?: string | number;
  allergy?: string | null; // Аллергия
  comorbidities?: string | null; // Сопутствующие заболевания
  anamnesis?: string | null; // Анамнез
  complaints?: string | null; // Жалобы
  diagnosis?: string | null; // Диагноз
  treatment?: string | null; // Лечение
  otherInfo?: string | null; // Другая информация
  id?: string | number;
  createdAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

/**
 * Запрос на обновление медицинской карты пациента
 * PUT /client/medical-record/update
 */
export interface UpdateMedicalRecordRequest {
  clientId: string | number;
  allergy?: string | null;
  comorbidities?: string | null;
  anamnesis?: string | null;
  complaints?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  otherInfo?: string | null;
}

/**
 * Ответ при успешном обновлении медицинской карты
 */
export interface UpdateMedicalRecordResponse {
  id?: string | number;
  clientId?: string | number;
  allergy?: string | null;
  comorbidities?: string | null;
  anamnesis?: string | null;
  complaints?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  otherInfo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientResponse {
  id: string | number;
  firstName: string;
  lastName: string;
  phone: string;
  comment?: string;
  birthDate?: string; // Дата рождения в формате ISO (YYYY-MM-DD)
  medicalRecord?: MedicalRecord | null; // Медицинская карта пациента
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
 * Свойство консультации (динамическое поле)
 */
export interface ConsultationProperty {
  id: string | number;
  consultationId: string | number;
  parentId: string | number;
  value: string | null;
  parent: {
    id: string | number;
    key: string; // complaints, objective, treatment_plan, summary, comment
    title: string; // Название поля (Жалобы, Объективный статус, и т.д.)
    description?: string;
    type?: number;
    order?: number;
    isEditable?: boolean;
  };
  createdAt?: string;
}

/**
 * Аудио запись консультации
 */
export interface AudioNote {
  id: string | number;
  consultationId: string | number;
  tempAudioPath?: string;
  externalId?: string;
  link?: string;
  durationSeconds?: number;
  transcription?: string | null;
  createdAt?: string;
}

/**
 * Консультация из API (полный ответ от бэкенда)
 */
export interface ConsultationResponse {
  id: string | number;
  type?: number; // Тип консультации
  tenantId?: string | number;
  userId?: string | number;
  clientId?: string | number;
  // Пользователь, создавший консультацию (врач)
  createdByUser?: {
    id: string | number;
    tenantId?: string | number;
    userName?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    photoUrl?: string | null;
    alias?: string | null;
  };
  client?: {
    id: string | number;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  status: ConsultationProcessingStatus; // Статус обработки (обязательное поле)
  statusMessage?: string; // Сообщение о статусе (например, "Обработка текста консультации")
  properties?: ConsultationProperty[]; // Динамические поля консультации
  audioNotes?: AudioNote[]; // Аудио записи консультации
  createdAt?: string;
  updatedAt?: string;
  // Старые поля для обратной совместимости
  tempFileName?: string;
  externalAudioFileId?: number;
  audioDuration?: number | null;
  transcriptionResult?: string | null;
  complaints?: string | null;
  objective?: string | null;
  treatmentPlan?: string | null;
  summary?: string | null;
  comment?: string | null;
  // Вычисляемые поля для совместимости
  processingStatus?: ConsultationProcessingStatus;
  patientId?: string | number;
  patientName?: string;
  doctorName?: string; // Имя врача (alias или ФИО)
  date?: string;
  duration?: string;
  plan?: string;
  comments?: string;
  transcript?: string;
  audioUrl?: string;
}

/**
 * Запрос на получение списка консультаций
 * GET /consultation/get
 */
export interface GetConsultationsRequest {
  pageNumber?: number;
  pageSize?: number;
  clientIds?: (string | number)[];
  order?: string;
}

/**
 * Запрос на обновление свойства консультации
 * PATCH /consultation/property
 */
export interface UpdateConsultationRequest {
  consultationId: string | number;
  propertyId: string | number;
  value: string;
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
 * Тип консультации
 */
export enum ConsultationType {
  PrimaryDoctorClient = 1, // Первичная консультация
  SecondaryDoctorClient = 2, // Вторичная консультация
  CoordinatorClient = 3, // Консультация координатора
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
 * Запрос на подтверждение email
 */
export interface ConfirmEmailRequest {
  userId: string;
  token: string;
}

/**
 * Ответ при подтверждении email
 */
export interface ConfirmEmailResponse {
  isSuccess: boolean;
  error: string;
}

/**
 * Запрос на сброс пароля (отправка email)
 */
export interface ResetPasswordRequest {
  email: string;
}

/**
 * Ответ при запросе сброса пароля
 */
export interface ResetPasswordResponse {
  isSuccess: boolean;
  error: string;
}

/**
 * Запрос на проверку токена сброса пароля
 */
export interface CheckResetPasswordTokenRequest {
  userId: string;
  token: string;
}

/**
 * Ответ при проверке токена сброса пароля
 */
export interface CheckResetPasswordTokenResponse {
  isSuccess: boolean;
  error: string;
}

/**
 * Запрос на смену пароля
 */
export interface ChangePasswordRequest {
  userId: string;
  token: string;
  newPassword: string;
}

/**
 * Ответ при смене пароля
 */
export interface ChangePasswordResponse {
  isSuccess: boolean;
  error: string;
}

/**
 * Ошибка API
 */
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

