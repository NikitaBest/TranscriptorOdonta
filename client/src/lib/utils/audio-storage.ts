/**
 * Утилита для сохранения аудио chunks в IndexedDB во время записи
 * Защищает от потери данных при отключении интернета или закрытии браузера
 */

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
}

let dbInstance: IDBDatabase | null = null;

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
  } catch (error) {
    console.error('Error saving audio chunk:', error);
    // Не пробрасываем ошибку, чтобы не прерывать запись
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
    console.error('Error getting chunks:', error);
    return [];
  }
}

/**
 * Сборка Blob из chunks
 */
export async function buildAudioBlob(recordingId: string): Promise<Blob | null> {
  try {
    const chunks = await getAllChunks(recordingId);
    
    if (chunks.length === 0) {
      return null;
    }

    // Определяем MIME тип из первого chunk
    const mimeType = chunks[0].mimeType;
    
    // Собираем все данные chunks
    const blobParts = chunks.map(chunk => chunk.data);
    
    return new Blob(blobParts, { type: mimeType });
  } catch (error) {
    console.error('Error building audio blob:', error);
    return null;
  }
}

/**
 * Удаление всех chunks для записи
 */
export async function deleteChunks(recordingId: string): Promise<void> {
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
    console.error('Error deleting chunks:', error);
    // Не пробрасываем ошибку
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

