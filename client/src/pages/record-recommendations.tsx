import { useMemo } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

function RecordingRecommendationsContent() {
  return (
    <div className="space-y-5 md:space-y-4">
      <ul className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-3.5 md:gap-y-2.5 text-[0.9375rem] md:text-sm text-muted-foreground text-left leading-[1.55] md:leading-relaxed">
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>Держите телефон/микрофон близко к говорящему</span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>Не кладите устройство в карман, тумбочку или в сумку</span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>Расположите устройство на столе или держите в руке</span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>Избегайте фонового шума и посторонних разговоров</span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>
            Не блокируйте экран и не закрывайте вкладку с приложением во время записи — на телефоне запись может
            прерваться, если уйти в другой приложение или заблокировать устройство
          </span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>
            Для длинной консультации заранее подключите зарядку или следите за зарядом: при сильном энергосбережении ОС
            может ограничить работу браузера
          </span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>
            Пауза только ставит запись на паузу: микрофон остаётся занят до отправки. Чтобы завершить, нажмите «Пауза»,
            затем «Отправить» — до этого момента не начинайте новую запись в другой вкладке с тем же браузером
          </span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>
            Перед отправкой убедитесь в устойчивом интернете (лучше Wi‑Fi для длинных записей) — при обрыве загрузка
            может не пройти с первого раза; приложение попробует отправить снова, когда сеть появится
          </span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>
            При появлении запроса браузера на доступ к микрофону нажмите «Разрешить»; если доступ запрещён в настройках
            системы, запись будет недоступна
          </span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>
            Используйте актуальную версию браузера (Chrome, Safari и др.) — в устаревших версиях запись или пауза могут
            работать нестабильно
          </span>
        </li>
        <li className="flex items-start gap-2.5 md:gap-2 text-left md:col-span-2">
          <span className="text-primary mt-1 w-2 flex-shrink-0 text-center md:mt-0.5">•</span>
          <span>
            При плохом звуке в помещении можно использовать проводную гарнитуру с микрофоном, если она подключена к
            этому же устройству
          </span>
        </li>
      </ul>
      <p className="text-[0.9375rem] md:text-sm text-muted-foreground pt-5 md:pt-4 border-t border-border/50 text-left leading-[1.55] md:leading-relaxed text-pretty">
        Чем стабильнее запись и интернет, тем реже будут ошибки и обрывы, а транскрипция и медицинский отчёт — точнее
      </p>
    </div>
  );
}

export default function RecordRecommendationsPage() {
  const backHref = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patientId');
    return patientId ? `/record?patientId=${encodeURIComponent(patientId)}` : '/record';
  }, []);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl pt-2 pb-8 md:pt-8 md:pb-10">
        <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              '-ml-1 h-11 min-h-11 w-fit touch-manipulation gap-2 rounded-xl px-3 py-2 text-[0.9375rem] font-medium text-muted-foreground',
              'hover:bg-muted/60 hover:text-foreground md:h-9 md:min-h-0 md:pl-0 md:text-sm'
            )}
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
              Назад к записи
            </Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5 md:p-8">
          <h1 className="mb-4 text-balance text-left text-lg font-semibold tracking-tight text-foreground sm:text-xl md:mb-6 md:text-2xl">
            Рекомендации для качественной записи
          </h1>
          <RecordingRecommendationsContent />
        </div>
      </div>
    </Layout>
  );
}
