import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { consultationsApi } from '@/lib/api/consultations';
import type { ConsultationResponse } from '@/lib/api/types';
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

  // Функция для обновления статуса сохранения
  const updateSavingStatus = (fieldName: string, status: Partial<SavingStatus>) => {
    onSavingStatusChange((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], ...status },
    }));
  };

  // Функция для сохранения всех полей
  const saveAllFields = async (changedField: string) => {
    updateSavingStatus(changedField, { isSaving: true, isSaved: false });

    try {
      await consultationsApi.update({
        id: consultationId,
        complaints: fields.complaints.trim() || undefined,
        objective: fields.objective.trim() || undefined,
        treatmentPlan: fields.treatmentPlan.trim() || undefined,
        summary: fields.summary.trim() || undefined,
        comment: fields.comment.trim() || undefined,
      });

      // Обновляем кэш
      if (enrichedConsultation) {
        queryClient.setQueryData(['consultation', consultationId], {
          ...enrichedConsultation,
          complaints: fields.complaints.trim() || null,
          objective: fields.objective.trim() || null,
          plan: fields.treatmentPlan.trim() || null,
          summary: fields.summary.trim() || null,
          comments: fields.comment.trim() || null,
        });
      }

      // Показываем статус "Сохранено"
      updateSavingStatus(changedField, { isSaving: false, isSaved: true });
      
      // Скрываем статус через 2 секунды
      setTimeout(() => {
        updateSavingStatus(changedField, { isSaving: false, isSaved: false });
      }, SAVED_STATUS_DISPLAY_MS);
    } catch (error) {
      console.error('Auto-save consultation error:', error);
      updateSavingStatus(changedField, { isSaving: false, isSaved: false });
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить изменения. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  };

  // Автосохранение для поля "Жалобы"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;

    // Очищаем предыдущий таймаут
    if (saveTimeoutRefs.current.complaints) {
      clearTimeout(saveTimeoutRefs.current.complaints);
    }

    // Проверяем, есть ли изменения
    const hasChanges = fields.complaints !== (originalFields.complaints || '');
    if (!hasChanges) return;

    // Устанавливаем таймаут для сохранения
    saveTimeoutRefs.current.complaints = setTimeout(() => {
      saveAllFields('complaints');
    }, AUTO_SAVE_DEBOUNCE_MS);

    // Очистка при размонтировании
    return () => {
      if (saveTimeoutRefs.current.complaints) {
        clearTimeout(saveTimeoutRefs.current.complaints);
        saveTimeoutRefs.current.complaints = null;
      }
    };
  }, [fields.complaints, consultationId, enrichedConsultation, originalFields.complaints]);

  // Автосохранение для поля "Объективный статус"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;

    if (saveTimeoutRefs.current.objective) {
      clearTimeout(saveTimeoutRefs.current.objective);
    }

    const hasChanges = fields.objective !== (originalFields.objective || '');
    if (!hasChanges) return;

    saveTimeoutRefs.current.objective = setTimeout(() => {
      saveAllFields('objective');
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.objective) {
        clearTimeout(saveTimeoutRefs.current.objective);
        saveTimeoutRefs.current.objective = null;
      }
    };
  }, [fields.objective, consultationId, enrichedConsultation, originalFields.objective]);

  // Автосохранение для поля "План лечения"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;

    if (saveTimeoutRefs.current.treatmentPlan) {
      clearTimeout(saveTimeoutRefs.current.treatmentPlan);
    }

    const hasChanges = fields.treatmentPlan !== (originalFields.plan || '');
    if (!hasChanges) return;

    saveTimeoutRefs.current.treatmentPlan = setTimeout(() => {
      saveAllFields('treatmentPlan');
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.treatmentPlan) {
        clearTimeout(saveTimeoutRefs.current.treatmentPlan);
        saveTimeoutRefs.current.treatmentPlan = null;
      }
    };
  }, [fields.treatmentPlan, consultationId, enrichedConsultation, originalFields.plan]);

  // Автосохранение для поля "Выжимка"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;

    if (saveTimeoutRefs.current.summary) {
      clearTimeout(saveTimeoutRefs.current.summary);
    }

    const hasChanges = fields.summary !== (originalFields.summary || '');
    if (!hasChanges) return;

    saveTimeoutRefs.current.summary = setTimeout(() => {
      saveAllFields('summary');
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.summary) {
        clearTimeout(saveTimeoutRefs.current.summary);
        saveTimeoutRefs.current.summary = null;
      }
    };
  }, [fields.summary, consultationId, enrichedConsultation, originalFields.summary]);

  // Автосохранение для поля "Комментарий врача"
  useEffect(() => {
    if (!consultationId || !enrichedConsultation) return;

    if (saveTimeoutRefs.current.comment) {
      clearTimeout(saveTimeoutRefs.current.comment);
    }

    const hasChanges = fields.comment !== (originalFields.comments || '');
    if (!hasChanges) return;

    saveTimeoutRefs.current.comment = setTimeout(() => {
      saveAllFields('comment');
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRefs.current.comment) {
        clearTimeout(saveTimeoutRefs.current.comment);
        saveTimeoutRefs.current.comment = null;
      }
    };
  }, [fields.comment, consultationId, enrichedConsultation, originalFields.comments]);
}

