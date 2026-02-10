import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ConsultationResponse } from '@/lib/api/types';

interface ConsultationFields {
  complaints: string;
  objective: string;
  treatmentPlan: string;
  summary: string;
  comment: string;
}

interface ToastFunction {
  (options: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }): void;
}

/**
 * Генерирует и скачивает PDF файл с отчетом о консультации
 */
export async function generateConsultationPDF(
  consultation: ConsultationResponse,
  fields: ConsultationFields,
  toast: ToastFunction
): Promise<void> {
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
      `Длительность: ${consultation.duration || '0:00'}`,
      `Пациент: ${consultation.patientName || 'Не указан'}`,
    ].filter(Boolean).join(' • ');
    info.textContent = consultationInfo;
    pdfContainer.appendChild(info);

    // Функция для создания секции
    const createSection = (sectionTitle: string, content: string) => {
      const section = document.createElement('div');
      section.style.marginBottom = '30px';

      const sectionTitleEl = document.createElement('h2');
      sectionTitleEl.textContent = sectionTitle;
      sectionTitleEl.style.fontSize = '18px';
      sectionTitleEl.style.fontWeight = 'bold';
      sectionTitleEl.style.marginBottom = '10px';
      sectionTitleEl.style.color = '#000000';
      section.appendChild(sectionTitleEl);

      const text = document.createElement('p');
      text.textContent = content || 'Не указано';
      text.style.fontSize = '14px';
      text.style.color = '#333333';
      text.style.whiteSpace = 'pre-wrap';
      text.style.wordWrap = 'break-word';
      section.appendChild(text);

      return section;
    };

    // Если бэкенд прислал динамические свойства (properties), используем их
    if (consultation.properties && consultation.properties.length > 0) {
      const baseKeys = new Set(['complaints', 'objective', 'treatment_plan', 'summary', 'comment']);

      // Подготовим карту базовых значений с учетом локальных правок
      const baseValues: Record<string, string> = {
        complaints: fields.complaints || consultation.complaints || '',
        objective: fields.objective || consultation.objective || '',
        treatment_plan: fields.treatmentPlan || consultation.plan || consultation.treatmentPlan || '',
        summary: fields.summary || consultation.summary || '',
        comment: fields.comment || consultation.comments || consultation.comment || '',
      };

      consultation.properties
        .slice()
        .sort((a, b) => {
          const orderA = typeof a.parent?.order === 'number' ? a.parent!.order : 0;
          const orderB = typeof b.parent?.order === 'number' ? b.parent!.order : 0;
          return orderA - orderB;
        })
        .forEach((prop) => {
          const key = prop.parent?.key;
          const title = prop.parent?.title || 'Без названия';

          // Берем либо соответствующее базовое поле (с учётом правок),
          // либо значение из проперти
          let content = '';
          if (key && baseKeys.has(key)) {
            content = baseValues[key] ?? '';
          } else {
            content = prop.value ?? '';
          }

          const section = createSection(title, content);

          // Для комментария врача делаем более мягкий цвет, как раньше
          if (key === 'comment') {
            section.style.color = '#666666';
          }

          pdfContainer.appendChild(section);
        });
    } else {
      // Старый формат без properties: используем фиксированные блоки
      pdfContainer.appendChild(createSection('Жалобы', fields.complaints || consultation.complaints || ''));
      pdfContainer.appendChild(createSection('Объективный статус', fields.objective || consultation.objective || ''));
      pdfContainer.appendChild(createSection('План лечения', fields.treatmentPlan || consultation.plan || ''));
      pdfContainer.appendChild(createSection('Выжимка', fields.summary || consultation.summary || ''));

      if (fields.comment || consultation.comments || consultation.comment) {
        const commentSection = createSection('Комментарий врача', fields.comment || consultation.comments || consultation.comment || '');
        commentSection.style.color = '#666666';
        pdfContainer.appendChild(commentSection);
      }
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
    if (consultation.transcript) {
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
      transcriptText.textContent = consultation.transcript;
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
    throw error;
  }
}

