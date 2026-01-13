import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { consultationsApi } from '@/lib/api/consultations';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import { 
  getAllSavedRecordings, 
  buildAudioBlob, 
  deleteChunks, 
  deleteRecordingMetadata 
} from '@/lib/utils/audio-storage';

const RETRY_INTERVAL = 10000; // 10 секунд

/**
 * Хук для фоновой отправки записей из IndexedDB
 * Автоматически пытается отправить все сохраненные записи каждые 10 секунд
 */
export function useBackgroundUpload() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);
  const isUploadingRef = useRef(false);

  useEffect(() => {
    const uploadPendingRecordings = async () => {
      // Предотвращаем параллельные запуски
      if (isUploadingRef.current) {
        return;
      }

      try {
        isUploadingRef.current = true;
        
        // Получаем все сохраненные записи из IndexedDB
        const savedRecordings = await getAllSavedRecordings();
        
        if (savedRecordings.length === 0) {
          return;
        }

        console.log(`[Background Upload] Found ${savedRecordings.length} pending recording(s)`);

        // Отправляем записи по очереди
        for (const recording of savedRecordings) {
          try {
            // Собираем Blob из IndexedDB
            const audioBlob = await buildAudioBlob(recording.id);
            
            if (!audioBlob || audioBlob.size === 0) {
              console.warn(`[Background Upload] Failed to build blob for recording ${recording.id}`);
              continue;
            }

            console.log(`[Background Upload] Attempting to upload recording ${recording.id} for patient ${recording.patientId}`);

            // Пытаемся отправить
            const response = await consultationsApi.uploadConsultation(recording.patientId, audioBlob);
            
            console.log(`[Background Upload] Successfully uploaded recording ${recording.id}`, response);

            // После успешной отправки удаляем локальный файл
            await deleteChunks(recording.id);
            await deleteRecordingMetadata(recording.id);

            // Инвалидируем кэш консультаций
            queryClient.invalidateQueries({ queryKey: ['consultations'] });
            queryClient.invalidateQueries({ queryKey: ['patient-consultations'] });

            console.log(`[Background Upload] Deleted local recording ${recording.id} after successful upload`);
          } catch (error) {
            // Ошибка при отправке одной записи - продолжаем с другими
            console.error(`[Background Upload] Failed to upload recording ${recording.id}:`, error);
            
            // Проверяем, не критична ли ошибка (например, файл слишком большой)
            if (error instanceof Error) {
              const errorText = error.message.toLowerCase();
              if (errorText.includes('размер') || errorText.includes('size') || errorText.includes('too large')) {
                // Если файл слишком большой, удаляем его, чтобы не пытаться бесконечно
                console.warn(`[Background Upload] Recording ${recording.id} is too large, removing it`);
                await deleteChunks(recording.id);
                await deleteRecordingMetadata(recording.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Background Upload] Error in upload process:', error);
      } finally {
        isUploadingRef.current = false;
      }
    };

    // Запускаем первую попытку сразу
    uploadPendingRecordings();

    // Затем запускаем каждые 10 секунд
    intervalRef.current = window.setInterval(uploadPendingRecordings, RETRY_INTERVAL);

    // Очистка при размонтировании
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [queryClient]);
}

