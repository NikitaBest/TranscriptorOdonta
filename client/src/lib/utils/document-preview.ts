import { ApiClient } from '@/lib/api/client';
import { API_CONFIG, mimeTypeForFileName } from '@/lib/api/config';
import type { ClientDocument } from '@/lib/api/types';

export type DocumentPreviewKind =
  | 'image'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'text'
  | 'office'
  | 'iframe';

export function getDocumentFileUrl(doc: ClientDocument | null): string | null {
  const url = doc?.file?.url?.trim();
  return url || null;
}

export function getDocumentTitle(doc: ClientDocument): string {
  return doc.title?.trim() || doc.file?.fileName || 'Без названия';
}

export function getFileExtension(doc: ClientDocument): string {
  const fromExt = doc.file?.extension?.replace(/^\./, '').toLowerCase();
  if (fromExt) return fromExt;
  const name = doc.file?.fileName || '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function resolveDocumentContentType(doc: ClientDocument): string {
  const fromApi = doc.file?.contentType?.trim();
  const fileName = doc.file?.fileName || doc.title || 'file';
  if (fromApi && fromApi !== 'application/octet-stream') {
    return fromApi;
  }
  return mimeTypeForFileName(fileName, fromApi || undefined);
}

export function getDocumentPreviewKind(doc: ClientDocument): DocumentPreviewKind {
  const contentType = resolveDocumentContentType(doc).toLowerCase();
  const ext = getFileExtension(doc);

  if (contentType.startsWith('image/') || /^(jpe?g|png|gif|webp|heic|bmp|svg|avif)$/.test(ext)) {
    return 'image';
  }
  if (contentType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (contentType.startsWith('video/') || /^(mp4|webm|ogg|mov|m4v)$/.test(ext)) {
    return 'video';
  }
  if (contentType.startsWith('audio/') || /^(mp3|wav|ogg|m4a|aac|flac)$/.test(ext)) {
    return 'audio';
  }
  if (
    /^(docx?|xls|xlsx|ppt|pptx)$/.test(ext) ||
    contentType.includes('wordprocessingml') ||
    contentType.includes('msword') ||
    contentType.includes('spreadsheetml') ||
    contentType.includes('ms-excel') ||
    contentType.includes('presentationml') ||
    contentType.includes('ms-powerpoint')
  ) {
    return 'office';
  }
  if (
    contentType.startsWith('text/') ||
    contentType === 'application/json' ||
    contentType === 'application/xml' ||
    contentType === 'application/javascript' ||
    /^(txt|md|markdown|json|xml|csv|html?|css|js|ts|tsx|jsx|log|rtf|yaml|yml)$/.test(ext)
  ) {
    return 'text';
  }
  return 'iframe';
}

/** Файл на внешнем хранилище (S3) — fetch заблокирован CORS, используем прямой URL или внешний viewer. */
export function isExternalStorageUrl(url: string): boolean {
  try {
    const apiOrigin = new URL(API_CONFIG.baseURL).origin;
    const fileOrigin = new URL(url).origin;
    return fileOrigin !== apiOrigin;
  } catch {
    return true;
  }
}

/** Можно ли безопасно загрузить файл через fetch (same-origin API). */
export function canFetchDocumentBlob(url: string): boolean {
  return !isExternalStorageUrl(url);
}

/** Microsoft Office Online — просмотр Word/Excel/PowerPoint без fetch на клиенте. */
export function getOfficeViewerUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

/** Google Docs Viewer — просмотр PDF через прокси (обходит CORS и Content-Disposition). */
export function getPdfViewerUrl(fileUrl: string): string {
  return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}

/** URL для встроенного iframe в зависимости от типа файла. */
export function getEmbeddedViewerUrl(fileUrl: string, kind: DocumentPreviewKind): string {
  if (kind === 'office') return getOfficeViewerUrl(fileUrl);
  if (kind === 'pdf') return getPdfViewerUrl(fileUrl);
  return fileUrl;
}

const MAX_TEXT_PREVIEW_BYTES = 512 * 1024;

/** Загрузка текста — только для same-origin URL (API), где CORS не блокирует fetch. */
export async function fetchDocumentText(url: string, contentType: string): Promise<string> {
  const headers: Record<string, string> = {};
  const token = ApiClient.getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const type = contentType || blob.type || 'text/plain';
  const normalized =
    !blob.type || blob.type === 'application/octet-stream'
      ? new Blob([blob], { type })
      : blob;

  let text = await normalized.text();
  if (normalized.size > MAX_TEXT_PREVIEW_BYTES) {
    text = `${text.slice(0, MAX_TEXT_PREVIEW_BYTES)}\n\n… (показана только часть файла)`;
  }
  return text;
}

export function formatDocumentFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function sanitizeDownloadFileName(name: string): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  return cleaned || 'download';
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeDownloadFileName(fileName);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Прямое скачивание по URL (когда fetch заблокирован CORS). */
function triggerDirectDownload(url: string, fileName: string): void {
  const safeName = sanitizeDownloadFileName(fileName);

  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    iframe.remove();
  }, 120_000);
}

export type DocumentDownloadResult = 'blob' | 'direct';

/**
 * Скачать файл документа.
 * Сначала пробует fetch → blob (same-origin или S3 с CORS),
 * иначе — прямую навигацию по presigned URL.
 */
export async function downloadDocumentFile(
  url: string,
  fileName: string,
  contentType?: string
): Promise<DocumentDownloadResult> {
  const safeName = sanitizeDownloadFileName(fileName);
  const headers: Record<string, string> = {};

  if (!isExternalStorageUrl(url)) {
    const token = ApiClient.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const type = contentType || blob.type || 'application/octet-stream';
    const typedBlob =
      !blob.type || blob.type === 'application/octet-stream'
        ? new Blob([blob], { type })
        : blob;

    triggerBlobDownload(typedBlob, safeName);
    return 'blob';
  } catch {
    triggerDirectDownload(url, safeName);
    return 'direct';
  }
}

export function getDocumentDownloadFileName(doc: ClientDocument): string {
  return doc.file?.fileName?.trim() || getDocumentTitle(doc);
}

export { MAX_TEXT_PREVIEW_BYTES };
