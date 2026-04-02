/**
 * Диагностика цепочки аудио: запись → IndexedDB → сборка blob → загрузка.
 *
 * Включение подробных логов:
 * - dev-сборка: по умолчанию включено;
 * - прод: в консоли `localStorage.setItem('odonta_audio_debug', '1')` и обновить страницу;
 * - или до загрузки приложения: `window.__ODONTA_AUDIO_DEBUG = true`;
 * выключить подробные логи (в т.ч. в dev): `localStorage.setItem('odonta_audio_debug', '0')`;
 * снова включить в проде: `'1'`; убрать ключ — в dev снова будет verbose по умолчанию.
 */

const STORAGE_KEY = 'odonta_audio_debug';
const PREFIX = '[Odonta:Audio]';

declare global {
  interface Window {
    __ODONTA_AUDIO_DEBUG?: boolean;
  }
}

export function isAudioPipelineDebugEnabled(): boolean {
  if (typeof window !== 'undefined' && window.__ODONTA_AUDIO_DEBUG === true) {
    return true;
  }
  try {
    const flag = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (flag === '0') {
      return false;
    }
    if (flag === '1') {
      return true;
    }
  } catch {
    /* private mode и т.п. */
  }
  return import.meta.env.DEV;
}

/** Подробности — только при включённой отладке. */
export function audioDebug(...args: unknown[]) {
  if (!isAudioPipelineDebugEnabled()) return;
  console.log(PREFIX, ...args);
}

export function audioDebugWarn(...args: unknown[]) {
  if (!isAudioPipelineDebugEnabled()) return;
  console.warn(PREFIX, ...args);
}

/**
 * Целостность / сбои — всегда в консоль (и в проде), чтобы не пропускать проблемы с битым файлом.
 */
export function audioIntegrityError(...args: unknown[]) {
  console.error(PREFIX, 'INTEGRITY', ...args);
}

export function audioIntegrityWarn(...args: unknown[]) {
  console.warn(PREFIX, 'INTEGRITY', ...args);
}

export function audioDebugGroup(label: string, fn: () => void) {
  if (!isAudioPipelineDebugEnabled()) {
    fn();
    return;
  }
  console.groupCollapsed(PREFIX, label);
  try {
    fn();
  } finally {
    console.groupEnd();
  }
}

/** Краткая сводка по Blob перед отправкой / после сборки. */
export function audioDebugBlobSummary(blob: Blob, context: string, extra?: Record<string, unknown>) {
  const line = {
    context,
    size: blob.size,
    sizeKB: (blob.size / 1024).toFixed(1),
    sizeMB: (blob.size / (1024 * 1024)).toFixed(3),
    type: blob.type || '(mime пустой)',
    ...extra,
  };
  if (blob.size === 0) {
    audioIntegrityWarn('нулевой размер blob', line);
    return;
  }
  audioDebug('Blob', line);
}

/**
 * Первые байты файла (hex) и простая эвристика контейнера — только в режиме отладки.
 * Не гарантирует валидность всего файла, но помогает заметить пустой/очевидно неверный заголовок.
 */
export async function audioDebugBlobHeaderSample(blob: Blob, context: string): Promise<void> {
  if (!isAudioPipelineDebugEnabled()) return;
  if (blob.size === 0) {
    audioDebug('header: blob пустой', { context });
    return;
  }
  const n = Math.min(32, blob.size);
  const buf = await blob.slice(0, n).arrayBuffer();
  const bytes = new Uint8Array(buf);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
  const hints: string[] = [];
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    hints.push('EBML (часто WebM/Matroska)');
  }
  if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    hints.push('Ogg');
  }
  if (bytes.length >= 8) {
    const tag = new TextDecoder().decode(bytes.slice(4, 8));
    if (tag === 'ftyp') hints.push('ISO BMFF (часто MP4/M4A)');
  }
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF') {
    hints.push('RIFF (часто WAV)');
  }
  audioDebug('header sample', { context, hex, hints: hints.length ? hints : ['не распознан'] });
}

export function audioUploadMilestone(message: string, data?: Record<string, unknown>) {
  if (!isAudioPipelineDebugEnabled()) return;
  console.log(PREFIX, 'UPLOAD', message, data ?? '');
}
