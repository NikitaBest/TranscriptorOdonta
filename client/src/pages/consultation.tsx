import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MOCK_CONSULTATIONS } from '@/lib/mock-data';
import { ArrowLeft, Download, Share2, Copy, Play, Pause, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ConsultationPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const consultation = MOCK_CONSULTATIONS.find(c => c.id === id);
  const [isPlaying, setIsPlaying] = useState(false);
  
  if (!consultation) return <div>Консультация не найдена</div>;

  const handleCopy = () => {
    toast({ title: "Скопировано в буфер обмена" });
  };

  const handleShare = () => {
    toast({ 
      title: "Публичная ссылка создана", 
      description: "Ссылка скопирована. Эта ссылка доступна только для чтения пациентам." 
    });
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <Link href={consultation.patientId ? `/patient/${consultation.patientId}` : '/dashboard'}>
              <Button variant="ghost" className="pl-0 mb-2 hover:bg-transparent hover:text-primary gap-2 text-muted-foreground text-sm md:text-base">
                <ArrowLeft className="w-4 h-4" />
                Назад
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Отчет о консультации
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {format(new Date(consultation.date), 'd MMMM yyyy', { locale: ru })} • {consultation.duration} • {consultation.patientName || "Пациент не назначен"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base" onClick={handleShare}>
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Поделиться</span>
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none rounded-xl gap-2 h-11 md:h-12 text-sm md:text-base">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>

        {/* Audio Player Card */}
        <Card className="rounded-3xl border-border/50 bg-secondary/30 overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <Button 
              size="icon" 
              className="h-12 w-12 rounded-full shrink-0" 
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current ml-1" />}
            </Button>
            <div className="flex-1">
              <div className="h-12 flex items-center gap-1 opacity-50">
                 {/* Fake Waveform */}
                 {Array.from({ length: 60 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-foreground rounded-full" 
                      style={{ height: `${20 + Math.random() * 60}%` }}
                    />
                 ))}
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{consultation.duration}</span>
          </div>
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
                <ReportSection title="Жалобы" content={consultation.complaints} />
                <ReportSection title="Объективный статус" content={consultation.objective} />
                <ReportSection title="План лечения" content={consultation.plan} />
                <ReportSection title="Выжимка" content={consultation.summary} />
                <ReportSection title="Комментарий врача" content={consultation.comments} isPrivate />
              </TabsContent>

              <TabsContent value="transcript" className="animate-in fade-in slide-in-from-bottom-2">
                <Card className="rounded-3xl border-border/50">
                  <CardContent className="p-6">
                    <div className="flex justify-end mb-4">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopy}>
                        <Copy className="w-3 h-3" /> Копировать текст
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-mono text-sm">
                      {consultation.transcript}
                    </p>
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
                <Button variant="secondary" className="w-full justify-start rounded-xl h-12 gap-3">
                  <RefreshCw className="w-4 h-4" /> Пересоздать отчет
                </Button>
                <Button variant="secondary" className="w-full justify-start rounded-xl h-12 gap-3">
                  <Check className="w-4 h-4" /> Проверить по протоколам
                </Button>
              </CardContent>
            </Card>

            {!consultation.patientId && (
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

function ReportSection({ title, content, isPrivate = false }: { title: string, content: string, isPrivate?: boolean }) {
  return (
    <Card className={cn("rounded-3xl border-border/50 transition-all hover:border-primary/20", isPrivate && "bg-secondary/20 border-dashed")}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
           <CardTitle className="text-lg font-bold">{title}</CardTitle>
           {isPrivate && <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary px-2 py-1 rounded text-muted-foreground">Личное</span>}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea 
          className="min-h-[100px] border-none resize-none focus-visible:ring-0 bg-transparent p-0 text-base leading-relaxed text-muted-foreground focus:text-foreground transition-colors"
          defaultValue={content}
        />
      </CardContent>
    </Card>
  );
}