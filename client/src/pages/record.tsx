import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, Square, Pause, Play, Loader2, X, User, ChevronRight } from 'lucide-react';
import { patientsApi } from '@/lib/api/patients';
import { consultationsApi } from '@/lib/api/consultations';
import type { PatientResponse } from '@/lib/api/types';
import { ConsultationProcessingStatus } from '@/lib/api/types';
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

export default function RecordPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = searchParams.get('patientId');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSheetOpen, setPatientSheetOpen] = useState(false);
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

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
  const [status, setStatus] = useState<'idle' | 'recording' | 'saved' | 'uploading' | 'transcribing' | 'processing'>('idle');
  const [audioData, setAudioData] = useState<number[]>(Array(40).fill(0));
  const [savedRecording, setSavedRecording] = useState<RecordingMetadata | null>(null);
  
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

  // Восстановление сохраненной записи при загрузке страницы
  useEffect(() => {
    const restoreSavedRecording = async () => {
      try {
        const latestRecording = await getLatestSavedRecording();
        if (latestRecording) {
          // Проверяем, что chunks действительно существуют
          const chunks = await getAllChunks(latestRecording.id);
          if (chunks.length > 0) {
            // Восстанавливаем состояние сохраненной записи
            setSavedRecording(latestRecording);
            setStatus('saved');
            setDuration(latestRecording.duration);
            recordingIdRef.current = latestRecording.id;
            
            // Восстанавливаем выбранного пациента из сохраненной записи
            if (latestRecording.patientId) {
              setSelectedPatientId(latestRecording.patientId);
            }
            
            console.log('Restored saved recording:', latestRecording);
          } else {
            // Если chunks отсутствуют, удаляем метаданные
            await deleteRecordingMetadata(latestRecording.id);
          }
        }
      } catch (error) {
        console.error('Error restoring saved recording:', error);
      }
    };

    restoreSavedRecording();
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
      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaStreamRef.current = stream;

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
      // 1. audio/mp4 (AAC) - ПРИОРИТЕТ: лучшая совместимость для воспроизведения (Safari, iOS, все браузеры)
      // 2. audio/webm;codecs=opus - отличное качество, хорошая поддержка (Chrome, Firefox, Edge)
      // 3. audio/ogg;codecs=opus - хорошее качество (Firefox)
      // 4. audio/webm - базовый WebM формат (fallback)
      // 5. audio/wav - универсальный, но большой размер (последний fallback)
      
      let mimeType = 'audio/webm'; // fallback по умолчанию
      let preferredFormat = 'webm';
      
      // Проверяем поддержку форматов в порядке приоритета
      // ПРИОРИТЕТ 1: MP4 (AAC) - лучшая совместимость для воспроизведения
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        // MP4 (AAC) - поддерживается в Safari, iOS, и большинстве браузеров
        // Идеален для воспроизведения на всех устройствах
        mimeType = 'audio/mp4';
        preferredFormat = 'mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        // WebM с Opus codec - отличное качество при хорошем сжатии
        // Поддерживается в Chrome, Firefox, Edge, Opera
        mimeType = 'audio/webm;codecs=opus';
        preferredFormat = 'webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        // OGG с Opus - хорошее качество
        // Поддерживается в Firefox
        mimeType = 'audio/ogg;codecs=opus';
        preferredFormat = 'ogg';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        // Базовый WebM формат (fallback)
        mimeType = 'audio/webm';
        preferredFormat = 'webm';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        // WAV - универсальный формат, но большой размер (последний fallback)
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
    if (!mediaRecorderRef.current) return;
    
    if (isPaused) {
      // Возобновляем запись
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      // Пауза
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleStop = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Ошибка",
        description: "Не выбран пациент для записи",
        variant: "destructive"
      });
      return;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    setIsRecording(false);
    setStatus('saved');
    setAudioData(Array(40).fill(0));

    // Создаем промис для ожидания окончания записи
    const stopPromise = new Promise<void>((resolve, reject) => {
      recordingStopPromiseRef.current = { resolve, reject };
      
      // Таймаут на случай, если onstop не сработает
      setTimeout(() => {
        if (recordingStopPromiseRef.current) {
          recordingStopPromiseRef.current.reject(new Error('Таймаут ожидания окончания записи'));
          recordingStopPromiseRef.current = null;
        }
      }, 5000);
    });

    // Останавливаем запись
    mediaRecorderRef.current.stop();

    try {
      // Ждем окончания записи
      await stopPromise;

      // Пытаемся собрать Blob из IndexedDB (более надежно)
      // Если не получилось, используем chunks из памяти
      let audioBlob: Blob | null = null;
      
      if (recordingIdRef.current) {
        audioBlob = await buildAudioBlob(recordingIdRef.current);
      }
      
      // Fallback на chunks из памяти, если IndexedDB не сработал
      if (!audioBlob || audioBlob.size === 0) {
        audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
        });
      }
      
      // Очищаем chunks из памяти после создания Blob для экономии памяти на мобильных
      const chunksSize = audioChunksRef.current.length;
      audioChunksRef.current = [];
      
      if (audioBlob.size === 0) {
        throw new Error('Запись пуста');
      }

      // Логируем информацию о файле для отладки
      const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
      const durationMinutes = (duration / 60).toFixed(1);
      
      console.log('Preparing to upload audio:', {
        size: `${sizeMB} MB`,
        duration: `${duration} seconds (${durationMinutes} minutes)`,
        chunks: chunksSize,
        mimeType: audioBlob.type,
      });

      // Сохраняем метаданные о записи
      if (recordingIdRef.current) {
        const metadata: RecordingMetadata = {
          id: recordingIdRef.current,
          patientId: selectedPatientId,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
          timestamp: Date.now(),
          duration: duration,
          size: audioBlob.size,
          mimeType: audioBlob.type,
        };
        
        await saveRecordingMetadata(metadata);
        setSavedRecording(metadata);
      }
      
      // Останавливаем поток
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      toast({
        title: "Запись завершена",
        description: "Аудиофайл сохранен локально. Вы можете отправить его на сервер.",
      });
    } catch (error) {
      console.error('Error finishing recording:', error);
      setStatus('idle');
      
      // Останавливаем поток даже при ошибке
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      toast({
        title: "Ошибка завершения записи",
        description: "Не удалось завершить запись. Попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      // Очищаем запись из памяти
      audioChunksRef.current = [];
      recordingStopPromiseRef.current = null;
      chunkIndexRef.current = 0;
      // НЕ очищаем recordingIdRef и duration - они нужны для отправки
    }
  };

  // Отправка сохраненной записи на бэкенд
  const handleSend = async () => {
    if (!savedRecording || !selectedPatientId) {
      toast({
        title: "Ошибка",
        description: "Нет сохраненной записи для отправки",
        variant: "destructive"
      });
      return;
    }

    setStatus('uploading');

    try {
      // Собираем Blob из IndexedDB
      const audioBlob = await buildAudioBlob(savedRecording.id);
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Не удалось восстановить аудиофайл из сохранения');
      }

      const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
      const durationMinutes = (savedRecording.duration / 60).toFixed(1);
      
      console.log('Sending saved recording:', {
        id: savedRecording.id,
        size: `${sizeMB} MB`,
        duration: `${savedRecording.duration} seconds (${durationMinutes} minutes)`,
      });

      // Предупреждение для очень длинных записей
      if (savedRecording.duration > 1800) { // Более 30 минут
        toast({
          title: "Длинная запись",
          description: `Запись длится ${durationMinutes} минут (${sizeMB} MB). Загрузка может занять некоторое время.`,
          duration: 5000,
        });
      }

      const response = await consultationsApi.uploadConsultation(selectedPatientId, audioBlob);
      
      console.log('Consultation uploaded:', response);
      
      // Обрабатываем статус
      if (response.status === ConsultationProcessingStatus.Completed) {
        // Очищаем IndexedDB только после успешной обработки
        await deleteChunks(savedRecording.id);
        await deleteRecordingMetadata(savedRecording.id);
        recordingIdRef.current = null;
        setSavedRecording(null);
        setStatus('idle');
        setDuration(0);
        toast({
          title: "Консультация загружена",
          description: "Аудиофайл успешно отправлен и обработан.",
        });
        
        // Переходим на страницу пациента
        setTimeout(() => {
          setLocation(`/patient/${selectedPatientId}`);
        }, 1000);
      } else if (response.status === ConsultationProcessingStatus.Failed) {
        // При ошибке обработки запись остается сохраненной
        setStatus('saved');
        toast({
          title: "Ошибка обработки",
          description: "Не удалось обработать консультацию. Запись сохранена, попробуйте еще раз.",
          variant: "destructive"
        });
      } else {
        // InProgress или None - запись отправлена, но обработка еще идет
        // Очищаем только после успешной обработки, но пока оставляем сохраненной
        // Можно очистить сразу, так как запись уже на сервере
        await deleteChunks(savedRecording.id);
        await deleteRecordingMetadata(savedRecording.id);
        recordingIdRef.current = null;
        setSavedRecording(null);
        setStatus('idle');
        setDuration(0);
        toast({
          title: "Консультация загружена",
          description: "Аудиофайл отправлен. Обработка началась.",
        });
        
        // Переходим на страницу пациента через некоторое время
        setTimeout(() => {
          setLocation(`/patient/${selectedPatientId}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Error uploading consultation:', error);
      setStatus('saved'); // Возвращаемся к состоянию сохраненной записи
      
      // Улучшенная обработка ошибок с понятными сообщениями
      let errorMessage = "Не удалось отправить аудиофайл. Запись сохранена, попробуйте еще раз.";
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        // Обработка ошибок таймаута
        if (errorText.includes('превышено время') || errorText.includes('timeout') || errorText.includes('таймаут')) {
          errorMessage = `Загрузка файла заняла слишком много времени (более 5 минут). Запись сохранена. Это может быть связано с медленным интернетом или большим размером файла. Попробуйте позже или проверьте подключение к интернету.`;
        }
        // Обработка ошибок сети
        else if (errorText.includes('не удалось подключиться') || errorText.includes('failed to fetch') || errorText.includes('network')) {
          errorMessage = "Ошибка подключения к серверу. Запись сохранена. Проверьте подключение к интернету и попробуйте еще раз.";
        }
        // Обработка ошибок размера файла
        else if (errorText.includes('размер') || errorText.includes('size') || errorText.includes('too large')) {
          errorMessage = "Файл слишком большой. Запись сохранена. Попробуйте записать более короткое аудио.";
        }
        // Другие ошибки
        else {
          errorMessage = `Запись сохранена. ${error.message}`;
        }
      }
      
      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleCancel = async () => {
    // Если идет запись, останавливаем её
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Очищаем только текущую незавершенную запись
    // НЕ трогаем уже сохраненную запись (savedRecording)
    if (recordingIdRef.current && !savedRecording) {
      // Если нет сохраненной записи, удаляем текущую незавершенную
      await deleteChunks(recordingIdRef.current);
      recordingIdRef.current = null;
    } else if (recordingIdRef.current && savedRecording && recordingIdRef.current !== savedRecording.id) {
      // Если есть сохраненная запись, но текущая запись другая - удаляем только текущую
      await deleteChunks(recordingIdRef.current);
      recordingIdRef.current = null;
    }
    
    audioChunksRef.current = [];
    chunkIndexRef.current = 0;
    setIsRecording(false);
    
    // Если есть сохраненная запись, возвращаемся к ней, иначе сбрасываем
    if (savedRecording) {
      setStatus('saved');
      setDuration(savedRecording.duration);
    } else {
      setDuration(0);
      setStatus('idle');
    }
    
    setAudioData(Array(40).fill(0));
  };

  const handlePatientSelect = (patientId: string) => {
    console.log('Selecting patient:', patientId);
    setSelectedPatientId(patientId);
    setPatientSheetOpen(false);
    setPatientPopoverOpen(false);
    setPatientSearch('');
  };

  return (
    <Layout>
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
          {status !== 'recording' && status !== 'idle' && status !== 'saved' && (
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
            <div className="flex items-center justify-center">
              <Button 
                size="icon" 
                className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30 disabled:opacity-60 disabled:hover:scale-100"
                disabled={!selectedPatientId}
                onClick={handleStart}
              >
                <Mic className="w-8 h-8 md:w-10 md:h-10" />
              </Button>
            </div>
          )}

          {status === 'recording' && (
            <div className="flex flex-col items-center justify-center gap-4 md:gap-6">
              {/* Верхний ряд: Отмена и Пауза */}
              <div className="flex items-center justify-center gap-4 md:gap-6">
                <Button 
                  className="h-12 md:h-14 px-6 md:px-8 rounded-full bg-destructive text-destructive-foreground hover:scale-105 transition-transform shadow-2xl shadow-destructive/30 text-sm md:text-base font-medium"
                  onClick={handleCancel}
                >
                  Отмена
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 md:h-14 px-6 md:px-8 rounded-full border-2 text-sm md:text-base font-medium"
                  onClick={handlePause}
                >
                  {isPaused ? 'Возобновить' : 'Пауза'}
                </Button>
              </div>
              
              {/* Нижний ряд: Завершить */}
              <Button 
                className="h-12 md:h-14 px-6 md:px-8 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30 text-sm md:text-base font-medium"
                onClick={handleStop}
              >
                Завершить
              </Button>
            </div>
          )}

          {/* Сохраненная запись */}
          {status === 'saved' && savedRecording && (
            <div className="flex flex-col items-center gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-full max-w-md space-y-3 p-4 md:p-6 rounded-2xl bg-secondary/30 border border-border/50">
                <div className="space-y-2">
                  <p className="text-sm md:text-base text-muted-foreground">Сохраненная запись</p>
                  <div className="space-y-1">
                    <p className="text-base md:text-lg font-semibold">
                      {savedRecording.patientName || `Пациент ID: ${savedRecording.patientId}`}
                    </p>
                    <p className="text-sm md:text-base text-muted-foreground">
                      {format(new Date(savedRecording.timestamp), 'd MMMM yyyy, HH:mm', { locale: ru })}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Длительность: {formatTime(savedRecording.duration)} • Размер: {(savedRecording.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button 
                  className="w-full h-12 md:h-14 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30 text-sm md:text-base font-medium"
                  onClick={handleSend}
                  disabled={status !== 'saved'}
                >
                  {status !== 'saved' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    'Отправить'
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {status === 'recording' && (
             <p className="text-muted-foreground animate-pulse text-sm md:text-base">Слушаю...</p>
          )}
        </div>
      </div>
    </Layout>
  );
}