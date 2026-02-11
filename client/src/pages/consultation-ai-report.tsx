import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { consultationsApi } from '@/lib/api/consultations';
import type { ConsultationResponse, ConsultationProperty } from '@/lib/api/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Ключ свойства для AI-оценки консультации
const AI_REPORT_KEY = 'calgary_сambridge_report';

export default function ConsultationAIReportPage() {
  const { id } = useParams();

  const { data: consultation, isLoading, error } = useQuery({
    queryKey: ['consultation-ai-report', id],
    queryFn: async () => {
      if (!id) throw new Error('ID консультации не указан');
      const result = await consultationsApi.getById(id);
      return result;
    },
    enabled: !!id,
  });

  const getAiReportProperty = (c: ConsultationResponse | null): ConsultationProperty | null => {
    if (!c?.properties) return null;
    return (
      c.properties.find((p) => p.parent?.key === AI_REPORT_KEY) ?? null
    );
  };

  const aiProperty = consultation ? getAiReportProperty(consultation) : null;
  const aiTitle = aiProperty?.parent?.title || 'AI‑оценка консультации';
  const aiDescription = aiProperty?.parent?.description;
  const aiValue = aiProperty?.value ?? '';
  const hasContent = aiValue.trim().length > 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Загрузка AI‑оценки консультации...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !consultation || !aiProperty || !hasContent) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link href={id ? `/consultation/${id}` : '/dashboard'}>
              <Button
                variant="ghost"
                className="pl-0 hover:bg-transparent hover:text-primary gap-2 text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                К отчету
              </Button>
            </Link>
          </div>
          <Card className="rounded-3xl border-border/50">
            <CardContent className="p-10 text-center space-y-3">
              <h2 className="text-xl font-display font-bold">AI‑оценка недоступна</h2>
              <p className="text-sm text-muted-foreground">
                Для этой консультации AI‑оценка по шкале Калгари–Кембридж пока недоступна
                или не была сформирована.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href={`/consultation/${consultation.id}`}>
            <Button
              variant="ghost"
              className="pl-0 hover:bg-transparent hover:text-primary gap-2 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              К отчету
            </Button>
          </Link>
        </div>

        <Card className="rounded-3xl border-border/50">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <img
                src="/ideas.png"
                alt="AI рекомендации"
                className="w-8 h-8 rounded-lg bg-primary/5 p-1.5"
              />
              <div>
                <CardTitle className="text-xl md:text-2xl font-display">
                  {aiTitle}
                </CardTitle>
                {consultation.date && (
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    {format(new Date(consultation.date), 'd MMMM yyyy', { locale: ru })} •{' '}
                    {consultation.duration || '0:00'}
                  </p>
                )}
              </div>
            </div>
            {aiDescription && (
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                {aiDescription}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 md:p-5">
              <div
                className="text-sm md:text-base leading-relaxed text-foreground prose prose-sm max-w-none
                           prose-p:mb-3 prose-ul:mb-3 prose-ol:mb-3 prose-li:mb-1
                           prose-strong:font-semibold prose-em:italic"
                // Контент приходит с нашего бэкенда и содержит разметку (<b>, <i>, <ol> и т.д.),
                // поэтому рендерим его как HTML
                dangerouslySetInnerHTML={{ __html: aiValue }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

