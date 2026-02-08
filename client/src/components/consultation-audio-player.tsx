import { useRef, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Play, Pause } from 'lucide-react';
import { consultationsApi } from '@/lib/api/consultations';
import { ConsultationProcessingStatus, ConsultationResponse } from '@/lib/api/types';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Константы
const AUDIO_BARS_COUNT = 120;
const AUDIO_LOAD_TIMEOUT = 15000; // 15 секунд таймаут для загрузки аудио

interface ConsultationAudioPlayerProps {
  consultationId: string | number;
  audioDuration?: number;
  processingStatus: ConsultationProcessingStatus;
  duration?: string; // Форматированная длительность для отображения
}

export function ConsultationAudioPlayer({
  consultationId,
  audioDuration,
  processingStatus,
  duration: displayDuration,
}: ConsultationAudioPlayerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

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
  const [isPlaying, setIsPlaying] = useState(false);

  // Форматирование времени
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Инициализация duration из пропсов
  useEffect(() => {
    if (audioDuration && !duration) {
      setDuration(audioDuration);
    }
  }, [audioDuration, duration]);

  // Загрузка аудио при загрузке консультации
  useEffect(() => {
    if (!consultationId) return;
    
    // Загружаем аудио только если консультация обработана
    if (processingStatus !== ConsultationProcessingStatus.Completed) {
      return;
    }

    setIsLoadingAudio(true);
    
    // Определяем, мобильное ли устройство
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Загружаем аудио из link в audioNotes консультации
    const loadAudio = async () => {
      try {
        // Пытаемся получить данные консультации из кэша, чтобы использовать link из audioNotes
        const consultationData = queryClient.getQueryData<ConsultationResponse>(['consultation', consultationId]);
        
        let url: string;
        if (consultationData?.audioUrl) {
          // Используем прямой URL из audioNotes[0].link (прямая ссылка на S3)
          console.log(`[Audio Player] Using audioUrl from consultation data: ${consultationData.audioUrl}`);
          url = consultationData.audioUrl;
        } else if (consultationData?.audioNotes && Array.isArray(consultationData.audioNotes) && consultationData.audioNotes.length > 0) {
          // Если audioUrl нет, но есть audioNotes, берем link напрямую
          const firstAudio = consultationData.audioNotes[0];
          if (firstAudio.link) {
            console.log(`[Audio Player] Using link from audioNotes: ${firstAudio.link}`);
            url = firstAudio.link;
          } else {
            throw new Error('Аудиофайл не найден в данных консультации');
          }
        } else {
          // Fallback: пытаемся получить через API (старый способ)
          console.log(`[Audio Player] No audioUrl in consultation data, fetching via API`);
          url = await consultationsApi.getAudioUrl(consultationId, consultationData);
        }
        
        // Пытаемся использовать прямую ссылку
        // Если это не сработает, audio элемент сам вызовет handleError
        setAudioUrl(url);
        setIsLoadingAudio(false);
        setAudioError(null); // Очищаем ошибку при успешной загрузке
        
        // Проверяем, можем ли мы загрузить файл через fetch (для создания Blob URL, если нужно)
        // Это делаем асинхронно, не блокируя установку URL
        if (url && url.startsWith('http')) {
          // Пытаемся загрузить через fetch для создания Blob URL, если прямая ссылка не работает
          // Но делаем это только если audio элемент не может загрузить напрямую
          // Это будет обработано в handleError, если нужно
        }
      } catch (error: any) {
        console.error('Failed to load audio:', error);
        setIsLoadingAudio(false);
          
        // Формируем детальное сообщение об ошибке
        let errorMessage = "Не удалось загрузить аудиофайл.";
        const errorDetails = error?.message || '';
        
        if (errorDetails.includes('network') || errorDetails.includes('Failed to fetch') || errorDetails.includes('NetworkError')) {
          errorMessage = "Ошибка сети. Проверьте подключение к интернету и попробуйте еще раз.";
        } else if (errorDetails.includes('timeout') || errorDetails.includes('Таймаут') || errorDetails.includes('AbortError')) {
          errorMessage = "Превышено время ожидания. Файл слишком большой или медленное соединение. Попробуйте позже.";
        } else if (errorDetails.includes('401') || errorDetails.includes('403') || errorDetails.includes('Unauthorized')) {
          errorMessage = "Ошибка авторизации. Войдите в систему заново.";
        } else if (errorDetails.includes('404') || errorDetails.includes('Not Found')) {
          errorMessage = "Аудиофайл не найден. Возможно, он был удален.";
        } else if (errorDetails.includes('405') || errorDetails.includes('Method Not Allowed')) {
          errorMessage = "Метод запроса не поддерживается. Обратитесь к администратору.";
        } else if (errorDetails.includes('500') || errorDetails.includes('Internal Server Error')) {
          errorMessage = "Ошибка сервера. Попробуйте позже.";
        } else if (errorDetails.includes('CORS') || errorDetails.includes('cors')) {
          errorMessage = "Ошибка доступа к файлу. Обратитесь к администратору.";
        } else if (errorDetails) {
          errorMessage = `Ошибка загрузки: ${errorDetails}`;
        }
        
        setAudioError(errorMessage);
        
        // Добавляем информацию о браузере для диагностики
        const userAgent = navigator.userAgent;
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(userAgent);
        console.error('Audio load error details:', {
          error: errorDetails,
          isMobile: isMobileDevice,
          userAgent,
        });
        
        // Показываем уведомление только на десктопе (аудиоплеер скрыт на мобильных)
        if (!isMobileDevice) {
          toast({
            title: "Ошибка загрузки аудио",
            description: errorMessage,
            variant: "destructive",
          });
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
  }, [consultationId, processingStatus, toast]);

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
        setAudioData(Array(AUDIO_BARS_COUNT).fill(0));
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
    if (!isPlaying || !analyserRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Когда не играет, сбрасываем данные к минимальным значениям
      if (!isPlaying) {
        setAudioData(Array(AUDIO_BARS_COUNT).fill(5));
      }
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const bufferLength = analyser.frequencyBinCount;
    const samplesPerBar = Math.floor(bufferLength / AUDIO_BARS_COUNT);

    const updateVisualization = () => {
      if (!analyserRef.current || !isPlaying) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      
      const newAudioData: number[] = [];
      for (let i = 0; i < AUDIO_BARS_COUNT; i++) {
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
  // ВАЖНО: Если аудио на внешнем сервере (S3) без CORS, генерация waveform не будет работать
  // В этом случае используем динамическую визуализацию или минимальные значения
  useEffect(() => {
    if (!audioUrl) return;

    const generateStaticWaveform = async () => {
      try {
        // Пытаемся загрузить через fetch с CORS
        const response = await fetch(audioUrl, {
          mode: 'cors',
          credentials: 'omit',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0); // Берем первый канал
        const samplesPerBar = Math.floor(channelData.length / AUDIO_BARS_COUNT);
        
        const waveform: number[] = [];
        
        for (let i = 0; i < AUDIO_BARS_COUNT; i++) {
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
      } catch (error: any) {
        // Если CORS ошибка или другая ошибка загрузки, просто пропускаем генерацию waveform
        // Audio элемент сам попробует загрузить файл, и если CORS настроен правильно, он загрузится
        if (error?.message?.includes('CORS') || error?.message?.includes('fetch')) {
          console.warn('[Audio Player] Cannot generate static waveform due to CORS. Audio playback should still work.');
        } else {
          console.error('Failed to generate static waveform:', error);
        }
        // В случае ошибки используем минимальные значения (динамическая визуализация будет работать)
        setStaticWaveform(Array(AUDIO_BARS_COUNT).fill(5));
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

    const handleError = async (e: Event) => {
      console.error('Audio error:', e);
      const audioErrorObj = audio.error;
      let errorMessage = "Не удалось воспроизвести аудио.";
      let shouldRetryWithBlob = false;
      
      if (audioErrorObj) {
        switch (audioErrorObj.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Воспроизведение было прервано.";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Ошибка сети при загрузке аудио. Проверьте подключение к интернету и попробуйте еще раз.";
            // Пытаемся загрузить через fetch и создать Blob URL
            shouldRetryWithBlob = true;
            break;
          case MediaError.MEDIA_ERR_DECODE:
            // Проверяем формат файла
            const isOgg = audio.src.includes('.ogg');
            if (isOgg) {
              errorMessage = "Формат OGG может не поддерживаться вашим браузером. Попробуйте использовать Chrome или Firefox.";
            } else {
              errorMessage = "Формат аудио не поддерживается вашим браузером. Попробуйте использовать Chrome, Safari или Firefox.";
            }
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            // Проверяем, может быть проблема с CORS
            if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
              errorMessage = "Источник аудио не найден. Возможно, проблема с доступом к файлу.";
              // Пытаемся загрузить через fetch и создать Blob URL
              shouldRetryWithBlob = true;
            } else {
              errorMessage = "Формат аудио не поддерживается. Обратитесь к администратору.";
            }
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
        
        // Пытаемся загрузить через fetch и создать Blob URL, если прямая ссылка не работает
        if (shouldRetryWithBlob && audio.src && audio.src.startsWith('http')) {
          try {
            console.log('[Audio Player] Attempting to load audio via fetch and create Blob URL');
            const response = await fetch(audio.src, {
              mode: 'cors',
              credentials: 'omit',
            });
            
            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              console.log('[Audio Player] Successfully created Blob URL, retrying playback');
              
              // Обновляем src на Blob URL
              audio.src = blobUrl;
              setAudioUrl(blobUrl);
              setAudioError(null);
              
              // Пытаемся загрузить снова
              await audio.load();
              return; // Выходим, если успешно
            }
          } catch (fetchError: any) {
            console.error('[Audio Player] Failed to load audio via fetch:', fetchError);
            // Если fetch тоже не работает, показываем ошибку
          }
        }
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
      // Аудио начало загрузку
    };

    const handleLoadedData = () => {
      setIsLoadingAudio(false);
    };

    const handleWaiting = () => {
      // Аудио ожидает данных
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
  }, [audioUrl, toast, isMobile]);

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
            }, AUDIO_LOAD_TIMEOUT);
            
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

  // Вычисляем процент прогресса
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Используем статичную форму волны, если она загружена, иначе динамическую или минимальные значения
  const displayAudioData = staticWaveform.length > 0 
    ? staticWaveform 
    : (audioData.length > 0 ? audioData : Array(AUDIO_BARS_COUNT).fill(5));

  // Не показываем плеер, если консультация еще обрабатывается
  if (processingStatus !== ConsultationProcessingStatus.Completed) {
    return null;
  }

  return (
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
            ? `${formatTime(currentTime)} / ${formatTime(duration || (audioDuration || 0))}` 
            : (displayDuration || (audioDuration ? formatTime(audioDuration) : '0:00'))
          }
        </span>
      </div>
      {/* Скрытый audio элемент */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          playsInline
          controls={false}
        />
      )}
    </Card>
  );
}

