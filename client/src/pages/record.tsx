import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function RecordPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = searchParams.get('patientId');
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSheetOpen, setPatientSheetOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  // Загрузка списка пациентов
  const { data: patientsData = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsApi.get(),
    staleTime: 30000, // 30 секунд
  });

  // Загрузка данных выбранного пациента
  const { data: selectedPatientData } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => {
      if (!selectedPatientId) return null;
      return patientsApi.getById(selectedPatientId);
    },
    enabled: !!selectedPatientId,
  });

  // Преобразуем данные пациента для отображения
  const patient = selectedPatientData ? {
    id: String(selectedPatientData.id),
    firstName: selectedPatientData.firstName,
    lastName: selectedPatientData.lastName,
    phone: selectedPatientData.phone || '',
    avatar: `${selectedPatientData.firstName[0]}${selectedPatientData.lastName[0]}`.toUpperCase(),
  } : null;

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
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStopPromiseRef = useRef<{ resolve: () => void; reject: (error: Error) => void } | null>(null);

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

      // Создаем MediaRecorder для записи
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        console.log('Audio recorded:', audioBlob.size, 'bytes');
        
        // Разрешаем промис ожидания окончания записи
        if (recordingStopPromiseRef.current) {
          recordingStopPromiseRef.current.resolve();
          recordingStopPromiseRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Сохраняем данные каждую секунду
      
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
    setStatus('uploading');
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

      // Отправляем файл на бэкенд
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      if (audioBlob.size === 0) {
        throw new Error('Запись пуста');
      }

      const response = await consultationsApi.uploadConsultation(selectedPatientId, audioBlob);
      
      console.log('Consultation uploaded:', response);
      
      // Останавливаем поток
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Обрабатываем статус
      if (response.status === ConsultationProcessingStatus.Completed) {
        setStatus('idle');
        toast({
          title: "Консультация загружена",
          description: "Аудиофайл успешно отправлен и обработан.",
        });
        
        // Переходим на страницу пациента
        setTimeout(() => {
          setLocation(`/patient/${selectedPatientId}`);
        }, 1000);
      } else if (response.status === ConsultationProcessingStatus.Failed) {
        setStatus('idle');
        toast({
          title: "Ошибка обработки",
          description: "Не удалось обработать консультацию. Попробуйте еще раз.",
          variant: "destructive"
        });
      } else {
        // InProgress или None - показываем статус обработки
        setStatus('processing');
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
        title: "Ошибка загрузки",
        description: error instanceof Error ? error.message : "Не удалось отправить аудиофайл. Попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      // Очищаем запись
      audioChunksRef.current = [];
      setDuration(0);
      recordingStopPromiseRef.current = null;
    }
  };

  const handleCancel = () => {
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
    
    audioChunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
    setStatus('idle');
    setAudioData(Array(40).fill(0));
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setPatientSheetOpen(false);
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
                
                {/* Desktop: Select (patient is required) */}
                {!isMobile && (
                  <Select 
                    value={selectedPatientId ?? undefined}
                    onValueChange={(value) => setSelectedPatientId(value)}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl text-base bg-background border-border/50">
                      <SelectValue placeholder="Выберите пациента">
                        {patient ? `${patient.firstName} ${patient.lastName}` : "Пациент не выбран"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {isLoadingPatients ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Загрузка пациентов...
                        </div>
                      ) : filteredPatients.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Пациенты не найдены
                        </div>
                      ) : (
                        filteredPatients.map((p: PatientResponse) => (
                          <SelectItem key={p.id} value={String(p.id)} className="rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.firstName} {p.lastName}</span>
                              {p.phone && (
                                <span className="text-xs text-muted-foreground">({p.phone})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
          {(status === 'idle' || status === 'recording') && (
            <div className="flex items-center justify-center gap-4 md:gap-6">
              {status === 'recording' && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2"
                  onClick={handleCancel}
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
              )}

              {!isRecording ? (
                <Button 
                  size="icon" 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30 disabled:opacity-60 disabled:hover:scale-100"
                  disabled={!selectedPatientId}
                  onClick={handleStart}
                >
                  <Mic className="w-8 h-8 md:w-10 md:h-10" />
                </Button>
              ) : (
                <Button 
                  size="icon" 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-destructive text-destructive-foreground hover:scale-105 transition-transform shadow-2xl shadow-destructive/30"
                  onClick={handleStop}
                >
                  <Square className="w-6 h-6 md:w-8 md:h-8 fill-current" />
                </Button>
              )}

              {status === 'recording' && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2"
                  onClick={handlePause}
                >
                  {isPaused ? <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> : <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />}
                </Button>
              )}
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