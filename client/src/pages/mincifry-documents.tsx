import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  MINCIFRY_DOCUMENTS,
  getMincifryDocumentUrl,
  downloadMincifryDocument,
} from '@/lib/documents/mincifry-documents';

const DOCUMENT_CARD_CLASS =
  'border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl h-full flex flex-col';

const DOCUMENT_GRID_CLASS =
  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 items-stretch';

/** Скрытая страница документации для Минцифры — только по прямой ссылке, без навигации в приложении. */
export default function MincifryDocumentsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src="/OdontaLogo.svg"
            alt="Odonta AI"
            className="w-10 h-10 sm:w-12 sm:h-12 shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold tracking-tight">
              Документация Odonta AI
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Комплект документов для регистрации программного обеспечения
            </p>
          </div>
        </div>

        <div className={DOCUMENT_GRID_CLASS}>
          {MINCIFRY_DOCUMENTS.map((doc) => {
            const url = getMincifryDocumentUrl(doc.fileName);

            return (
              <Card key={doc.fileName} className={DOCUMENT_CARD_CLASS}>
                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 flex-1">
                  <CardTitle className="text-sm sm:text-base font-display font-bold tracking-tight leading-snug">
                    {doc.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 mt-auto">
                  <Button
                    onClick={() => downloadMincifryDocument(url, doc.fileName)}
                    className="w-full h-11 min-h-[44px] rounded-xl sm:rounded-2xl text-sm font-medium touch-manipulation"
                  >
                    <Download className="w-4 h-4 mr-2 shrink-0" />
                    Скачать .docx
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-border/60 bg-card/70 backdrop-blur-sm p-4 sm:p-6">
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            Исключительные права на ПО полностью принадлежит Индивидуальному предпринимателю
            Коростелеву Александру Андреевичу, ИНН&nbsp;312334497069, ОГРНИП&nbsp;323508100020560,
            адрес: 140002, РОССИЯ, МОСКОВСКАЯ ОБЛ, Г&nbsp;ЛЮБЕРЦЫ, УЛ&nbsp;КИРОВА, Д&nbsp;9, КОРП&nbsp;2, КВ&nbsp;375.
          </p>
        </div>
      </div>
    </div>
  );
}
