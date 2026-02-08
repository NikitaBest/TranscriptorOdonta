import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { consultationsApi } from '@/lib/api/consultations';
import type { ConsultationResponse } from '@/lib/api/types';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';

// Константы
const AUTO_SAVE_DEBOUNCE_MS = 1000; // 1 секунда задержка перед сохранением
const SAVED_STATUS_DISPLAY_MS = 2000; // 2 секунды показывать статус "Сохранено"

interface ConsultationFields {
  complaints: string;
  objective: string;
  treatmentPlan: string;
  summary: string;
  comment: string;
}

interface SavingStatus {
  isSaving: boolean;
  isSaved: boolean;
}

type SavingStatusRecord = Record<string, SavingStatus>;

interface UseAutoSaveConsultationParams {
  consultationId: string | number;
  fields: ConsultationFields;
  originalFields: {
    complaints?: string | null;
    objective?: string | null;
    plan?: string | null;
    summary?: string | null;
    comments?: string | null;
  };
  enrichedConsultation: ConsultationResponse | null;
  onSavingStatusChange: (status: SavingStatusRecord | ((prev: SavingStatusRecord) => SavingStatusRecord)) => void;
}

export function useAutoSaveConsultation({
  consultationId,
  fields,
  originalFields,
  enrichedConsultation,
  onSavingStatusChange,
}: UseAutoSaveConsultationParams) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const saveTimeoutRefs = useRef<Record<string, NodeJS.Timeout | null>>({
    complaints: null,
    objective: null,
    treatmentPlan: null,
    summary: null,
    comment: null,
  });
  
  // Отслеживаем последние сохраненные значения, чтобы не сохранять повторно
  const lastSavedValuesRef = useRef<Record<string, string>>({
    complaints: originalFields.complaints || '',
    objective: originalFields.objective || '',
    treatmentPlan: originalFields.plan || '',
    summary: originalFields.summary || '',
    comment: originalFields.comments || '',
  });

  // Функция для обновления статуса сохранения
  const updateSavingStatus = (fieldName: string, status: Partial<SavingStatus>) => {
    onSavingStatusChange((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], ...status },
    }));
  };

  // Функция для получения propertyId по ключу поля
  const getPropertyId = (fieldKey: string): string | number | null => {
    if (!enrichedConsultation?.properties) {
      console.warn(`[AutoSave] Properties not available for consultation ${consultationId}`);
      return null;
    }
    const property = enrichedConsultation.properties.find(p => p.parent?.key === fieldKey);
    if (!property) {
      console.warn(`[AutoSave] Property with key "${fieldKey}" not found in consultation ${consultationId}`);
      return null;
    }
    console.log(`[AutoSave] Found property ID for ${fieldKey}:`, property.id);
    return property?.id || null;
  };

  // Функция для сохранения одного поля
  const saveField = async (fieldKey: string, fieldName: string, value: string) => {
    const trimmedValue = value.trim() || '';
    
    // Проверяем, не сохраняем ли мы уже это значение
    const lastSavedValue = lastSavedValuesRef.current[fieldName] || '';
    
    // Если значение не изменилось с момента последнего сохранения, не сохраняем
    if (lastSavedValue === trimmedValue) {
      console.log(`[AutoSave] Field ${fieldName} value unchanged (${trimmedValue}), skipping save`);
      return;
    }
    
    updateSavingStatus(fieldName, { isSaving: true, isSaved: false });

    try {
      const propertyId = getPropertyId(fieldKey);
      
      if (!propertyId) {
        console.warn(`Property ID not found for field ${fieldKey}`);
        updateSavingStatus(fieldName, { isSaving: false, isSaved: false });
        toast({
          title: "Ошибка сохранения",
          description: `Не удалось найти свойство для поля ${fieldName}.`,
          variant: "destructive",
        });
        return;
      }

      // Отправляем запрос на обновление одного свойства
      console.log(`[AutoSave] Saving field ${fieldName} (${fieldKey}):`, {
        consultationId,
        propertyId,
        value: trimmedValue,
        previousValue: lastSavedValue,
      });
      
      const updatedConsultation = await consultationsApi.update({
        consultationId: String(consultationId),
        propertyId: String(propertyId),
        value: trimmedValue,
      });

      console.log(`[AutoSave] Field ${fieldName} saved successfully`);
      console.log(`[AutoSave] Updated consultation from API:`, {
        hasClientId: !!updatedConsultation.clientId,
        hasClient: !!updatedConsultation.client,
        hasAudioNotes: !!(updatedConsultation.audioNotes && updatedConsultation.audioNotes.length > 0),
        propertiesCount: updatedConsultation.properties?.length || 0,
        hasId: !!updatedConsultation.id,
      });

      // Обновляем кэш консультации, НЕ перезаписывая существующие данные
      // ВАЖНО: Бэкенд может вернуть неполные данные, поэтому мы обновляем только свойство в properties
      queryClient.setQueryData(['consultation', consultationId], (oldData: ConsultationResponse | undefined) => {
        if (!oldData) {
          // Если старых данных нет, используем обновленные данные
          console.warn(`[AutoSave] No oldData found, using updatedConsultation`);
          return {
            ...updatedConsultation,
            status: ConsultationProcessingStatus.Completed,
            processingStatus: ConsultationProcessingStatus.Completed,
          };
        }

        console.log(`[AutoSave] Old data before merge:`, {
          hasClientId: !!oldData.clientId,
          hasClient: !!oldData.client,
          hasAudioNotes: !!(oldData.audioNotes && oldData.audioNotes.length > 0),
          propertiesCount: oldData.properties?.length || 0,
        });

        // КРИТИЧЕСКИ ВАЖНО: Обновляем ТОЛЬКО измененное свойство в массиве properties
        // Все остальные данные остаются без изменений из oldData
        let updatedProperties = [...(oldData.properties || [])];
        
        // Находим обновленное свойство из ответа API
        const updatedProperty = updatedConsultation.properties?.find(p => String(p.id) === String(propertyId));
        if (updatedProperty) {
          // Заменяем только это свойство в массиве
          const propertyIndex = updatedProperties.findIndex(p => String(p.id) === String(propertyId));
          if (propertyIndex >= 0) {
            updatedProperties[propertyIndex] = updatedProperty;
          } else {
            // Если свойства не было, добавляем его
            updatedProperties.push(updatedProperty);
          }
        } else {
          console.warn(`[AutoSave] Updated property not found in API response for propertyId ${propertyId}`);
        }
        
        // Создаем обновленный объект, сохраняя ВСЕ данные из oldData
        // Обновляем только properties и статус
        const mergedConsultation: ConsultationResponse = {
          ...oldData, // ВАЖНО: Сохраняем ВСЕ старые данные (clientId, client, audioNotes, и т.д.)
          // Обновляем только properties и статус
          properties: updatedProperties,
          status: ConsultationProcessingStatus.Completed,
          processingStatus: ConsultationProcessingStatus.Completed,
          // Обновляем также вычисляемые поля из properties, если они изменились
          complaints: updatedProperty?.parent?.key === 'complaints' ? updatedProperty.value : oldData.complaints,
          objective: updatedProperty?.parent?.key === 'objective' ? updatedProperty.value : oldData.objective,
          treatmentPlan: updatedProperty?.parent?.key === 'treatment_plan' ? updatedProperty.value : oldData.treatmentPlan,
          summary: updatedProperty?.parent?.key === 'summary' ? updatedProperty.value : oldData.summary,
          comment: updatedProperty?.parent?.key === 'comment' ? updatedProperty.value : oldData.comment,
        };

        console.log(`[AutoSave] Merged consultation cache:`, {
          hasClientId: !!mergedConsultation.clientId,
          hasClient: !!mergedConsultation.client,
          hasAudioNotes: !!(mergedConsultation.audioNotes && mergedConsultation.audioNotes.length > 0),
          propertiesCount: mergedConsultation.properties?.length || 0,
          clientIdValue: mergedConsultation.clientId,
        });

        return mergedConsultation;
      });
      
      // НЕ инвалидируем запросы, чтобы не вызвать перезагрузку данных
      // Кэш уже обновлен через setQueryData выше
      // Инвалидация может вызвать перезагрузку с бэкенда, которая вернет неполные данные

      // Обновляем последнее сохраненное значение, чтобы не сохранять повторно
      lastSavedValuesRef.current[fieldName] = trimmedValue;
      console.log(`[AutoSave] Updated lastSavedValue for ${fieldName}:`, trimmedValue);

      // Показываем статус "Сохранено"
      updateSavingStatus(fieldName, { isSaving: false, isSaved: true });
      
      // Скрываем статус через 2 секунды
      setTimeout(() => {
        updateSavingStatus(fieldName, { isSaving: false, isSaved: false });
      }, SAVED_STATUS_DISPLAY_MS);
    } catch (error) {
      console.error('Auto-save consultation error:', error);
      updateSavingStatus(fieldName, { isSaving: false, isSaved: false });
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить изменения. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  };

  // Обновляем lastSavedValuesRef при изменении originalFields
  // ВАЖНО: Это гарантирует, что при загрузке новых данных с бэкенда мы обновляем отслеживаемые значения
  useEffect(() => {
    const newValues = {
      complaints: originalFields.complaints || '',
      objective: originalFields.objective || '',
      treatmentPlan: originalFields.plan || '',
      summary: originalFields.summary || '',
      comment: originalFields.comments || '',
    };
    
    // Обновляем только если значения действительно изменились
    const hasChanges = Object.keys(newValues).some(key => {
      const fieldName = key as keyof typeof newValues;
      return lastSavedValuesRef.current[fieldName] !== newValues[fieldName];
    });
    
    if (hasChanges) {
      console.log(`[AutoSave] Updating lastSavedValues from originalFields:`, newValues);
      lastSavedValuesRef.current = newValues;
    }
  }, [originalFields.complaints, originalFields.objective, originalFields.plan, originalFields.summary, originalFields.comments]);

  // Автосохранение для поля "Жалобы"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;
    
    // Проверяем, что properties загружены
    if (!enrichedConsultation.properties || enrichedConsultation.properties.length === 0) {
      console.warn('[AutoSave] Properties not loaded yet, skipping auto-save for complaints');
      return;
    }

    // Очищаем предыдущий таймаут
    if (saveTimeoutRefs.current.complaints) {
      clearTimeout(saveTimeoutRefs.current.complaints);
    }

    // Проверяем, есть ли изменения по сравнению с последним сохраненным значением
    const currentValue = fields.complaints.trim() || '';
    const lastSavedValue = lastSavedValuesRef.current.complaints || '';
    const hasChanges = currentValue !== lastSavedValue;
    
    if (!hasChanges) {
      console.log(`[AutoSave] No changes detected for complaints (current: "${currentValue}", saved: "${lastSavedValue}")`);
      return;
    }

    // Устанавливаем таймаут для сохранения
    saveTimeoutRefs.current.complaints = setTimeout(() => {
      saveField('complaints', 'complaints', fields.complaints);
    }, AUTO_SAVE_DEBOUNCE_MS);

    // Очистка при размонтировании
    return () => {
      if (saveTimeoutRefs.current.complaints) {
        clearTimeout(saveTimeoutRefs.current.complaints);
        saveTimeoutRefs.current.complaints = null;
      }
    };
  }, [fields.complaints, consultationId, enrichedConsultation]);

  // Автосохранение для поля "Объективный статус"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;
    
    if (!enrichedConsultation.properties || enrichedConsultation.properties.length === 0) {
      return;
    }

    if (saveTimeoutRefs.current.objective) {
      clearTimeout(saveTimeoutRefs.current.objective);
    }

    const currentValue = fields.objective.trim() || '';
    const lastSavedValue = lastSavedValuesRef.current.objective || '';
    const hasChanges = currentValue !== lastSavedValue;
    
    if (!hasChanges) return;

    saveTimeoutRefs.current.objective = setTimeout(() => {
      saveField('objective', 'objective', fields.objective);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.objective) {
        clearTimeout(saveTimeoutRefs.current.objective);
        saveTimeoutRefs.current.objective = null;
      }
    };
  }, [fields.objective, consultationId, enrichedConsultation]);

  // Автосохранение для поля "План лечения"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;
    
    if (!enrichedConsultation.properties || enrichedConsultation.properties.length === 0) {
      return;
    }

    if (saveTimeoutRefs.current.treatmentPlan) {
      clearTimeout(saveTimeoutRefs.current.treatmentPlan);
    }

    const currentValue = fields.treatmentPlan.trim() || '';
    const lastSavedValue = lastSavedValuesRef.current.treatmentPlan || '';
    const hasChanges = currentValue !== lastSavedValue;
    
    if (!hasChanges) return;

    saveTimeoutRefs.current.treatmentPlan = setTimeout(() => {
      saveField('treatment_plan', 'treatmentPlan', fields.treatmentPlan);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.treatmentPlan) {
        clearTimeout(saveTimeoutRefs.current.treatmentPlan);
        saveTimeoutRefs.current.treatmentPlan = null;
      }
    };
  }, [fields.treatmentPlan, consultationId, enrichedConsultation]);

  // Автосохранение для поля "Выжимка"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;
    
    if (!enrichedConsultation.properties || enrichedConsultation.properties.length === 0) {
      return;
    }

    if (saveTimeoutRefs.current.summary) {
      clearTimeout(saveTimeoutRefs.current.summary);
    }

    const currentValue = fields.summary.trim() || '';
    const lastSavedValue = lastSavedValuesRef.current.summary || '';
    const hasChanges = currentValue !== lastSavedValue;
    
    if (!hasChanges) return;

    saveTimeoutRefs.current.summary = setTimeout(() => {
      saveField('summary', 'summary', fields.summary);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.summary) {
        clearTimeout(saveTimeoutRefs.current.summary);
        saveTimeoutRefs.current.summary = null;
      }
    };
  }, [fields.summary, consultationId, enrichedConsultation]);

  // Автосохранение для поля "Комментарий врача"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;
    
    if (!enrichedConsultation.properties || enrichedConsultation.properties.length === 0) {
      return;
    }

    if (saveTimeoutRefs.current.comment) {
      clearTimeout(saveTimeoutRefs.current.comment);
    }

    const currentValue = fields.comment.trim() || '';
    const lastSavedValue = lastSavedValuesRef.current.comment || '';
    const hasChanges = currentValue !== lastSavedValue;
    
    if (!hasChanges) return;

    saveTimeoutRefs.current.comment = setTimeout(() => {
      saveField('comment', 'comment', fields.comment);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.comment) {
        clearTimeout(saveTimeoutRefs.current.comment);
        saveTimeoutRefs.current.comment = null;
      }
    };
  }, [fields.comment, consultationId, enrichedConsultation]);
}

