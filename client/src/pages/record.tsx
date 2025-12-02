import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, Square, Pause, Play, Loader2, X, User, ChevronRight } from 'lucide-react';
import { getPatientById, MOCK_PATIENTS } from '@/lib/mock-data';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function RecordPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = searchParams.get('patientId');
  const isMobile = useIsMobile();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSheetOpen, setPatientSheetOpen] = useState(false);
  const patient = getPatientById(selectedPatientId);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading' | 'transcribing' | 'processing'>('idle');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRecording(true);
    setStatus('recording');
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = async () => {
    setIsRecording(false);
    setStatus('uploading');
    
    // Simulate processing steps
    setTimeout(() => setStatus('transcribing'), 1500);
    setTimeout(() => setStatus('processing'), 3000);
    setTimeout(() => {
      // Redirect to a "new" consultation page (using mock ID c3 which is 'processing' or creating a new view)
      // For demo, let's go to c1 or a new one
      // If patient is selected, redirect to patient page, otherwise to consultation
      if (selectedPatientId) {
        setLocation(`/patient/${selectedPatientId}`);
      } else {
        setLocation('/consultation/c1'); 
      }
    }, 5000);
  };

  const handleCancel = () => {
    setIsRecording(false);
    setDuration(0);
    setStatus('idle');
  };

  const handlePatientSelect = (patientId: string | null) => {
    setSelectedPatientId(patientId);
    setPatientSheetOpen(false);
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] md:min-h-[80vh] flex items-center justify-center py-8 md:py-0">
        <div className="w-full max-w-2xl space-y-6 md:space-y-8 text-center px-4">
          
          {/* Patient Selection */}
          {status === 'idle' && (
            <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 w-full">
              <div className="w-full max-w-md">
                <label className="text-sm font-medium text-muted-foreground mb-2 block text-left">
                  Выберите пациента
                </label>
                
                {/* Desktop: Select */}
                {!isMobile && (
                  <Select 
                    value={selectedPatientId || "none"} 
                    onValueChange={(value) => setSelectedPatientId(value === "none" ? null : value)}
                  >
                    <SelectTrigger className="w-full h-12 rounded-xl text-base bg-background border-border/50">
                      <SelectValue placeholder="Выберите пациента или оставьте без пациента">
                        {patient ? `${patient.firstName} ${patient.lastName}` : "Без пациента"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>Без пациента</span>
                        </div>
                      </SelectItem>
                      {MOCK_PATIENTS.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p.firstName} {p.lastName}</span>
                            <span className="text-xs text-muted-foreground">({p.phone})</span>
                          </div>
                        </SelectItem>
                      ))}
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
                              <span>Без пациента</span>
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
                        />
                        <CommandList className="max-h-[calc(80vh-8rem)]">
                          <CommandEmpty>Пациенты не найдены</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => handlePatientSelect(null)}
                              className="flex items-center gap-3 px-4 py-4 cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                                <User className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">Без пациента</div>
                                <div className="text-xs text-muted-foreground">Быстрая заметка</div>
                              </div>
                              {!selectedPatientId && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </CommandItem>
                            {MOCK_PATIENTS.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`${p.firstName} ${p.lastName} ${p.phone}`}
                                onSelect={() => handlePatientSelect(p.id)}
                                className="flex items-center gap-3 px-4 py-4 cursor-pointer"
                              >
                                <Avatar className="w-10 h-10 rounded-xl">
                                  <AvatarFallback className="rounded-xl bg-secondary font-medium">
                                    {p.avatar || `${p.firstName[0]}${p.lastName[0]}`}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{p.firstName} {p.lastName}</div>
                                  <div className="text-xs text-muted-foreground truncate">{p.phone}</div>
                                </div>
                                {selectedPatientId === p.id && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
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
              {patient ? `Консультация: ${patient.firstName} ${patient.lastName}` : 'Быстрая заметка (Без пациента)'}
            </h2>
            <h1 className="text-4xl md:text-6xl font-display font-bold tabular-nums tracking-tight">
              {formatTime(duration)}
            </h1>
          </div>

          {/* Visualizer Mock */}
          <div className="h-24 md:h-32 flex items-center justify-center gap-0.5 md:gap-1 px-4">
            {Array.from({ length: 40 }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1 md:w-1.5 bg-primary rounded-full transition-all duration-150",
                  status === 'recording' && !isPaused ? "animate-pulse" : "h-1"
                )}
                style={{ 
                  height: status === 'recording' && !isPaused ? `${Math.random() * 100}%` : '4px',
                  opacity: status === 'recording' && !isPaused ? 1 : 0.2 
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
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-2xl shadow-primary/30"
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