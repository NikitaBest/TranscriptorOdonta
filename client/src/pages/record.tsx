import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Square, Pause, Play, Loader2, Save, X } from 'lucide-react';
import { getPatientById } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function RecordPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const patientId = searchParams.get('patientId');
  const patient = getPatientById(patientId);

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
      setLocation('/consultation/c1'); 
    }, 5000);
  };

  const handleCancel = () => {
    setIsRecording(false);
    setDuration(0);
    setStatus('idle');
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-8rem)] md:min-h-[80vh] flex items-center justify-center py-8 md:py-0">
        <div className="w-full max-w-2xl space-y-6 md:space-y-8 text-center px-4">
          
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