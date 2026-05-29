/**
 * Конфигурация API
 */
const getBaseURL = (): string => {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error(
      'VITE_API_BASE_URL не установлен в переменных окружения. ' +
      'Пожалуйста, создайте файл .env и укажите VITE_API_BASE_URL.'
    );
  }
  return url;
};

export const API_CONFIG = {
  baseURL: getBaseURL(),
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000, // 30 секунд
} as const;

/**
 * Получить полный URL для API запроса
 */
export function getApiUrl(path: string): string {
  const base = API_CONFIG.baseURL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${cleanPath}`;
}

/** Имя файла для multipart: латиница + уникальный суффикс, если было кириллица/спецсимволы */
export function multipartSafeFileName(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const ext = dot >= 0 ? originalName.slice(dot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) : '';
  const rawBase = dot >= 0 ? originalName.slice(0, dot) : originalName;

  // ASCII-имя без проблемных символов — оставляем как есть
  if (/^[a-zA-Z0-9._-]+$/.test(rawBase + ext)) {
    return `${rawBase}${ext}`;
  }

  const base = rawBase
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  const unique = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return `${base || 'file'}_${unique}${ext || ''}`;
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  rtf: 'application/rtf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
};

/** Content-Type для части file — пустой type у File часто ломает сохранение на бэкенде */
export function mimeTypeForFileName(fileName: string, fallbackType?: string): string {
  if (fallbackType && fallbackType !== 'application/octet-stream') {
    return fallbackType;
  }
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? fallbackType ?? 'application/octet-stream';
}

/** Файл для multipart: корректный MIME, безопасное уникальное имя при необходимости */
export function fileForMultipartUpload(file: File): { blob: Blob; name: string } {
  const name = multipartSafeFileName(file.name);
  const type = mimeTypeForFileName(name, file.type);

  if (file.name === name && file.type === type) {
    return { blob: file, name };
  }
  if (file.name === name && type !== file.type) {
    return {
      blob: new File([file], name, { type, lastModified: file.lastModified }),
      name,
    };
  }
  return {
    blob: new File([file], name, { type, lastModified: file.lastModified }),
    name,
  };
}

/** Лог FormData для отладки загрузки файлов (только dev) */
export function logFormDataPayload(label: string, formData: FormData): void {
  if (!import.meta.env.DEV) return;
  const entries: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value !== 'string') {
      const f = value;
      entries[key] = `[File] name=${f.name || 'blob'}, size=${f.size}, type=${f.type || '—'}`;
    } else {
      entries[key] = value;
    }
  });
  console.log(`[API FormData] ${label}`, entries);
}

/** Подсказка при типичной ошибке сохранения на dev-backend */
export function formatClientDocumentUploadError(message: string): string {
  if (/сохранении файла/i.test(message)) {
    return (
      `${message} Запрос к API сформирован верно — сбой на сервере при записи в хранилище. ` +
      'Проверьте загрузку в Swagger или обратитесь к команде бэкенда (dev-backend.ai.odonta.ru).'
    );
  }
  return message;
}

