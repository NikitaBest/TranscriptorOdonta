/**
 * Утилита для сохранения аудио chunks в IndexedDB во время записи
 * Защищает от потери данных при отключении интернета или закрытии браузера
 */

import {
  audioDebug,
  audioIntegrityError,
  audioDebugBlobSummary,
} from '@/lib/utils/audio-debug';

const DB_NAME = 'OdontaAudioStorage';
const DB_VERSION = 2; // Увеличиваем версию для добавления хранилища метаданных
const STORE_NAME = 'audioChunks';
const METADATA_STORE_NAME = 'recordingsMetadata';

interface AudioChunk {
  id: string; // Уникальный ID записи
  chunkIndex: number; // Порядковый номер chunk
  data: Blob; // Данные chunk
  timestamp: number; // Время сохранения
  mimeType: string; // MIME тип аудио
  patientId: string; // ID пациента
}

export interface RecordingMetadata {
  id: string; // Уникальный ID записи
  patientId: string; // ID пациента
  patientName?: string; // Имя пациента (для отображения)
  timestamp: number; // Время завершения записи
  duration: number; // Длительность в секундах
  size: number; // Размер файла в байтах
  mimeType: string; // MIME тип аудио
  consultationType?: number; // Тип консультации (1, 2 или 3)
}

let dbInstance: IDBDatabase | null = null;

/** Сколько асинхронных saveAudioChunk сейчас в полёте на запись (по recordingId). */
const pendingChunkWritesByRecording = new Map<string, number>();
/** Ожидают, пока pendingChunkWritesByRecording станет 0. */
const pendingChunkWriteWaiters = new Map<string, Array<() => void>>();
/** Была ошибка put хотя бы одного чанка — собирать blob из IDB нельзя. */
const chunkWriteFailedRecordings = new Set<string>();

function beginPendingChunkWrite(recordingId: string) {
  pendingChunkWritesByRecording.set(
    recordingId,
    (pendingChunkWritesByRecording.get(recordingId) ?? 0) + 1
  );
}

function endPendingChunkWrite(recordingId: string) {
  const next = (pendingChunkWritesByRecording.get(recordingId) ?? 1) - 1;
  if (next <= 0) {
    pendingChunkWritesByRecording.delete(recordingId);
    const waiters = pendingChunkWriteWaiters.get(recordingId);
    if (waiters?.length) {
      pendingChunkWriteWaiters.delete(recordingId);
      waiters.forEach((w) => w());
    }
  } else {
    pendingChunkWritesByRecording.set(recordingId, next);
  }
}

/** Дождаться завершения всех начатых saveAudioChunk для этой записи (перед сборкой blob или удалением). */
export async function waitForPendingChunkWrites(recordingId: string): Promise<void> {
  const pendingStart = pendingChunkWritesByRecording.get(recordingId) ?? 0;
  if (pendingStart === 0) {
    return;
  }
  const t0 = performance.now();
  audioDebug('waitForPendingChunkWrites: ждём', { recordingId, pending: pendingStart });
  await new Promise<void>((resolve) => {
    let list = pendingChunkWriteWaiters.get(recordingId);
    if (!list) {
      list = [];
      pendingChunkWriteWaiters.set(recordingId, list);
    }
    list.push(resolve);
    // На случай гонки: pending обнулили между первой проверкой и push — не зависаем
    if ((pendingChunkWritesByRecording.get(recordingId) ?? 0) === 0) {
      const wake = pendingChunkWriteWaiters.get(recordingId) ?? [];
      pendingChunkWriteWaiters.delete(recordingId);
      wake.forEach((w) => w());
    }
  });
  audioDebug('waitForPendingChunkWrites: готово', {
    recordingId,
    ms: Math.round(performance.now() - t0),
  });
}

function clearRecordingWriteTracking(recordingId: string) {
  pendingChunkWritesByRecording.delete(recordingId);
  chunkWriteFailedRecordings.delete(recordingId);
  const waiters = pendingChunkWriteWaiters.get(recordingId);
  if (waiters?.length) {
    pendingChunkWriteWaiters.delete(recordingId);
    waiters.forEach((w) => w());
  }
}

function areChunkIndicesContiguousFromZero(chunks: AudioChunk[]): boolean {
  if (chunks.length === 0) return false;
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].chunkIndex !== i) return false;
  }
  return true;
}

/**
 * Инициализация IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Не удалось открыть IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Создаем хранилище для chunks
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: ['id', 'chunkIndex'] });
        objectStore.createIndex('id', 'id', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Создаем хранилище для метаданных записей
      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        const metadataStore = db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'id' });
        metadataStore.createIndex('patientId', 'patientId', { unique: false });
        metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Сохранение chunk в IndexedDB
 */
export async function saveAudioChunk(
  recordingId: string,
  chunkIndex: number,
  chunkData: Blob,
  mimeType: string,
  patientId: string
): Promise<void> {
  beginPendingChunkWrite(recordingId);
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const chunk: AudioChunk = {
      id: recordingId,
      chunkIndex,
      data: chunkData,
      timestamp: Date.now(),
      mimeType,
      patientId,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(chunk);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Не удалось сохранить chunk'));
    });
    if (chunkIndex === 0 || chunkIndex % 25 === 0) {
      audioDebug('IDB chunk OK', {
        recordingId,
        chunkIndex,
        chunkBytes: chunkData.size,
      });
    }
  } catch (error) {
    audioIntegrityError('ошибка сохранения чанка в IndexedDB', {
      recordingId,
      chunkIndex,
      error,
    });
    chunkWriteFailedRecordings.add(recordingId);
    // Не пробрасываем ошибку, чтобы не прерывать запись
  } finally {
    endPendingChunkWrite(recordingId);
  }
}

/**
 * Получение всех chunks для записи
 */
export async function getAllChunks(recordingId: string): Promise<AudioChunk[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(recordingId);
      request.onsuccess = () => {
        const chunks = request.result as AudioChunk[];
        // Сортируем по chunkIndex для правильной сборки
        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
        resolve(chunks);
      };
      request.onerror = () => reject(new Error('Не удалось получить chunks'));
    });
  } catch (error) {
    audioIntegrityError('getAllChunks', { recordingId, error });
    return [];
  }
}

/**
 * Сборка Blob из chunks
 */
export async function buildAudioBlob(recordingId: string): Promise<Blob | null> {
  try {
    await waitForPendingChunkWrites(recordingId);

    if (chunkWriteFailedRecordings.has(recordingId)) {
      audioIntegrityError('buildAudioBlob: отмена — при сохранении чанков в IDB были ошибки', {
        recordingId,
      });
      return null;
    }

    const chunks = await getAllChunks(recordingId);

    if (chunks.length === 0) {
      audioDebug('buildAudioBlob: нет чанков', { recordingId });
      return null;
    }

    const indices = chunks.map((c) => c.chunkIndex);
    if (!areChunkIndicesContiguousFromZero(chunks)) {
      audioIntegrityError('buildAudioBlob: индексы не 0..n-1 (дыра или дубликат)', {
        recordingId,
        count: chunks.length,
        indices,
      });
      return null;
    }

    // Определяем MIME тип из первого chunk
    const mimeType = chunks[0].mimeType;

    // Собираем все данные chunks (уже отсортированы в getAllChunks)
    const blobParts = chunks.map((chunk) => chunk.data);

    const blob = new Blob(blobParts, { type: mimeType });
    const totalChunkBytes = blobParts.reduce((acc, p) => acc + p.size, 0);
    audioDebugBlobSummary(blob, 'buildAudioBlob из IDB', {
      recordingId,
      chunkCount: chunks.length,
      totalChunkBytes,
      bytesMatch: totalChunkBytes === blob.size,
    });
    audioDebug('buildAudioBlob: OK', { recordingId, mimeType, chunkCount: chunks.length });
    return blob;
  } catch (error) {
    audioIntegrityError('buildAudioBlob: исключение', { recordingId, error });
    return null;
  }
}

/**
 * Удаление всех chunks для записи
 */
export async function deleteChunks(recordingId: string): Promise<void> {
  audioDebug('deleteChunks: старт', { recordingId });
  await waitForPendingChunkWrites(recordingId);

  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('id');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(recordingId);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error('Не удалось удалить chunks'));
    });
  } catch (error) {
    audioIntegrityError('deleteChunks', { recordingId, error });
    // Не пробрасываем ошибку
  } finally {
    clearRecordingWriteTracking(recordingId);
    audioDebug('deleteChunks: сброс трекинга записи', { recordingId });
  }
}

/**
 * Генерация уникального ID для записи
 */
export function generateRecordingId(): string {
  return `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Получение информации о незавершенных записях
 */
export async function getUnfinishedRecordings(): Promise<Array<{ id: string; patientId: string; timestamp: number }>> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('id');

    // Получаем все уникальные ID записей
    const allChunks = await new Promise<AudioChunk[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as AudioChunk[]);
      request.onerror = () => reject(new Error('Не удалось получить chunks'));
    });

    // Группируем по ID записи
    const recordingsMap = new Map<string, { patientId: string; timestamp: number }>();
    
    allChunks.forEach(chunk => {
      if (!recordingsMap.has(chunk.id)) {
        recordingsMap.set(chunk.id, {
          patientId: chunk.patientId,
          timestamp: chunk.timestamp,
        });
      }
    });

    return Array.from(recordingsMap.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));
  } catch (error) {
    console.error('Error getting unfinished recordings:', error);
    return [];
  }
}

/**
 * Сохранение метаданных о завершенной записи
 */
export async function saveRecordingMetadata(metadata: RecordingMetadata): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([METADATA_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Не удалось сохранить метаданные'));
    });
  } catch (error) {
    console.error('Error saving recording metadata:', error);
    throw error;
  }
}

/**
 * Получение метаданных записи
 */
export async function getRecordingMetadata(recordingId: string): Promise<RecordingMetadata | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction([METADATA_STORE_NAME], 'readonly');
    const store = transaction.objectStore(METADATA_STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(recordingId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Не удалось получить метаданные'));
    });
  } catch (error) {
    console.error('Error getting recording metadata:', error);
    return null;
  }
}

/**
 * Удаление метаданных записи
 */
export async function deleteRecordingMetadata(recordingId: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([METADATA_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(recordingId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Не удалось удалить метаданные'));
    });
  } catch (error) {
    console.error('Error deleting recording metadata:', error);
    // Не пробрасываем ошибку
  }
}

/**
 * Получение всех сохраненных записей
 */
export async function getAllSavedRecordings(): Promise<RecordingMetadata[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction([METADATA_STORE_NAME], 'readonly');
    const store = transaction.objectStore(METADATA_STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const recordings = request.result as RecordingMetadata[];
        // Сортируем по времени (новые сначала)
        recordings.sort((a, b) => b.timestamp - a.timestamp);
        resolve(recordings);
      };
      request.onerror = () => reject(new Error('Не удалось получить записи'));
    });
  } catch (error) {
    console.error('Error getting saved recordings:', error);
    return [];
  }
}

/**
 * Получение последней сохраненной записи (самой свежей)
 */
export async function getLatestSavedRecording(): Promise<RecordingMetadata | null> {
  try {
    const recordings = await getAllSavedRecordings();
    return recordings.length > 0 ? recordings[0] : null;
  } catch (error) {
    console.error('Error getting latest saved recording:', error);
    return null;
  }
}

