import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

const PERSONAL_DATA_TEMPLATE_URL =
  'https://s3.twcstorage.ru/odonta/prod/documents/%D0%A1%D0%BE%D0%B3%D0%BB%D0%B0%D1%81%D0%B8%D0%B5_%D0%BD%D0%B0%C2%A0%D0%BE%D0%B1%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D1%83_%D0%BF%D0%B5%D1%80%D1%81%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85_%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D1%85_%D0%B4%D0%BB%D1%8F_%D0%B2%D1%80%D0%B0%D1%87%D0%B0_%D0%B8_%D0%BF%D0%B0%D1%86%D0%B8%D0%B5%D0%BD%D1%82%D0%B0.docx';

const EXTRA_DOCUMENTS = [
  {
    title: 'Руководство',
    description: 'Руководство по работе с приложением.',
    url: 'https://disk.yandex.ru/i/gR-kkCkmWEgl4A',
  },
  {
    title: 'Инструкция',
    description: 'Пошаговая инструкция для пользователей.',
    url: 'https://disk.yandex.ru/i/_fCSWhmA-mHA8g',
  },
  {
    title: 'Описание',
    description: 'Описание функциональности и возможностей.',
    url: 'https://disk.yandex.ru/i/t2Sg9UIdcsILRQ',
  },
];

export default function DocumentsPage() {
  const handleDownload = () => {
    window.open(PERSONAL_DATA_TEMPLATE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6 pb-4">
        {/* Заголовок */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/document.png"
              alt="Документы"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold tracking-tight">Документы</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground line-clamp-2">
              Шаблоны и документы для работы с пациентами.
            </p>
          </div>
        </div>

        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg md:text-xl font-display font-bold tracking-tight">
              Шаблон документа о персональных данных
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Пожалуйста, распечатайте и подпишите документ перед началом консультации, чтобы зафиксировать согласие пациента
              на обработку персональных данных.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            <Button
              onClick={handleDownload}
              className="w-full h-12 min-h-[48px] rounded-xl sm:rounded-2xl text-base font-medium touch-manipulation"
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать .docx
            </Button>
          </CardContent>
        </Card>

        {EXTRA_DOCUMENTS.map((doc) => (
          <Card key={doc.url} className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg md:text-xl font-display font-bold tracking-tight">
                {doc.title}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {doc.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="w-full h-12 min-h-[48px] rounded-xl sm:rounded-2xl text-base font-medium touch-manipulation"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Открыть
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}

        <div className="rounded-2xl sm:rounded-3xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 sm:p-6">
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            Исключительные права на ПО полностью принадлежит Индивидуальному предпринимателю
            Коростелеву Александру Андреевичу, ИНН&nbsp;/&nbsp;ОГРН: ИНН&nbsp;312334497069;
            ОГРН&nbsp;323508100020560, адрес: 140002, РОССИЯ, МОСКОВСКАЯ ОБЛ, Г&nbsp;ЛЮБЕРЦЫ,
            УЛ&nbsp;КИРОВА, Д&nbsp;9, КОРП&nbsp;2, КВ&nbsp;375.
          </p>
          <p className="mt-2 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            ОКВЭД: 62.01&nbsp;— Разработка компьютерного программного обеспечения. ПО распространяется
            в виде интернет-сервиса, специальные действия по установке ПО на стороне пользователя
            не требуются, общее описание системных требований содержится в инструкции.
          </p>
        </div>
      </div>
    </Layout>
  );
}

