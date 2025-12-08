import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { consultationsApi } from '@/lib/api/consultations';
import { ConsultationProcessingStatus } from '@/lib/api/types';
import type { ConsultationResponse } from '@/lib/api/types';
import { Loader2, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ShareConsultationPage() {
  const { id, token } = useParams();

  // Загрузка данных консультации (без авторизации для публичного доступа)
  const { data: consultationData, isLoading, error } = useQuery({
    queryKey: ['public-consultation', id, token],
    queryFn: () => {
      if (!id) throw new Error('ID консультации не указан');
      // Здесь можно добавить проверку токена на бэкенде
      // Пока используем обычный getById, но в будущем можно добавить отдельный эндпоинт
      return consultationsApi.getById(id);
    },
    enabled: !!id,
  });

  const consultation: ConsultationResponse | null = consultationData || null;

  // Форматирование времени
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Функция для создания секции отчета
  const createReportSection = (title: string, content: string | null | undefined) => {
    if (!content) return null;
    
    return (
      <Card className="rounded-3xl border-border/50 mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">{title}</h3>
          <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground">
            {content}
          </p>
        </CardContent>
      </Card>
    );
  };

  // Генерация PDF (та же логика, что и в consultation.tsx)
  const handleDownloadPDF = async () => {
    if (!consultation) return;

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
        consultation.date ? format(new Date(consultation.date), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана',
        `Длительность: ${consultation.duration || (consultation.audioDuration ? formatTime(consultation.audioDuration) : '0:00')}`,
        `Пациент: ${consultation.patientName || 'Не указан'}`,
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
      if (consultation.complaints) {
        pdfContainer.appendChild(createSection('Жалобы', consultation.complaints));
      }
      if (consultation.objective) {
        pdfContainer.appendChild(createSection('Объективный статус', consultation.objective));
      }
      if (consultation.treatmentPlan) {
        pdfContainer.appendChild(createSection('План лечения', consultation.treatmentPlan));
      }
      if (consultation.summary) {
        pdfContainer.appendChild(createSection('Выжимка', consultation.summary));
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
      if (consultation.transcript || consultation.transcriptionResult) {
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
        transcriptText.textContent = consultation.transcript || consultation.transcriptionResult || '';
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
      const fileName = `consultation_${consultation.id}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Не удалось создать PDF файл. Попробуйте еще раз.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Загрузка отчета...</p>
        </div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-bold mb-2">Отчет не найден</h2>
          <p className="text-muted-foreground">
            Запрошенный отчет не существует или ссылка недействительна.
          </p>
        </div>
      </div>
    );
  }

  // Проверяем статус обработки
  const processingStatus = consultation.processingStatus ?? 
                           (consultation.status as ConsultationProcessingStatus) ?? 
                           ConsultationProcessingStatus.None;

  if (processingStatus !== ConsultationProcessingStatus.Completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-bold mb-2">Отчет обрабатывается</h2>
          <p className="text-muted-foreground">
            Отчет еще не готов. Пожалуйста, попробуйте позже.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
            Медицинский отчет
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm md:text-base text-muted-foreground">
              {consultation.date ? format(new Date(consultation.date), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана'} • {consultation.duration || (consultation.audioDuration ? formatTime(consultation.audioDuration) : '0:00')} • {consultation.patientName || "Пациент не указан"}
            </p>
            <Button 
              variant="outline" 
              className="rounded-xl gap-2"
              onClick={handleDownloadPDF}
            >
              <Download className="w-4 h-4" />
              Скачать PDF
            </Button>
          </div>
        </div>

        {/* Report Content */}
        <div className="space-y-6">
          {createReportSection('Жалобы', consultation.complaints)}
          {createReportSection('Объективный статус', consultation.objective)}
          {createReportSection('План лечения', consultation.treatmentPlan)}
          {createReportSection('Выжимка', consultation.summary)}

          {/* Транскрипция */}
          {(consultation.transcript || consultation.transcriptionResult) && (
            <Card className="rounded-3xl border-border/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4">Транскрипция</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground font-mono">
                  {consultation.transcript || consultation.transcriptionResult}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

