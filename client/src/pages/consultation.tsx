import { useRef, useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { consultationsApi } from '@/lib/api/consultations';
import { patientsApi } from '@/lib/api/patients';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import type { ConsultationResponse } from '@/lib/api/types';
import { ArrowLeft, Download, Share2, Copy, Play, Pause, RefreshCw, Check, GripVertical, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ConsultationPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isPlaying, setIsPlaying] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessDialogOpen, setReprocessDialogOpen] = useState(false);
  
  // Состояния для аудиоплеера
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [staticWaveform, setStaticWaveform] = useState<number[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // Состояния для редактирования полей отчета
  const [complaints, setComplaints] = useState('');
  const [objective, setObjective] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [summary, setSummary] = useState('');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка данных консультации с периодической проверкой статуса
  const { data: consultationData, isLoading, error } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => {
      if (!id) throw new Error('ID консультации не указан');
      return consultationsApi.getById(id);
    },
    enabled: !!id,
    // Если консультация еще обрабатывается (InProgress или None), проверяем статус каждые 5 секунд
    refetchInterval: (query) => {
      const data = query.state.data as ConsultationResponse | null;
      if (data) {
        // Получаем статус из ответа бэкенда (может быть в разных полях)
        const status = data.processingStatus ?? 
                      (data.status as ConsultationProcessingStatus) ?? 
                      (data as any).processingStatus ??
                      ConsultationProcessingStatus.None;
        // Если статус InProgress (1) или None (0), продолжаем проверять
        if (status === ConsultationProcessingStatus.InProgress || status === ConsultationProcessingStatus.None) {
          return 5000; // Проверяем каждые 5 секунд
        }
      }
      return false; // Если Completed или Failed, не проверяем
    },
    refetchOnWindowFocus: true, // Обновляем при возврате на вкладку
  });

  // Преобразуем данные для отображения
  const consultation: ConsultationResponse | null = consultationData || null;

  // Загружаем данные пациента, если их нет в консультации
  const { data: patientData } = useQuery({
    queryKey: ['patient', consultation?.clientId],
    queryFn: () => {
      if (!consultation?.clientId) return null;
      return patientsApi.getById(consultation.clientId);
    },
    enabled: !!consultation?.clientId && !consultation?.patientName,
  });

  // Обогащаем консультацию данными пациента, если они загружены
  const enrichedConsultation: ConsultationResponse | null = consultation ? {
    ...consultation,
    patientName: consultation.patientName || 
                 (patientData ? `${patientData.firstName} ${patientData.lastName}` : undefined),
  } : null;

  // Синхронизируем локальные состояния с данными из API
  useEffect(() => {
    if (enrichedConsultation) {
      setComplaints(enrichedConsultation.complaints || '');
      setObjective(enrichedConsultation.objective || '');
      setTreatmentPlan(enrichedConsultation.plan || '');
      setSummary(enrichedConsultation.summary || '');
      setComment(enrichedConsultation.comments || '');
    }
  }, [enrichedConsultation?.complaints, enrichedConsultation?.objective, enrichedConsultation?.plan, enrichedConsultation?.summary, enrichedConsultation?.comments]);

  // Автосохранение полей отчета с debounce
  useEffect(() => {
    if (!id || !enrichedConsultation) return;
    
    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Проверяем, изменились ли какие-либо поля
    const hasChanges = 
      complaints !== (enrichedConsultation.complaints || '') ||
      objective !== (enrichedConsultation.objective || '') ||
      treatmentPlan !== (enrichedConsultation.plan || '') ||
      summary !== (enrichedConsultation.summary || '') ||
      comment !== (enrichedConsultation.comments || '');

    if (!hasChanges) {
      return;
    }

    // Устанавливаем новый таймер для автосохранения (через 1 секунду после последнего изменения)
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setIsSaved(false);
      
      try {
        await consultationsApi.update({
          id,
          complaints: complaints.trim() || undefined,
          objective: objective.trim() || undefined,
          treatmentPlan: treatmentPlan.trim() || undefined,
          summary: summary.trim() || undefined,
          comment: comment.trim() || undefined,
        });

        // Обновляем кэш
        queryClient.setQueryData(['consultation', id], {
          ...enrichedConsultation,
          complaints: complaints.trim() || null,
          objective: objective.trim() || null,
          plan: treatmentPlan.trim() || null,
          summary: summary.trim() || null,
          comments: comment.trim() || null,
        });

        setIsSaved(true);
        
        // Скрываем индикатор сохранения через 2 секунды
        setTimeout(() => setIsSaved(false), 2000);
      } catch (error) {
        console.error('Auto-save consultation error:', error);
        toast({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить изменения. Попробуйте еще раз.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Сохраняем через 1 секунду после последнего изменения

    // Очистка при размонтировании
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [complaints, objective, treatmentPlan, summary, comment, id, enrichedConsultation, queryClient, toast]);

  // Инициализация duration из данных консультации
  useEffect(() => {
    if (enrichedConsultation?.audioDuration && !duration) {
      setDuration(enrichedConsultation.audioDuration);
    }
  }, [enrichedConsultation?.audioDuration]);

  // Загрузка аудио при загрузке консультации
  useEffect(() => {
    if (!id || !enrichedConsultation) return;
    
    // Загружаем аудио только если консультация обработана
    const processingStatus = enrichedConsultation.processingStatus ?? 
                             (enrichedConsultation.status as ConsultationProcessingStatus) ?? 
                             ConsultationProcessingStatus.None;
    
    if (processingStatus !== ConsultationProcessingStatus.Completed) {
      return;
    }

    setIsLoadingAudio(true);
    
    // Определяем, мобильное ли устройство
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Для мобильных устройств сначала пробуем прямой URL, для десктопа - Blob URL
    const loadAudio = async () => {
      try {
        // Пробуем загрузить через Blob URL
        const url = await consultationsApi.getAudioUrl(id, false);
        setAudioUrl(url);
        setIsLoadingAudio(false);
        setAudioError(null); // Очищаем ошибку при успешной загрузке
      } catch (error: any) {
        console.error('Failed to load audio with Blob URL:', error);
        
        // Если не получилось с Blob URL, пробуем прямой URL (особенно для мобильных)
        try {
          console.log('Trying direct URL as fallback...');
          const directUrl = consultationsApi.getAudioDirectUrl(id);
          
          // Проверяем, что это действительно URL (не Blob URL)
          if (directUrl && !directUrl.startsWith('blob:')) {
            // Для прямого URL пробуем загрузить через fetch с проверкой доступности
            // Если сервер не поддерживает токен в query, вернется ошибка
            const testResponse = await fetch(directUrl, {
              method: 'HEAD', // Используем HEAD для проверки без загрузки всего файла
              mode: 'cors',
            });
            
            if (testResponse.ok) {
              setAudioUrl(directUrl);
              setIsLoadingAudio(false);
              setAudioError(null); // Очищаем ошибку при успешной загрузке
              console.log('Using direct URL:', directUrl);
            } else {
              throw new Error(`Direct URL failed: ${testResponse.status}`);
            }
          } else {
            throw new Error('Direct URL not available');
          }
        } catch (directError: any) {
          console.error('Failed to load audio with direct URL:', directError);
          setIsLoadingAudio(false);
          
          // Формируем детальное сообщение об ошибке
          let errorMessage = "Не удалось загрузить аудиофайл.";
          const errorDetails = error?.message || directError?.message || '';
          
          if (errorDetails.includes('network') || errorDetails.includes('Failed to fetch') || errorDetails.includes('NetworkError')) {
            errorMessage = "Ошибка сети. Проверьте подключение к интернету и попробуйте еще раз.";
          } else if (errorDetails.includes('timeout') || errorDetails.includes('Таймаут') || errorDetails.includes('AbortError')) {
            errorMessage = "Превышено время ожидания. Файл слишком большой или медленное соединение. Попробуйте позже.";
          } else if (errorDetails.includes('401') || errorDetails.includes('403') || errorDetails.includes('Unauthorized')) {
            errorMessage = "Ошибка авторизации. Войдите в систему заново.";
          } else if (errorDetails.includes('404') || errorDetails.includes('Not Found')) {
            errorMessage = "Аудиофайл не найден. Возможно, он был удален.";
          } else if (errorDetails.includes('CORS') || errorDetails.includes('cors')) {
            errorMessage = "Ошибка доступа к файлу. Обратитесь к администратору.";
          } else if (errorDetails) {
            errorMessage = `Ошибка загрузки: ${errorDetails}`;
          }
          
          // Добавляем информацию о браузере для диагностики
          const userAgent = navigator.userAgent;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
          console.error('Audio load error details:', {
            error: errorDetails,
            isMobile,
            userAgent,
            audioUrl: directUrl || 'not set',
          });
          
          // Показываем уведомление только на десктопе (аудиоплеер скрыт на мобильных)
          if (!isMobile) {
            toast({
              title: "Ошибка загрузки аудио",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }
      }
    };
    
    loadAudio();

    // Очистка object URL при размонтировании
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [id, enrichedConsultation?.processingStatus, enrichedConsultation?.status, toast]);

  // Инициализация AudioContext и AnalyserNode для визуализации
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    // Проверяем, не был ли уже создан source для этого audio элемента
    // Если audio элемент уже подключен к другому source, пропускаем инициализацию
    if (sourceRef.current) {
      // Если source уже существует, просто возвращаемся
      return;
    }

    // Создаем AudioContext и подключаем к audio элементу
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256; // Размер FFT для анализа частот
      analyser.smoothingTimeConstant = 0.8; // Сглаживание для более плавной визуализации
      
      // Проверяем, не подключен ли уже audio элемент к другому source
      // Если audio.srcObject существует, это может означать, что элемент уже подключен
      let source: MediaElementAudioSourceNode;
      try {
        source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;

        // Инициализируем массив данных для визуализации
        const barsCount = 120; // Увеличиваем количество баров для лучшей детализации
        setAudioData(Array(barsCount).fill(0));
      } catch (sourceError: any) {
        // Если ошибка связана с тем, что элемент уже подключен, просто закрываем контекст
        if (sourceError.message && sourceError.message.includes('already connected')) {
          console.warn('Audio element already connected, skipping AudioContext initialization');
          audioContext.close().catch(console.error);
          return;
        }
        throw sourceError;
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }

    return () => {
      // Очистка при размонтировании
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Игнорируем ошибки при отключении
        }
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (e) {
          // Игнорируем ошибки
        }
        analyserRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [audioUrl]);

  // Визуализация звука в реальном времени
  useEffect(() => {
    const barsCount = 120; // Количество баров для визуализации
    
    if (!isPlaying || !analyserRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Когда не играет, сбрасываем данные к минимальным значениям
      if (!isPlaying) {
        setAudioData(Array(barsCount).fill(5));
      }
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const bufferLength = analyser.frequencyBinCount;
    const samplesPerBar = Math.floor(bufferLength / barsCount);

    const updateVisualization = () => {
      if (!analyserRef.current || !isPlaying) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      
      const newAudioData: number[] = [];
      for (let i = 0; i < barsCount; i++) {
        let sum = 0;
        const start = i * samplesPerBar;
        const end = Math.min(start + samplesPerBar, bufferLength);
        
        for (let j = start; j < end; j++) {
          sum += dataArray[j];
        }
        const average = sum / (end - start);
        // Нормализуем от 0 до 100 для высоты
        const normalized = Math.min((average / 255) * 100, 100);
        // Минимальная высота для видимости
        newAudioData.push(Math.max(normalized, 5));
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
  }, [isPlaying]);

  // Генерация статичной формы волны из аудио файла
  useEffect(() => {
    if (!audioUrl) return;

    const generateStaticWaveform = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const barsCount = 120;
        const channelData = audioBuffer.getChannelData(0); // Берем первый канал
        const samplesPerBar = Math.floor(channelData.length / barsCount);
        
        const waveform: number[] = [];
        
        for (let i = 0; i < barsCount; i++) {
          const start = i * samplesPerBar;
          const end = Math.min(start + samplesPerBar, channelData.length);
          
          let sum = 0;
          let max = 0;
          
          for (let j = start; j < end; j++) {
            const abs = Math.abs(channelData[j]);
            sum += abs;
            max = Math.max(max, abs);
          }
          
          // Используем комбинацию среднего и максимума для более выразительной формы волны
          const average = sum / (end - start);
          // Увеличиваем множитель и используем максимум для более высоких линий
          const normalized = Math.min((Math.max(average, max * 0.7) * 100) * 4, 100);
          waveform.push(Math.max(normalized, 8)); // Увеличиваем минимальную высоту до 8%
        }
        
        setStaticWaveform(waveform);
        audioContext.close();
      } catch (error) {
        console.error('Failed to generate static waveform:', error);
        // В случае ошибки используем минимальные значения
        setStaticWaveform(Array(120).fill(5));
      }
    };

    generateStaticWaveform();
  }, [audioUrl]);

  // Инициализация audio элемента и обработчиков событий
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleCanPlay = () => {
      // Аудио готово к воспроизведению
      console.log('Audio can play, duration:', audio.duration);
      setAudioError(null); // Очищаем ошибку, если аудио готово
      setIsLoadingAudio(false);
    };

    const handlePlay = async () => {
      setIsPlaying(true);
      // Возобновляем AudioContext если он был приостановлен (важно для мобильных устройств)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (error) {
          console.error('Failed to resume AudioContext:', error);
        }
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      const audioErrorObj = audio.error;
      let errorMessage = "Не удалось воспроизвести аудио.";
      
      if (audioErrorObj) {
        switch (audioErrorObj.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Воспроизведение было прервано.";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Ошибка сети при загрузке аудио. Проверьте подключение к интернету и попробуйте еще раз.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "Формат аудио не поддерживается вашим браузером. Попробуйте использовать Chrome, Safari или Firefox.";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Формат аудио не поддерживается. Обратитесь к администратору.";
            break;
        }
        
        // Дополнительная диагностика
        console.error('Audio error details:', {
          code: audioErrorObj.code,
          message: audioErrorObj.message,
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src.substring(0, 100), // Ограничиваем длину для безопасности
          isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        });
      } else {
        // Если нет кода ошибки, но событие error произошло
        console.error('Audio error event without error code:', {
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src.substring(0, 100),
        });
        
        // Проверяем состояние audio элемента
        if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          errorMessage = "Источник аудио не найден. Попробуйте обновить страницу.";
        } else if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
          errorMessage = "Аудио не загружено. Проверьте подключение к интернету.";
        } else {
          errorMessage = "Не удалось загрузить или воспроизвести аудио. Проверьте подключение к интернету.";
        }
      }
      
      // Сохраняем ошибку в состоянии для отображения в UI
      setAudioError(errorMessage);
      
      // Показываем уведомление только на десктопе (аудиоплеер скрыт на мобильных)
      if (!isMobile) {
        toast({
          title: "Ошибка воспроизведения",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      setIsPlaying(false);
      setIsLoadingAudio(false);
    };

    const handleLoadStart = () => {
      console.log('Audio load started');
    };

    const handleLoadedData = () => {
      console.log('Audio data loaded');
      setIsLoadingAudio(false);
    };

    const handleWaiting = () => {
      console.log('Audio waiting for data');
    };

    const handleStalled = () => {
      console.warn('Audio stalled - network issue');
    };

    // Устанавливаем атрибуты для лучшей совместимости с мобильными браузерами
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'metadata');
    
    // Добавляем обработчики событий
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
    };
  }, [audioUrl, toast]);

  // Обработчик воспроизведения/паузы
  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) {
      setAudioError("Аудиоплеер не инициализирован. Обновите страницу.");
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        // Очищаем предыдущую ошибку
        setAudioError(null);
        
        // На мобильных устройствах AudioContext может быть приостановлен
        // Активируем его перед воспроизведением
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          try {
            await audioContextRef.current.resume();
          } catch (ctxError) {
            console.warn('Failed to resume AudioContext:', ctxError);
            // Продолжаем попытку воспроизведения даже если AudioContext не удалось возобновить
          }
        }
        
        // Проверяем состояние audio элемента
        if (audio.error) {
          const errorCode = audio.error.code;
          let errorMsg = "Ошибка загрузки аудио. ";
          switch (errorCode) {
            case MediaError.MEDIA_ERR_NETWORK:
              errorMsg += "Проверьте подключение к интернету.";
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMsg += "Формат не поддерживается. Попробуйте другой браузер.";
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMsg += "Формат не поддерживается.";
              break;
            default:
              errorMsg += "Попробуйте обновить страницу.";
          }
          setAudioError(errorMsg);
          // Показываем уведомление только на десктопе (аудиоплеер скрыт на мобильных)
          if (!isMobile) {
            toast({
              title: "Ошибка воспроизведения",
              description: errorMsg,
              variant: "destructive",
            });
          }
          return;
        }
        
        // Проверяем, загружено ли аудио
        if (audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          // Если аудио еще не загружено, ждем загрузки
          setIsLoadingAudio(true);
          setAudioError(null);
          
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              reject(new Error('Таймаут загрузки аудио'));
            }, 15000); // 15 секунд таймаут для мобильных
            
            const handleCanPlay = () => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              setIsLoadingAudio(false);
              resolve();
            };
            
            const handleError = () => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              setIsLoadingAudio(false);
              reject(new Error('Ошибка загрузки аудио'));
            };
            
            audio.addEventListener('canplay', handleCanPlay, { once: true });
            audio.addEventListener('error', handleError, { once: true });
            
            // Загружаем аудио, если еще не загружено
            if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
              audio.load();
            }
          });
        }
        
        // Пытаемся воспроизвести
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          // Если воспроизведение началось успешно, очищаем ошибки
          setAudioError(null);
        }
      } catch (error: any) {
        console.error('Failed to play audio:', error);
        setIsLoadingAudio(false);
        
        // Более детальное сообщение об ошибке
        let errorMessage = "Не удалось воспроизвести аудио. Попробуйте еще раз.";
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            errorMessage = "Воспроизведение заблокировано браузером. Нажмите на кнопку воспроизведения еще раз.";
          } else if (error.name === 'NotSupportedError') {
            errorMessage = "Формат аудио не поддерживается вашим браузером. Попробуйте использовать Chrome, Safari или Firefox.";
          } else if (error.message.includes('Таймаут')) {
            errorMessage = "Превышено время ожидания загрузки аудио. Проверьте подключение к интернету и попробуйте еще раз.";
          } else if (error.message.includes('Ошибка загрузки')) {
            errorMessage = "Не удалось загрузить аудиофайл. Проверьте подключение к интернету.";
          }
        }
        
        setAudioError(errorMessage);
        // Показываем уведомление только на десктопе (аудиоплеер скрыт на мобильных)
        if (!isMobile) {
          toast({
            title: "Ошибка воспроизведения",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    }
  };

  // Обработчик клика на прогресс-бар для перемотки
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Форматирование времени
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Вычисляем процент прогресса
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Используем статичную форму волны, если она загружена, иначе динамическую или минимальные значения
  const barsCount = 120;
  const displayAudioData = staticWaveform.length > 0 
    ? staticWaveform 
    : (audioData.length > 0 ? audioData : Array(barsCount).fill(5));
  
  // Определяем статус обработки
  const processingStatus = enrichedConsultation?.processingStatus ?? 
                           (enrichedConsultation?.status as ConsultationProcessingStatus) ?? 
                           ConsultationProcessingStatus.None;
  
  // Определяем, обрабатывается ли консультация
  const isProcessing = processingStatus === ConsultationProcessingStatus.InProgress || 
                       processingStatus === ConsultationProcessingStatus.None;
  
  // Получаем текстовое описание статуса
  const getStatusText = (status: ConsultationProcessingStatus) => {
    switch (status) {
      case ConsultationProcessingStatus.None:
        return 'Ожидание обработки';
      case ConsultationProcessingStatus.InProgress:
        return 'Обработка...';
      case ConsultationProcessingStatus.Failed:
        return 'Ошибка обработки';
      case ConsultationProcessingStatus.Completed:
        return 'Готово';
      default:
        return 'Неизвестный статус';
    }
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Загрузка консультации...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !enrichedConsultation) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <div className="text-center py-20">
            <h2 className="text-xl font-bold mb-2">Консультация не найдена</h2>
            <p className="text-muted-foreground">Консультация с ID {id} не найдена</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4">Вернуться к списку</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const handleCopy = () => {
    toast({ title: "Скопировано в буфер обмена" });
  };

  const handleShare = async () => {
    if (!enrichedConsultation || !id) return;

    try {
      // Генерируем публичную ссылку
      // Для простоты используем формат /share/consultation/{id}
      // В будущем можно добавить генерацию токена на бэкенде
      const publicUrl = `${window.location.origin}/share/consultation/${id}`;
      
      // Копируем ссылку в буфер обмена
      await navigator.clipboard.writeText(publicUrl);
      
      toast({ 
        title: "Публичная ссылка создана", 
        description: "Ссылка скопирована в буфер обмена. Эта ссылка доступна только для чтения пациентам." 
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback для старых браузеров
      const publicUrl = `${window.location.origin}/share/consultation/${id}`;
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({ 
          title: "Публичная ссылка создана", 
          description: "Ссылка скопирована в буфер обмена." 
        });
      } catch (err) {
        toast({ 
          title: "Ошибка", 
          description: "Не удалось скопировать ссылку. Ссылка: " + publicUrl,
          variant: "destructive"
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const handleDownloadPDF = async () => {
    if (!enrichedConsultation) return;

    try {
      // Создаем временный контейнер для PDF контента
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '800px';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.backgroundColor = '#ffffff';
      pdfContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      pdfContainer.style.color = '#000000';
      pdfContainer.style.lineHeight = '1.6';

      // Заголовок
      const title = document.createElement('h1');
      title.textContent = 'Медицинский отчет';
      title.style.fontSize = '24px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '20px';
      title.style.color = '#000000';
      pdfContainer.appendChild(title);

      // Информация о консультации
      const info = document.createElement('div');
      info.style.fontSize = '14px';
      info.style.color = '#666666';
      info.style.marginBottom = '20px';
      info.style.paddingBottom = '20px';
      info.style.borderBottom = '1px solid #e0e0e0';
      const consultationInfo = [
        enrichedConsultation.date ? format(new Date(enrichedConsultation.date), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана',
        `Длительность: ${enrichedConsultation.duration || '0:00'}`,
        `Пациент: ${enrichedConsultation.patientName || 'Не указан'}`,
      ].filter(Boolean).join(' • ');
      info.textContent = consultationInfo;
      pdfContainer.appendChild(info);

      // Функция для создания секции
      const createSection = (sectionTitle: string, content: string) => {
        const section = document.createElement('div');
        section.style.marginBottom = '30px';

        const title = document.createElement('h2');
        title.textContent = sectionTitle;
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        title.style.color = '#000000';
        section.appendChild(title);

        const text = document.createElement('p');
        text.textContent = content || 'Не указано';
        text.style.fontSize = '14px';
        text.style.color = '#333333';
        text.style.whiteSpace = 'pre-wrap';
        text.style.wordWrap = 'break-word';
        section.appendChild(text);

        return section;
      };

      // Добавляем секции
      pdfContainer.appendChild(createSection('Жалобы', complaints || enrichedConsultation.complaints || ''));
      pdfContainer.appendChild(createSection('Объективный статус', objective || enrichedConsultation.objective || ''));
      pdfContainer.appendChild(createSection('План лечения', treatmentPlan || enrichedConsultation.treatmentPlan || ''));
      pdfContainer.appendChild(createSection('Выжимка', summary || enrichedConsultation.summary || ''));

      if (comment || enrichedConsultation.comment) {
        const commentSection = createSection('Комментарий врача', comment || enrichedConsultation.comment || '');
        commentSection.style.color = '#666666';
        pdfContainer.appendChild(commentSection);
      }

      // Добавляем контейнер в DOM
      document.body.appendChild(pdfContainer);

      // Конвертируем в canvas
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Удаляем временный контейнер
      document.body.removeChild(pdfContainer);

      // Создаем PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;

      // Если контент не помещается на одну страницу, разбиваем на несколько
      const pageHeight = pdfHeight;
      let heightLeft = imgScaledHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgScaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
        heightLeft -= pageHeight;
      }

      // Добавляем транскрипцию на отдельной странице, если есть
      if (enrichedConsultation.transcript) {
        pdf.addPage();
        const transcriptContainer = document.createElement('div');
        transcriptContainer.style.position = 'absolute';
        transcriptContainer.style.left = '-9999px';
        transcriptContainer.style.width = '800px';
        transcriptContainer.style.padding = '40px';
        transcriptContainer.style.backgroundColor = '#ffffff';
        transcriptContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        transcriptContainer.style.color = '#000000';

        const transcriptTitle = document.createElement('h1');
        transcriptTitle.textContent = 'Транскрипция';
        transcriptTitle.style.fontSize = '24px';
        transcriptTitle.style.fontWeight = 'bold';
        transcriptTitle.style.marginBottom = '20px';
        transcriptContainer.appendChild(transcriptTitle);

        const transcriptText = document.createElement('p');
        transcriptText.textContent = enrichedConsultation.transcript;
        transcriptText.style.fontSize = '12px';
        transcriptText.style.color = '#333333';
        transcriptText.style.whiteSpace = 'pre-wrap';
        transcriptText.style.wordWrap = 'break-word';
        transcriptText.style.fontFamily = 'monospace';
        transcriptContainer.appendChild(transcriptText);

        document.body.appendChild(transcriptContainer);
        const transcriptCanvas = await html2canvas(transcriptContainer, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        document.body.removeChild(transcriptContainer);

        const transcriptImgData = transcriptCanvas.toDataURL('image/png');
        const transcriptImgWidth = transcriptCanvas.width;
        const transcriptImgHeight = transcriptCanvas.height;
        const transcriptRatio = Math.min(pdfWidth / transcriptImgWidth, pdfHeight / transcriptImgHeight);
        const transcriptImgScaledWidth = transcriptImgWidth * transcriptRatio;
        const transcriptImgScaledHeight = transcriptImgHeight * transcriptRatio;

        let transcriptHeightLeft = transcriptImgScaledHeight;
        let transcriptPosition = 0;

        pdf.addImage(transcriptImgData, 'PNG', 0, transcriptPosition, transcriptImgScaledWidth, transcriptImgScaledHeight);
        transcriptHeightLeft -= pageHeight;

        while (transcriptHeightLeft > 0) {
          transcriptPosition = transcriptHeightLeft - transcriptImgScaledHeight;
          pdf.addPage();
          pdf.addImage(transcriptImgData, 'PNG', 0, transcriptPosition, transcriptImgScaledWidth, transcriptImgScaledHeight);
          transcriptHeightLeft -= pageHeight;
        }
      }

      // Сохраняем PDF
      const fileName = `consultation_${enrichedConsultation.id}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF скачан",
        description: "Медицинский отчет успешно сохранен в PDF.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать PDF файл. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  };

  const handleReprocess = async () => {
    if (!id) return;
    
    setIsReprocessing(true);
    try {
      await consultationsApi.reprocess(id);
      
      // Инвалидируем кэш консультации для обновления данных
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      
      toast({
        title: "Переобработка запущена",
        description: "Консультация отправлена на повторную обработку. Данные обновятся автоматически.",
      });
    } catch (error) {
      console.error('Reprocess consultation error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось запустить переобработку. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      await consultationsApi.delete(id);
      
      // Инвалидируем кэш консультаций и пациента
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      if (enrichedConsultation?.patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-consultations', enrichedConsultation.patientId] });
      }
      
      toast({
        title: "Консультация удалена",
        description: "Консультация успешно удалена.",
      });
      
      // Перенаправляем на страницу пациента или дашборд
      if (enrichedConsultation?.patientId) {
        setLocation(`/patient/${enrichedConsultation.patientId}`);
      } else {
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error('Delete consultation error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить консультацию. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <Link href={enrichedConsultation.patientId ? `/patient/${enrichedConsultation.patientId}` : '/dashboard'}>
              <Button variant="ghost" className="pl-0 mb-2 hover:bg-transparent hover:text-primary gap-2 text-muted-foreground text-sm md:text-base">
                <ArrowLeft className="w-4 h-4" />
                Назад
              </Button>
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Отчет о консультации
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
                  {enrichedConsultation.date ? format(new Date(enrichedConsultation.date), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана'} • {enrichedConsultation.duration || '0:00'} • {enrichedConsultation.patientName || "Пациент не назначен"}
                </p>
              </div>
              {isProcessing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">{getStatusText(processingStatus)}</span>
                </div>
              )}
              {processingStatus === ConsultationProcessingStatus.Failed && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{getStatusText(processingStatus)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base" onClick={handleShare}>
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Поделиться</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base"
              onClick={handleDownloadPDF}
              disabled={isProcessing}
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Удалить</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить консультацию?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы уверены, что хотите удалить эту консультацию? 
                    Это действие нельзя отменить. Все данные консультации будут безвозвратно удалены.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Удаление...
                      </>
                    ) : (
                      'Удалить'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Audio Player Card - скрыт на мобильных устройствах */}
        <Card className="hidden md:block rounded-3xl border-border/50 bg-secondary/30 overflow-hidden">
          {/* Отображение ошибки воспроизведения */}
          {audioError && (
            <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">Ошибка воспроизведения</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{audioError}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs shrink-0"
                  onClick={() => {
                    setAudioError(null);
                    // Пробуем перезагрузить аудио
                    if (audioRef.current && audioUrl) {
                      audioRef.current.load();
                    }
                  }}
                >
                  Повторить
                </Button>
              </div>
            </div>
          )}
          <div className="p-2 sm:p-3 md:p-4 flex items-center gap-1 sm:gap-1.5 md:gap-4">
            <Button 
              size="icon" 
              className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full shrink-0" 
              onClick={handlePlayPause}
              disabled={!audioUrl || isLoadingAudio || !!audioError}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="fill-current w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              ) : (
                <Play className="fill-current ml-0.5 sm:ml-0.5 md:ml-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              )}
            </Button>
            <div className="flex-1 relative min-w-0 overflow-hidden">
              <div 
                ref={progressBarRef}
                className={cn(
                  "h-9 sm:h-10 md:h-12 flex items-center gap-0.5 group relative w-full pr-1 sm:pr-1.5 md:pr-0",
                  audioError ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
                onClick={audioError ? undefined : handleProgressClick}
              >
                 {/* Audio Waveform Progress Bar */}
                 {displayAudioData.map((height, i) => {
                   const barPosition = ((i + 0.5) / displayAudioData.length) * 100; // Центр бара
                   const isBeforeProgress = barPosition < progressPercentage;
                   
                   return (
                     <div 
                       key={i} 
                       className={cn(
                         "flex-1 rounded-full transition-all duration-75 min-w-[1px] md:min-w-[2px]",
                         isBeforeProgress 
                           ? "bg-foreground" 
                           : "bg-muted-foreground/30"
                       )}
                       style={{ 
                         height: `${Math.max(height, 5)}%`,
                         transition: 'height 0.075s ease-out, background-color 0.15s ease-out'
                       }}
                     />
                   );
                 })}
              </div>
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-mono text-muted-foreground whitespace-nowrap shrink-0 min-w-[50px] sm:min-w-[55px] md:min-w-[70px] text-right ml-1 sm:ml-1.5 md:ml-0">
              {audioUrl 
                ? `${formatTime(currentTime)} / ${formatTime(duration || (enrichedConsultation.audioDuration ? enrichedConsultation.audioDuration : 0))}` 
                : (enrichedConsultation.duration || (enrichedConsultation.audioDuration ? formatTime(enrichedConsultation.audioDuration) : '0:00'))
              }
            </span>
          </div>
          {/* Скрытый audio элемент */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              crossOrigin="anonymous"
              playsInline
              controls={false}
            />
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Report */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <Tabs defaultValue="report" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 h-10 md:h-12 p-1 bg-secondary/50 rounded-2xl">
                <TabsTrigger value="report" className="rounded-xl">Медицинский отчет</TabsTrigger>
                <TabsTrigger value="transcript" className="rounded-xl">Транскрипция</TabsTrigger>
              </TabsList>

              <TabsContent value="report" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {isProcessing ? (
                  <Card className="rounded-3xl border-border/50">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                      <h3 className="text-lg font-bold mb-2">Обработка консультации</h3>
                      <p className="text-muted-foreground">
                        {processingStatus === ConsultationProcessingStatus.InProgress 
                          ? 'Идет обработка аудиофайла и генерация отчета...' 
                          : 'Ожидание начала обработки...'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Данные появятся автоматически после завершения обработки
                      </p>
                    </CardContent>
                  </Card>
                ) : processingStatus === ConsultationProcessingStatus.Failed ? (
                  <Card className="rounded-3xl border-destructive/20 bg-destructive/5">
                    <CardContent className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                      <h3 className="text-lg font-bold mb-2 text-destructive">Ошибка обработки</h3>
                      <p className="text-muted-foreground mb-4">
                        Не удалось обработать консультацию. Попробуйте переобработать.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={async () => {
                          if (!id) return;
                          try {
                            await consultationsApi.reprocess(id);
                            toast({
                              title: "Переобработка запущена",
                              description: "Консультация отправлена на повторную обработку.",
                            });
                          } catch (error) {
                            toast({
                              title: "Ошибка",
                              description: "Не удалось запустить переобработку.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Переобработать
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {isSaving && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Сохранение изменений...</span>
                      </div>
                    )}
                    {isSaved && !isSaving && (
                      <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-4">
                        <Check className="w-4 h-4" />
                        <span>Изменения сохранены</span>
                      </div>
                    )}
                    <ReportSection 
                      title="Жалобы" 
                      content={complaints} 
                      onChange={setComplaints}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="Объективный статус" 
                      content={objective} 
                      onChange={setObjective}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="План лечения" 
                      content={treatmentPlan} 
                      onChange={setTreatmentPlan}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="Выжимка" 
                      content={summary} 
                      onChange={setSummary}
                      placeholder="Не указано"
                    />
                    <ReportSection 
                      title="Комментарий врача" 
                      content={comment} 
                      onChange={setComment}
                      placeholder="Не указано"
                      isPrivate 
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="animate-in fade-in slide-in-from-bottom-2">
                <Card className="rounded-3xl border-border/50">
                  <CardContent className="p-6">
                    {isProcessing ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Транскрипция обрабатывается...</p>
                      </div>
                    ) : processingStatus === ConsultationProcessingStatus.Failed ? (
                      <div className="text-center py-12">
                        <AlertCircle className="w-8 h-8 mx-auto mb-4 text-destructive" />
                        <p className="text-muted-foreground">Транскрипция не доступна</p>
                      </div>
                    ) : (
                      <>
                    <div className="flex justify-end mb-4">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopy}>
                        <Copy className="w-3 h-3" /> Копировать текст
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-mono text-sm">
                          {enrichedConsultation.transcript || 'Транскрипция пока не готова'}
                    </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-4 md:space-y-6">
            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Действия ИИ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AlertDialog open={reprocessDialogOpen} onOpenChange={setReprocessDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="secondary" 
                      className="w-full justify-start rounded-xl h-12 gap-3"
                      disabled={isReprocessing || isDeleting}
                    >
                      <RefreshCw className={cn("w-4 h-4", isReprocessing && "animate-spin")} /> 
                      {isReprocessing ? "Переобработка..." : "Пересоздать отчет"}
                </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Пересоздать отчет?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Вы уверены, что хотите пересоздать отчет? 
                        <strong className="block mt-2 text-foreground">
                          Все внесенные правки будут удалены и заменены результатами новой обработки.
                        </strong>
                        Консультация будет отправлена на повторную обработку, и данные обновятся автоматически после завершения.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isReprocessing}>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReprocess}
                        disabled={isReprocessing}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isReprocessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Переобработка...
                          </>
                        ) : (
                          'Пересоздать отчет'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {!enrichedConsultation.patientId && (
              <Card className="rounded-3xl border-destructive/20 bg-destructive/5">
                <CardHeader>
                   <CardTitle className="text-lg text-destructive">Не привязан</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Эта консультация не привязана ни к одной карточке пациента.</p>
                  <Button className="w-full rounded-xl" variant="destructive">Привязать к пациенту</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ReportSection({ 
  title, 
  content, 
  onChange,
  placeholder = '',
  isPrivate = false 
}: { 
  title: string; 
  content: string; 
  onChange?: (value: string) => void;
  placeholder?: string;
  isPrivate?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isEditable = !!onChange;

  // Автоматическое изменение высоты textarea при изменении содержимого
  useEffect(() => {
    if (textareaRef.current) {
      // Сбрасываем высоту, чтобы получить правильный scrollHeight
      textareaRef.current.style.height = 'auto';
      // Устанавливаем высоту на основе содержимого
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
    // Автоматически изменяем высоту при вводе
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <Card className={cn("rounded-3xl border-border/50 transition-all hover:border-primary/20 overflow-hidden", isPrivate && "bg-secondary/20 border-dashed")}>
      <div className="p-4 pb-2 border-b border-border/50">
        <div className="flex justify-between items-center">
           <h3 className="text-lg font-bold">{title}</h3>
           {isPrivate && <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary px-2 py-1 rounded text-muted-foreground">Личное</span>}
        </div>
      </div>
      <div className="relative">
      <Textarea 
          ref={textareaRef}
          className={cn(
            "min-h-[120px] w-full border-none resize-none focus-visible:ring-1 focus-visible:ring-ring bg-transparent pt-4 pl-4 pr-4 pb-4 text-base leading-relaxed break-words overflow-hidden transition-colors",
            isEditable 
              ? "text-foreground focus:text-foreground" 
              : "text-muted-foreground focus:text-foreground"
          )}
        value={content || ''}
        onChange={handleChange}
        readOnly={!isEditable}
        disabled={!isEditable}
        placeholder={placeholder}
        rows={1}
      />
      </div>
    </Card>
  );
}