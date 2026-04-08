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
  clinicRole?: string | null; // Роль в клинике: "doctor", "coordinator" или null
  specialization?: string; // Специализация врача (до 50 символов)
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
   clinicRole?: string | null; // Роль в клинике (врач, координатор и т.п.)
   specialization?: string | null; // Специализация врача
  additional?: {
    rootElement?: string | null;
  } | null;
  email?: string; // Email может быть в профиле
  emailConfirmed?: boolean; // Статус подтверждения email
}

/**
 * Запрос на обновление профиля пользователя.
 * Пустые поля отправляются как null.
 */
/**
 * Врач (пользователь) тенанта. Элемент ответа GET /tenant/doctors
 */
export interface TenantDoctor {
  id: string | number;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  userName?: string | null;
  email?: string | null;
  clinicRole?: string | null;
}

export interface UpdateUserProfileRequest {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  hiddenDescription: string | null;
  phoneNumber: string | null;
  birthDate: string | null; // ISO (YYYY-MM-DD) или null
  gender: number | null;
  additional: {
    rootElement: string | null;
  };
  clinicRole: string | null;
  specialization: string | null;
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
  middleName?: string;
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
  middleName?: string | null;
  phone: string;
  comment?: string;
  birthDate?: string;
  createdAt?: string;
}

/**
 * Задача/заметка пациента (PUT /client/update)
 */
export interface ClientTask {
  id: number;
  createdAt: string; // ISO
  text: string;
  isDone: boolean;
}

/**
 * Запрос на обновление пациента
 * PUT /client/update
 */
export interface UpdatePatientRequest {
  id: string | number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null; // необязательно; при отсутствии — null
  comment?: string;
  birthDate?: string | null; // Дата рождения в формате ISO (YYYY-MM-DD) или null если пусто
  tasks?: ClientTask[];
}

/**
 * Ответ при успешном обновлении пациента
 */
export interface UpdatePatientResponse {
  id: string | number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone: string;
  comment?: string;
  birthDate?: string;
  createdAt?: string;
  updatedAt?: string;
  tasks?: ClientTask[];
}

/**
 * Запрос на получение списка пациентов
 * POST /client/get
 */
export interface GetPatientsRequest {
  page?: number;
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  id?: string | number;
  ids?: (string | number)[];
  order?: string;
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
  middleName?: string | null;
  phone: string;
  comment?: string;
  birthDate?: string; // Дата рождения в формате ISO (YYYY-MM-DD)
  medicalRecord?: MedicalRecord | null; // Медицинская карта пациента
  tasks?: ClientTask[]; // Заметки/задачи пациента
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
    roleAlias?: string | null; // Отображаемое название роли с бэкенда (например, «Врач», «Координатор»)
    clinicRole?: string | null; // Роль в клинике: doctor, coordinator и т.д.
  };
  roleAlias?: string | null; // Роль консультанта с бэкенда (на уровне консультации)
  clinicRole?: string | null; // Роль в клинике (на уровне консультации)
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
  doctorIds?: (string | number)[];
  search?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
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
 * Запрос на повторную отправку письма подтверждения email (со страницы настроек)
 */
export interface ResendConfirmationEmailRequest {
  email: string;
}

/**
 * Ответ при запросе повторной отправки письма подтверждения
 */
export interface ResendConfirmationEmailResponse {
  isSuccess: boolean;
  error?: string;
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

// ——— Кошелёк / оплаты (wallet, payments) ———

/**
 * Баланс тенанта (ответ GET /tenant/balance)
 */
export interface WalletBalanceResponse {
  /** Доступное количество секунд для обработки консультаций */
  availableSeconds: number;
  /** Доступное количество минут */
  availableMinutes: number;
}

/**
 * Запрос на инициацию платежа (покупка минут). Тело POST /tenant/balance/payment/initiate
 */
export interface CreatePaymentRequest {
  /** Количество минут к покупке (на бэкенд уходит как minutesToPurchase) */
  minutes: number;
}

/**
 * Ответ инициации платежа. Значение value в ответе POST /tenant/balance/payment/initiate
 */
export interface InitiatePaymentResponse {
  success: boolean;
  errorCode?: string;
  message?: string;
  paymentId: string;
  id: string;
  amount: number;
  paymentURL: string;
}

/**
 * Элемент истории пополнений/списаний
 */
export interface WalletTransactionItem {
  id: string;
  type: 'credit' | 'debit'; // пополнение / списание
  minutes: number;
  amountRub?: number;
  description?: string;
  createdAt: string; // ISO
}

/**
 * История операций по кошельку
 */
export interface WalletHistoryResponse {
  items: WalletTransactionItem[];
  total?: number;
}

/** Элемент истории платежей (пополнения баланса). Ответ GET /tenant/balance/payment-history */
export interface PaymentHistoryItem {
  id: string;
  createdAt: string; // ISO
  tenantId: string;
  amount: number; // сумма в рублях
  secondsPurchased: number;
  pricePerSecond: number;
  externalProvider?: string;
  externalPaymentId?: string;
  status: number;
  externalStatus?: string;
  paidAt?: string; // ISO, когда оплачено
}

/** Пагинированный ответ истории платежей (value в обёртке isSuccess/error/value) */
export interface PaymentHistoryResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  data: PaymentHistoryItem[];
}

/** Элемент истории списания баланса за консультацию. GET /tenant/balance/usage-history */
export interface UsageHistoryItem {
  id: string;
  createdAt: string; // ISO
  tenantId: string;
  consultationId: string;
  secondsUsed: number;
  balanceBefore: number;
  balanceAfter: number;
  consultation?: {
    id: string;
    clientId?: string;
    client?: { firstName?: string; lastName?: string };
  };
}

/** Пагинированный ответ истории списаний (value в обёртке isSuccess/error/value) */
export interface UsageHistoryResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  data: UsageHistoryItem[];
}

/** Уровень тарифа. Элемент ответа GET /tenant/balance/tariff */
export interface TariffItem {
  minSeconds: number;
  minMinutes: number;
  pricePerSecond: number;
  pricePerMinuteDisplay: number;
}

/** Статус платежа. Ответ GET /tenant/balance/payment/{id}/status (поле value) */
export interface PaymentStatusResponse {
  id: string;
  externalPaymentId?: string;
  status: string;
  amount: number;
  success: boolean;
  errorCode?: string;
  message?: string;
  localStatus?: string;
  externalPaymentStatus?: string;
}

