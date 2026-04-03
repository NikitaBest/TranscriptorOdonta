import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Mic, Pause, Play, Loader2, X, User, ChevronRight, ChevronDown, ChevronUp, Trash2, Send } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { patientsApi } from '@/lib/api/patients';
import { consultationsApi } from '@/lib/api/consultations';
import { walletApi } from '@/lib/api/wallet';
import type { PatientResponse } from '@/lib/api/types';
import { ConsultationProcessingStatus, ConsultationType } from '@/lib/api/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  saveAudioChunk, 
  buildAudioBlob, 
  deleteChunks, 
  generateRecordingId,
  saveRecordingMetadata,
  getRecordingMetadata,
  deleteRecordingMetadata,
  getLatestSavedRecording,
  getAllChunks,
  type RecordingMetadata
} from '@/lib/utils/audio-storage';
import {
  audioDebug,
  audioDebugBlobSummary,
  audioDebugBlobHeaderSample,
  audioUploadMilestone,
  audioIntegrityWarn,
} from '@/lib/utils/audio-debug';

/** Перед stop: форсируем выдачу буфера, чтобы последний ondataavailable успел попасть в чанки (реже обрезанный MP4/WebM). */
function flushRecorderDataBeforeStop(recorder: MediaRecorder) {
  if (recorder.state === 'inactive') return;
  try {
    if (typeof recorder.requestData === 'function') {
      audioDebug('requestData() перед stop', { state: recorder.state, mimeType: recorder.mimeType });
      recorder.requestData();
    }
  } catch (e) {
    audioIntegrityWarn('requestData перед stop', e);
  }
}

export default function RecordPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = searchParams.get('patientId');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSheetOpen, setPatientSheetOpen] = useState(false);
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [consultationType, setConsultationType] = useState<ConsultationType | null>(null);

  // Загрузка списка пациентов
  const { data: patientsData = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsApi.get(),
    staleTime: 30000, // 30 секунд
  });

  // Загрузка данных выбранного пациента
  const { data: selectedPatientData, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => {
      if (!selectedPatientId) return null;
      return patientsApi.getById(selectedPatientId);
    },
    enabled: !!selectedPatientId,
  });

  // Преобразуем данные пациента для отображения
  // Сначала пытаемся использовать данные из списка пациентов (быстрее)
  // Если не найдено, используем загруженные данные
  const patientFromList = selectedPatientId 
    ? patientsData.find((p: PatientResponse) => String(p.id) === selectedPatientId)
    : null;
  
  const patient = patientFromList ? {
    id: String(patientFromList.id),
    firstName: patientFromList.firstName,
    lastName: patientFromList.lastName,
    phone: patientFromList.phone || '',
    avatar: `${patientFromList.firstName[0]}${patientFromList.lastName[0]}`.toUpperCase(),
  } : (selectedPatientData ? {
    id: String(selectedPatientData.id),
    firstName: selectedPatientData.firstName,
    lastName: selectedPatientData.lastName,
    phone: selectedPatientData.phone || '',
    avatar: `${selectedPatientData.firstName[0]}${selectedPatientData.lastName[0]}`.toUpperCase(),
  } : null);

  // Фильтруем пациентов для поиска
  const filteredPatients = patientsData.filter((p: PatientResponse) => {
    if (!patientSearch) return true;
    const search = patientSearch.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(search) ||
      p.lastName.toLowerCase().includes(search) ||
      p.phone?.toLowerCase().includes(search)
    );
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading' | 'transcribing' | 'processing'>('idle');
  const [audioData, setAudioData] = useState<number[]>(Array(40).fill(0));
  const [savedRecording, setSavedRecording] = useState<RecordingMetadata | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStopPromiseRef = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null);
  const mediaRecorderOptionsRef = useRef<MediaRecorderOptions | null>(null);
  const recordingIdRef = useRef<string | null>(null); // ID записи для IndexedDB
  const chunkIndexRef = useRef<number>(0); // Счетчик chunks для IndexedDB
  /** Финальный blob, собранный из памяти при остановке (полный файл; избегаем гонки с IndexedDB и битый MP4) */
  const finalBlobRef = useRef<Blob | null>(null);

  // Анализ звука в реальном времени
  useEffect(() => {
    if (!isRecording || isPaused || !analyserRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const bufferLength = analyser.frequencyBinCount;
    const barsCount = 40;
    const samplesPerBar = Math.floor(bufferLength / barsCount);

    const updateVisualization = () => {
      analyser.getByteFrequencyData(dataArray);
      
      const newAudioData: number[] = [];
      for (let i = 0; i < barsCount; i++) {
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          sum += dataArray[i * samplesPerBar + j];
        }
        const average = sum / samplesPerBar;
        // Нормализуем от 0 до 100 для высоты
        const normalized = Math.min((average / 255) * 100, 100);
        newAudioData.push(normalized);
      }
      
      setAudioData(newAudioData);
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    animationFrameRef.current = requestAnimationFrame(updateVisualization);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  // Таймер записи
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Очистка состояния при монтировании страницы записи
  // НЕ восстанавливаем автоматически сохраненные записи - они уже в очереди на отправку
  // Пользователь может начать новую запись для другого пациента
  useEffect(() => {
    // Очищаем состояние при монтировании, чтобы можно было начать новую запись
    setStatus('idle');
    setDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    setIsUploading(false);
    recordingIdRef.current = null;
    setSavedRecording(null);
    chunkIndexRef.current = 0;
    audioChunksRef.current = [];
    finalBlobRef.current = null;

    // Останавливаем медиа-потоки, если они были открыты
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    console.log('Record page mounted - state cleared for new recording');
  }, []); // Выполняем только при монтировании

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Выберите пациента",
        description: "Перед началом записи необходимо выбрать пациента.",
        variant: "destructive"
      });
      return;
    }
    
    if (!consultationType) {
      toast({
        title: "Выберите тип консультации",
        description: "Перед началом записи необходимо выбрать тип консультации.",
        variant: "destructive"
      });
      return;
    }

    // Проверяем баланс минут: при нулевом балансе запись недоступна
    try {
      const balance = await walletApi.getBalance();
      if (balance.availableMinutes <= 0 && balance.availableSeconds <= 0) {
        toast({
          title: "Недостаточно минут",
          description: "Баланс минут равен нулю. Пополните баланс, чтобы начать консультацию.",
          variant: "destructive",
        });
        setLocation("/wallet");
        return;
      }
    } catch (e) {
      toast({
        title: "Ошибка проверки баланса",
        description: "Не удалось проверить баланс. Попробуйте позже или перейдите в кошелёк.",
        variant: "destructive",
      });
      setLocation("/wallet");
      return;
    }

    // Проверяем поддержку и текущее состояние доступа к микрофону
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Микрофон не поддерживается",
        description: "Ваш браузер не поддерживает запись звука. Попробуйте другой браузер или устройство.",
        variant: "destructive",
      });
      return;
    }

    // Если есть Permissions API — подскажем пользователю, что нужно выдать доступ
    try {
      const anyNavigator = navigator as any;
      if (anyNavigator.permissions?.query) {
        const result = await anyNavigator.permissions.query({ name: 'microphone' });

        if (result.state === 'denied') {
          toast({
            title: "Нет доступа к микрофону",
            description: "Доступ к микрофону запрещён в настройках браузера. Разрешите доступ и попробуйте снова.",
            variant: "destructive",
          });
          return;
        }

        if (result.state === 'prompt') {
          toast({
            title: "Разрешите доступ к микрофону",
            description: "Сейчас браузер покажет системное окно. Пожалуйста, нажмите «Разрешить».",
            variant: "default",
          });
        }
      }
    } catch (e) {
      console.warn("Не удалось проверить разрешение на микрофон через Permissions API", e);
    }

    // Если есть сохраненная запись, очищаем её перед началом новой
    if (savedRecording) {
      await deleteChunks(savedRecording.id);
      await deleteRecordingMetadata(savedRecording.id);
      setSavedRecording(null);
      recordingIdRef.current = null;
      toast({
        title: "Предупреждение",
        description: "Предыдущая неотправленная запись удалена. Начинается новая запись.",
        variant: "default",
        duration: 3000,
      });
    }

    try {
      // Запрашиваем доступ к микрофону (или используем существующий поток)
      let stream = mediaStreamRef.current;
      
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      }

      // Создаем AudioContext для анализа звука
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Создаем MediaRecorder для записи с указанием bitrate
      // Определяем поддерживаемый MIME тип с приоритетом по совместимости и качеству
      // 
      // Приоритет форматов для записи:
      // 1. audio/mp4 (AAC) - лучшая совместимость (Safari, iOS, многие браузеры)
      // 2. audio/webm;codecs=opus - отличное качество (Chrome, Firefox, Edge)
      // 3. audio/ogg;codecs=opus - хорошее качество (Firefox)
      // 4. audio/mp3 - хорошая совместимость; в браузерах поддержка редко (лицензии)
      // 5. audio/webm - базовый WebM (fallback)
      // 6. audio/wav - последний fallback, большой размер
      
      let mimeType = 'audio/webm'; // fallback по умолчанию
      let preferredFormat = 'webm';
      
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        preferredFormat = 'mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
        preferredFormat = 'webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
        preferredFormat = 'ogg';
      } else if (MediaRecorder.isTypeSupported('audio/mp3')) {
        mimeType = 'audio/mp3';
        preferredFormat = 'mp3';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
        preferredFormat = 'webm';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
        preferredFormat = 'wav';
      }
      
      // Настройки для записи: bitrate 64 kbps для высокого качества записи
      // 64 kbps обеспечивает отличное качество записи речи
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const bitrate = 64000; // 64 kbps для всех устройств
      
      const mediaRecorderOptions: MediaRecorderOptions = {
        mimeType: mimeType,
        audioBitsPerSecond: bitrate,
      };
      
      console.log('Selected audio format:', {
        mimeType,
        format: preferredFormat,
        bitrate: `${bitrate / 1000} kbps`,
        supported: true,
      });
      
      // Сохраняем настройки в ref для использования в onstop
      mediaRecorderOptionsRef.current = mediaRecorderOptions;
      
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      
      audioChunksRef.current = [];
      
      // Генерируем уникальный ID для записи
      recordingIdRef.current = generateRecordingId();
      chunkIndexRef.current = 0;
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Сохраняем в память (для обратной совместимости)
          audioChunksRef.current.push(event.data);
          
          // Сохраняем в IndexedDB для защиты от потери данных
          if (recordingIdRef.current && selectedPatientId) {
            try {
              await saveAudioChunk(
                recordingIdRef.current,
                chunkIndexRef.current++,
                event.data,
                mimeType,
                selectedPatientId
              );
            } catch (error) {
              console.error('Failed to save chunk to IndexedDB:', error);
              // Продолжаем работу даже если сохранение в IndexedDB не удалось
            }
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        console.log('Audio recorded:', {
          size: audioBlob.size,
          sizeMB: (audioBlob.size / (1024 * 1024)).toFixed(2),
          mimeType: mediaRecorder.mimeType,
          bitrate: mediaRecorderOptionsRef.current?.audioBitsPerSecond || 'не указан',
          duration: duration,
        });
        
        // Разрешаем промис ожидания окончания записи
        if (recordingStopPromiseRef.current) {
          recordingStopPromiseRef.current.resolve();
          recordingStopPromiseRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      // Для мобильных устройств используем более частые сохранения (каждые 500мс)
      // чтобы избежать проблем с памятью при длинных записях
      const timeslice = isMobileDevice ? 500 : 1000; // 500мс для мобильных, 1с для десктопов
      mediaRecorder.start(timeslice);

      setIsPaused(false);
      setIsRecording(true);
      setStatus('recording');
      setDuration(0);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Ошибка доступа к микрофону",
        description: "Пожалуйста, разрешите доступ к микрофону в настройках браузера.",
        variant: "destructive"
      });
    }
  };

  const handlePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (typeof recorder.pause !== 'function' || typeof recorder.resume !== 'function') {
      toast({
        title: 'Пауза недоступна',
        description: 'В этом браузере запись нельзя приостановить. Завершите и отправьте запись.',
        variant: 'destructive',
      });
      return;
    }

    if (isPaused) {
      try {
        recorder.resume();
        setIsPaused(false);
      } catch (e) {
        console.error('resume failed', e);
        toast({
          title: 'Не удалось продолжить',
          description: 'Попробуйте ещё раз или начните запись заново.',
          variant: 'destructive',
        });
      }
    } else {
      try {
        recorder.pause();
        setIsPaused(true);
      } catch (e) {
        console.error('pause failed', e);
        toast({
          title: 'Не удалось поставить на паузу',
          description: 'Попробуйте другой браузер или завершите запись.',
          variant: 'destructive',
        });
      }
    }
  };

  /**
   * Полный stop MediaRecorder, сбор финального blob в finalBlobRef, освобождение микрофона.
   * Вызывается перед отправкой на сервер (одна непрерывная сессия записи — без второго MediaRecorder).
   */
  const finalizeRecordingForUpload = async (): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    setIsRecording(false);
    setIsPaused(false);
    setAudioData(Array(40).fill(0));

    let stopWaitTimeoutId: number | undefined;
    const stopPromise = new Promise<void>((resolve, reject) => {
      const clearStopWait = () => {
        if (stopWaitTimeoutId !== undefined) {
          window.clearTimeout(stopWaitTimeoutId);
          stopWaitTimeoutId = undefined;
        }
      };
      recordingStopPromiseRef.current = {
        resolve: () => {
          clearStopWait();
          resolve();
        },
        reject: (err: Error) => {
          clearStopWait();
          reject(err);
        },
      };

      const chunkCount = audioChunksRef.current.length;
      const stopWaitMs = Math.min(90_000, Math.max(15_000, 8_000 + chunkCount * 250));

      stopWaitTimeoutId = window.setTimeout(() => {
        if (recordingStopPromiseRef.current) {
          recordingStopPromiseRef.current.reject(new Error('Таймаут ожидания окончания записи'));
          recordingStopPromiseRef.current = null;
        }
      }, stopWaitMs);
    });

    flushRecorderDataBeforeStop(recorder);
    recorder.stop();

    try {
      await stopPromise;

      const mimeType = recorder.mimeType || mediaRecorderOptionsRef.current?.mimeType || 'audio/webm';
      const blobFromMemory = new Blob(audioChunksRef.current, { type: mimeType });

      if (blobFromMemory.size === 0) {
        const blobFromIdb = recordingIdRef.current ? await buildAudioBlob(recordingIdRef.current) : null;
        if (!blobFromIdb || blobFromIdb.size === 0) {
          throw new Error('Запись пуста');
        }
        finalBlobRef.current = blobFromIdb;
      } else {
        finalBlobRef.current = blobFromMemory;
      }

      const audioBlob = finalBlobRef.current;
      const chunksSize = audioChunksRef.current.length;
      const usedIdbFallback = blobFromMemory.size === 0;
      audioDebugBlobSummary(audioBlob, 'finalizeRecordingForUpload (финальный blob)', {
        recordingId: recordingIdRef.current,
        durationSec: duration,
        chunksInMemoryBeforeClear: chunksSize,
        source: usedIdbFallback ? 'indexeddb_fallback' : 'memory',
      });
      await audioDebugBlobHeaderSample(audioBlob, 'finalize после сборки');
      audioDebug('Запись финализирована для отправки', {
        sizeMB: (audioBlob.size / (1024 * 1024)).toFixed(2),
        durationSec: duration,
        chunks: chunksSize,
      });
    } catch (error) {
      console.error('Error finishing recording:', error);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      mediaRecorderRef.current = null;
      toast({
        title: 'Ошибка завершения записи',
        description: 'Не удалось подготовить файл. Попробуйте ещё раз.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      audioChunksRef.current = [];
      recordingStopPromiseRef.current = null;
      chunkIndexRef.current = 0;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    animationFrameRef.current = null;
  };

  // Отправка сохраненной записи на бэкенд
  const handleSend = async () => {
    if (!recordingIdRef.current || !selectedPatientId || !consultationType) {
      toast({
        title: "Ошибка",
        description: "Нет записи или типа консультации для отправки",
        variant: "destructive"
      });
      return;
    }

    const recordingId = recordingIdRef.current;
    const patientId = selectedPatientId;
    const type = consultationType;

    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive' &&
        !isPaused
      ) {
        toast({
          title: 'Сначала поставьте на паузу',
          description: 'Чтобы отправить запись, приостановите её кнопкой «Пауза».',
          variant: 'default',
        });
        return;
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        await finalizeRecordingForUpload();
      }

      // Используем blob после finalize из памяти; fallback на IndexedDB — после перезагрузки страницы.
      const blobSource: 'memory' | 'indexeddb' =
        finalBlobRef.current && recordingIdRef.current === recordingId ? 'memory' : 'indexeddb';

      let audioBlob: Blob | null =
        blobSource === 'memory' ? finalBlobRef.current : await buildAudioBlob(recordingId);

      if (!audioBlob || audioBlob.size === 0) {
        audioIntegrityWarn('handleSend: не удалось собрать аудио', {
          recordingId,
          blobSource,
        });
        throw new Error('Не удалось собрать аудиофайл');
      }

      audioDebugBlobSummary(audioBlob, 'handleSend перед upload', {
        recordingId,
        blobSource,
        durationSec: duration,
        consultationType: type,
      });
      await audioDebugBlobHeaderSample(audioBlob, 'handleSend перед upload');
      audioUploadMilestone('старт consultation/upload', {
        patientId,
        consultationType: type,
        size: audioBlob.size,
        mime: audioBlob.type,
        source: blobSource,
      });

      // Сохраняем метаданные локально (если отправка упадёт, фоновый процесс подхватит)
      const metadata: RecordingMetadata = {
        id: recordingId,
        patientId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
        timestamp: Date.now(),
        duration,
        size: audioBlob.size,
        mimeType: audioBlob.type,
        consultationType: type,
      };
      await saveRecordingMetadata(metadata);

      setIsUploading(true);
      setStatus('uploading');

      // Сразу отправляем на сервер
      const response = await consultationsApi.uploadConsultation(patientId, audioBlob, type);

      finalBlobRef.current = null;
      const consultationId = String(response.id);

      // Удаляем локальную запись, чтобы фоновый процесс не отправлял её повторно
      await deleteChunks(recordingId);
      await deleteRecordingMetadata(recordingId);

      queryClient.setQueryData(['consultation', consultationId], {
        id: consultationId,
        clientId: String(response.clientId),
        processingStatus: response.status ?? ConsultationProcessingStatus.None,
        status: response.status ?? ConsultationProcessingStatus.None,
        createdAt: response.createdAt || new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['patient-consultations'] });

      toast({
        title: "Запись отправлена",
        description: "Консультация создана. Идёт обработка.",
      });

      setStatus('idle');
      setDuration(0);
      setConsultationType(null);
      recordingIdRef.current = null;
      setSavedRecording(null);
      setIsUploading(false);
      setIsPaused(false);
      setIsRecording(false);

      setLocation(`/consultation/${consultationId}`);
    } catch (error) {
      console.error('Error uploading recording:', error);
      setIsUploading(false);

      toast({
        title: "Запись сохранена локально",
        description: "Не удалось отправить сейчас. Отправка начнётся автоматически при появлении интернета.",
      });

      setStatus('idle');
      setDuration(0);
      setConsultationType(null);
      recordingIdRef.current = null;
      setSavedRecording(null);
      finalBlobRef.current = null;
      setIsPaused(false);
      setIsRecording(false);

      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setTimeout(() => setLocation('/history'), 500);
    }
  };

  const handleCancelConfirm = async () => {
    setCancelDialogOpen(false);
    
    // Если идет запись, останавливаем её
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      flushRecorderDataBeforeStop(mediaRecorderRef.current);
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Очищаем текущую запись
    if (recordingIdRef.current) {
      await deleteChunks(recordingIdRef.current);
      if (savedRecording && savedRecording.id === recordingIdRef.current) {
        await deleteRecordingMetadata(savedRecording.id);
      }
      recordingIdRef.current = null;
    }

    finalBlobRef.current = null;
    audioChunksRef.current = [];
    chunkIndexRef.current = 0;
    setIsRecording(false);
    setDuration(0);
    setStatus('idle');
    setConsultationType(null);
    setSavedRecording(null);
    setIsUploading(false);
    setIsPaused(false);
    setAudioData(Array(40).fill(0));
  };

  const handlePatientSelect = (patientId: string) => {
    console.log('Selecting patient:', patientId);
    setSelectedPatientId(patientId);
    setPatientSheetOpen(false);
    setPatientPopoverOpen(false);
    setPatientSearch('');
  };

  // Скрываем навигацию во время записи или паузы
  const shouldHideNavigation = status === 'recording' || status === 'uploading';

  return (
    <Layout hideNavigation={shouldHideNavigation}>
      <div className="min-h-[calc(100vh-8rem)] md:min-h-[80vh] flex items-center justify-center py-8 md:py-0">
        <div className="w-full max-w-2xl space-y-6 md:space-y-8 text-center px-4">
          
          {/* Patient Selection */}
          {status === 'idle' && (
            <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 w-full">
              <div className="w-full max-w-md">
                <label className="text-sm font-medium text-muted-foreground mb-2 block text-center">
                  Выберите пациента
                </label>
                
                {/* Desktop: Popover with Command for search */}
                {!isMobile && (
                  <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 rounded-xl text-base bg-background border-border/50 justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {patient ? (
                            <>
                              <Avatar className="w-6 h-6 rounded-lg">
                                <AvatarFallback className="rounded-lg text-xs bg-secondary">
                                  {patient.avatar || `${patient.firstName[0]}${patient.lastName[0]}`}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>Выберите пациента</span>
                            </>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Поиск по имени или телефону..." 
                          className="h-12 text-base"
                          value={patientSearch}
                          onValueChange={setPatientSearch}
                        />
                        <CommandList className="max-h-[300px]">
                          {isLoadingPatients ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                              Загрузка пациентов...
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>Пациенты не найдены</CommandEmpty>
                              <CommandGroup>
                                {filteredPatients.map((p: PatientResponse) => (
                                  <CommandItem
                                    key={p.id}
                                    value={`${p.firstName} ${p.lastName} ${p.phone || ''}`}
                                    onSelect={(currentValue) => {
                                      // currentValue может быть строкой поиска, поэтому используем p.id напрямую
                                      handlePatientSelect(String(p.id));
                                    }}
                                    className="rounded-lg cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      <Avatar className="w-8 h-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-secondary">
                                          {`${p.firstName[0]}${p.lastName[0]}`.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{p.firstName} {p.lastName}</div>
                                        {p.phone && (
                                          <div className="text-xs text-muted-foreground truncate">{p.phone}</div>
                                        )}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Mobile: Sheet with Command */}
                {isMobile && (
                  <Sheet open={patientSheetOpen} onOpenChange={setPatientSheetOpen}>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl text-base bg-background border-border/50 justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {patient ? (
                            <>
                              <Avatar className="w-6 h-6 rounded-lg">
                                <AvatarFallback className="rounded-lg text-xs bg-secondary">
                                  {patient.avatar || `${patient.firstName[0]}${patient.lastName[0]}`}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span>Выберите пациента</span>
                            </>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0">
                      <SheetHeader className="px-6 pt-6 pb-4 border-b">
                        <SheetTitle className="text-left text-xl">Выберите пациента</SheetTitle>
                      </SheetHeader>
                      <Command className="h-full">
                        <CommandInput 
                          placeholder="Поиск по имени или телефону..." 
                          className="h-14 text-base"
                          value={patientSearch}
                          onValueChange={setPatientSearch}
                        />
                        <CommandList className="max-h-[calc(80vh-8rem)]">
                          {isLoadingPatients ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                              Загрузка пациентов...
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>Пациенты не найдены</CommandEmpty>
                              <CommandGroup>
                                {filteredPatients.map((p: PatientResponse) => (
                                  <CommandItem
                                    key={p.id}
                                    value={`${p.firstName} ${p.lastName} ${p.phone || ''}`}
                                    onSelect={() => handlePatientSelect(String(p.id))}
                                    className="flex items-center gap-3 px-4 py-4 cursor-pointer"
                                  >
                                    <Avatar className="w-10 h-10 rounded-xl">
                                      <AvatarFallback className="rounded-xl bg-secondary font-medium">
                                        {`${p.firstName[0]}${p.lastName[0]}`.toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{p.firstName} {p.lastName}</div>
                                      {p.phone && (
                                        <div className="text-xs text-muted-foreground truncate">{p.phone}</div>
                                      )}
                                    </div>
                                    {selectedPatientId === String(p.id) && (
                                      <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </SheetContent>
                  </Sheet>
                )}
              </div>

              {/* Consultation Type Selection */}
              <div className="w-full max-w-md">
                <Label htmlFor="consultationType" className="text-sm font-medium text-muted-foreground mb-2 block text-center">
                  Тип консультации *
                </Label>
                <Select
                  value={consultationType?.toString()}
                  onValueChange={(value) => setConsultationType(Number(value) as ConsultationType)}
                >
                  <SelectTrigger className="w-full h-12 rounded-xl text-base bg-background border-border/50">
                    <SelectValue placeholder="Выберите тип консультации" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ConsultationType.PrimaryDoctorClient.toString()}>
                      Первичная консультация
                    </SelectItem>
                    <SelectItem value={ConsultationType.SecondaryDoctorClient.toString()}>
                      Вторичная консультация
                    </SelectItem>
                    <SelectItem value={ConsultationType.CoordinatorClient.toString()}>
                      Консультация координатора
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-xs md:text-sm uppercase tracking-widest text-muted-foreground font-bold">
              {patient ? `Консультация: ${patient.firstName} ${patient.lastName}` : 'Пациент не выбран'}
            </h2>
            <h1 className="text-4xl md:text-6xl font-display font-bold tabular-nums tracking-tight">
              {formatTime(duration)}
            </h1>
          </div>

          {/* Audio Visualizer */}
          <div className="h-24 md:h-32 flex items-center justify-center gap-0.5 md:gap-1 px-4">
            {audioData.map((value, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1 md:w-1.5 bg-primary rounded-full transition-all duration-75 ease-out",
                  status === 'recording' && !isPaused ? "" : "h-1"
                )}
                style={{ 
                  height: status === 'recording' && !isPaused 
                    ? `${Math.max(value, 4)}%` 
                    : '4px',
                  opacity: status === 'recording' && !isPaused 
                    ? Math.max(value / 100, 0.3) 
                    : 0.2 
                }}
              />
            ))}
          </div>

          {/* Status Messages */}
          {status !== 'recording' && status !== 'idle' && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
              <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-primary" />
              <p className="text-base md:text-lg font-medium px-4">
                {status === 'uploading' && 'Загрузка аудио...'}
                {status === 'transcribing' && 'Распознавание речи...'}
                {status === 'processing' && 'Формирование медицинского отчета...'}
              </p>
            </div>
          )}

          {/* Controls */}
          {status === 'idle' && (
            <div className="flex flex-col items-center justify-center gap-6 md:gap-8">
                <Button 
                  size="icon" 
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30 disabled:opacity-60 disabled:hover:scale-100"
                disabled={!selectedPatientId}
                onClick={handleStart}
                >
                <Mic className="w-8 h-8 md:w-10 md:h-10" />
                </Button>
              
              {/* Рекомендации по использованию (только до начала записи) */}
              <div className="w-full max-w-full md:max-w-md mx-auto px-2 md:px-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="rounded-2xl bg-card border border-border/50 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setIsRecommendationsOpen(!isRecommendationsOpen)}
                    className="w-full p-4 md:p-5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <h3 className="font-semibold text-foreground text-center whitespace-nowrap flex-1 min-w-0" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
                      Рекомендации для качественной записи
                    </h3>
                    {isRecommendationsOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  
                  {isRecommendationsOpen && (
                    <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                      <ul className="space-y-2 text-xs md:text-sm text-muted-foreground text-left">
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">Держите телефон/микрофон близко к говорящему</span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">Не кладите устройство в карман, тумбочку или в сумку</span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">Расположите устройство на столе или держите в руке</span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">Избегайте фонового шума и посторонних разговоров</span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">
                            Не блокируйте экран и не закрывайте вкладку с приложением во время записи — на телефоне
                            запись может прерваться, если уйти в другой приложение или заблокировать устройство
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">
                            Для длинной консультации заранее подключите зарядку или следите за зарядом: при сильном
                            энергосбережении ОС может ограничить работу браузера
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">
                            Пауза только ставит запись на паузу: микрофон остаётся занят до отправки. Чтобы завершить,
                            нажмите «Пауза», затем «Отправить» — до этого момента не начинайте новую запись в другой
                            вкладке с тем же браузером
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">
                            Перед отправкой убедитесь в устойчивом интернете (лучше Wi‑Fi для длинных записей) —
                            при обрыве загрузка может не пройти с первого раза; приложение попробует отправить снова,
                            когда сеть появится
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">
                            При появлении запроса браузера на доступ к микрофону нажмите «Разрешить»; если доступ
                            запрещён в настройках системы, запись будет недоступна
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">
                            Используйте актуальную версию браузера (Chrome, Safari и др.) — в устаревших версиях запись
                            или пауза могут работать нестабильно
                          </span>
                        </li>
                        <li className="flex items-start gap-2 text-left">
                          <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                          <span className="text-left">
                            При плохом звуке в помещении можно использовать проводную гарнитуру с микрофоном,
                            если она подключена к этому же устройству
                          </span>
                        </li>
                      </ul>
                      <p className="text-xs md:text-sm text-muted-foreground pt-2 border-t border-border/50 text-left">
                        Чем стабильнее запись и интернет, тем реже будут ошибки и обрывы, а транскрипция и медицинский
                        отчёт — точнее
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {status === 'recording' && !isPaused && (
            <div className="flex items-center justify-center gap-6 md:gap-8">
              <div className="flex flex-col items-center gap-2">
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-destructive text-destructive-foreground hover:scale-105 transition-transform shadow-2xl shadow-destructive/30"
                    >
                      <X className="w-6 h-6 md:w-7 md:h-7" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Вы уверены, что хотите отменить запись? Все записанные данные будут удалены.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Нет</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Да, отменить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <span className="text-xs text-muted-foreground font-light">Отменить</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button
                  size="icon"
                  className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30"
                  onClick={handlePause}
                  aria-label="Пауза"
                >
                  <Pause className="w-6 h-6 md:w-7 md:h-7" />
                </Button>
                <span className="text-xs text-muted-foreground font-light">Пауза</span>
              </div>
            </div>
          )}

          {status === 'recording' && isPaused && (
            <div className="flex flex-col items-center justify-center gap-6 md:gap-8 w-full max-w-sm mx-auto">
              <div className="flex items-center justify-center gap-4 md:gap-6">
                <div className="flex flex-col items-center gap-2">
                  <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-destructive text-destructive-foreground hover:scale-105 transition-transform shadow-2xl shadow-destructive/30"
                      >
                        <X className="w-6 h-6 md:w-7 md:h-7" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Вы уверены, что хотите отменить запись? Все записанные данные будут удалены.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Нет</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelConfirm}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Да, отменить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <span className="text-xs text-muted-foreground font-light">Отменить</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    size="icon"
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30"
                    onClick={handlePause}
                    aria-label="Продолжить запись"
                  >
                    <Play className="w-6 h-6 md:w-7 md:h-7" />
                  </Button>
                  <span className="text-xs text-muted-foreground font-light">Продолжить</span>
                </div>
              </div>

              <Button
                className="w-32 md:w-40 h-14 md:h-16 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handleSend}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                    <span className="text-sm md:text-base font-medium">Отправка...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-sm md:text-base font-medium">Отправить</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {status === 'recording' && !isPaused && (
            <p className="text-muted-foreground animate-pulse text-sm md:text-base">Слушаю...</p>
          )}
          {status === 'recording' && isPaused && (
            <p className="text-muted-foreground text-sm md:text-base">Запись на паузе — продолжите или отправьте</p>
          )}
        </div>
      </div>
    </Layout>
  );
}