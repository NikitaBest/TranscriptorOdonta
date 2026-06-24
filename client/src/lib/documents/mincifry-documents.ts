const MINCIFRY_DOCS_FOLDER = 'mIn';

export const MINCIFRY_DOCUMENTS = [
  {
    fileName: '00_Документ для регистрации ПО (общая информация).docx',
    title: 'Документ для регистрации ПО (общая информация)',
  },
  {
    fileName: '01_Описание_функциональных_характеристик_Odonta_AI.docx',
    title: 'Описание функциональных характеристик',
  },
  {
    fileName: '02_Руководство_пользователя_Odonta_AI.docx',
    title: 'Руководство пользователя',
  },
  {
    fileName: '03_Техническое_описание_развернутого_экземпляра_Odonta_AI.docx',
    title: 'Техническое описание развернутого экземпляра',
  },
  {
    fileName: '04_Описание_жизненного_цикла_ПО_Odonta_AI.docx',
    title: 'Описание жизненного цикла ПО',
  },
  {
    fileName: '05_Сведения_о_службе_поддержки_Odonta_AI.docx',
    title: 'Сведения о службе поддержки',
  },
  {
    fileName: '06_Опись_документов_подтверждающих_права_Odonta_AI.docx',
    title: 'Опись документов, подтверждающих права',
  },
  {
    fileName: '07_Список_сторонних_компонентов_Odonta_AI.docx',
    title: 'Список сторонних компонентов',
  },
  {
    fileName: '08_Сведения_о_сайте_и_продаже_Odonta_AI.docx',
    title: 'Сведения о сайте и продаже',
  },
] as const;

export function getMincifryDocumentUrl(fileName: string): string {
  return `/documents/${MINCIFRY_DOCS_FOLDER}/${encodeURIComponent(fileName)}`;
}

export function downloadMincifryDocument(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
