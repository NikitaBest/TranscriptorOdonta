import { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { walletApi } from '@/lib/api/wallet';
import { Loader2, List } from 'lucide-react';

/** Секунды всегда двумя цифрами (05, 09) */
function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

/** Форматирует доступное время: часы, минуты, секунды (секунды — всегда два знака) */
function formatBalanceTime(availableSeconds: number): string {
  const total = Math.max(0, Math.floor(availableSeconds));
  if (total === 0) return '0 ч 00 мин 00 сек';

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${h} ч ${pad2(m)} мин ${pad2(s)} сек`;
  }
  if (m > 0) {
    return `${m} мин ${pad2(s)} сек`;
  }
  return `${pad2(s)} сек`;
}

function formatRub(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(rounded);
}

export default function WalletPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: balance, isLoading: isLoadingBalance, error: balanceError } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => walletApi.getBalance(),
  });

  const PAYMENT_HISTORY_PAGE_SIZE = 10;
  const USAGE_HISTORY_PAGE_SIZE = 10;

  const paymentHistoryQuery = useInfiniteQuery({
    queryKey: ['wallet', 'payment-history'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      walletApi.getPaymentHistory({
        pageNumber: pageParam,
        pageSize: PAYMENT_HISTORY_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasNext ? allPages.length + 1 : undefined),
  });

  const { data: tariff = [] } = useQuery({
    queryKey: ['wallet', 'tariff'],
    queryFn: () => walletApi.getTariff(),
  });

  const usageHistoryQuery = useInfiniteQuery({
    queryKey: ['wallet', 'usage-history'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      walletApi.getUsageHistory({
        pageNumber: pageParam,
        pageSize: USAGE_HISTORY_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasNext ? allPages.length + 1 : undefined),
  });

  // Калькулятор покупки минут: цена из тарифа (первый уровень или подходящий по minMinutes)
  const [minutesToBuy, setMinutesToBuy] = useState<string>('30');
  const parsedMinutes = Number(minutesToBuy.replace(',', '.'));
  const applicableTier =
    tariff.length > 0
      ? [...tariff]
          .filter((t) => t.minMinutes <= parsedMinutes)
          .sort((a, b) => b.minMinutes - a.minMinutes)[0] ?? tariff[0]
      : null;
  const pricePerMinute = applicableTier?.pricePerMinuteDisplay ?? 10;
  const minMinutesFromTariff = tariff.length > 0 ? Math.min(...tariff.map((t) => t.minMinutes)) : 0;
  const isValidMinutes = !isNaN(parsedMinutes) && parsedMinutes > 0 && parsedMinutes >= minMinutesFromTariff;
  const totalPrice = isValidMinutes ? parsedMinutes * pricePerMinute : 0;

  const handleChangeMinutes = (value: string) => {
    // Разрешаем только цифры, точку и запятую
    const cleaned = value.replace(/[^\d.,]/g, '');
    setMinutesToBuy(cleaned);
  };

  const [isInitiating, setIsInitiating] = useState(false);

  const handlePay = async () => {
    if (!isValidMinutes) {
      toast({
        title: 'Некорректное количество минут',
        description: 'Введите положительное количество минут, чтобы оформить оплату.',
        variant: 'destructive',
      });
      return;
    }

    setIsInitiating(true);
    try {
      const result = await walletApi.createPayment({ minutes: Math.round(parsedMinutes) });
      if (result.paymentURL) {
        toast({
          title: 'Переход к оплате',
          description: `Сумма ${result.amount} ₽. Вы будете перенаправлены на страницу оплаты.`,
        });
        window.location.href = result.paymentURL;
        return;
      }
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'payment-history'] });
        queryClient.invalidateQueries({ queryKey: ['wallet', 'usage-history'] });
        toast({ title: 'Платёж создан', description: result.message || 'Оплата инициирована.' });
      } else {
        toast({
          title: 'Ошибка оплаты',
          description: result.message || result.errorCode || 'Не удалось инициировать платёж.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Не удалось инициировать платёж.';
      toast({ title: 'Ошибка', description: message, variant: 'destructive' });
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6 pb-4">
        {/* Заголовок */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/wallet.png"
              alt="Кошелёк"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold tracking-tight">Кошелёк</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground line-clamp-2">
              Покупайте и используйте минуты для расшифровки и AI‑отчётов.
            </p>
          </div>
        </div>

        <Tabs defaultValue="balance" className="w-full">
          <TabsList className="w-full grid grid-cols-3 min-h-[48px] sm:min-h-[44px] h-auto rounded-xl sm:rounded-2xl bg-muted/80 p-1.5 sm:p-1 gap-1 sm:gap-0">
            <TabsTrigger
              value="balance"
              className="rounded-lg sm:rounded-xl text-[11px] min-[400px]:text-xs sm:text-sm font-medium data-[state=active]:shadow py-2.5 sm:py-1.5 px-0.5 min-[400px]:px-1 sm:px-2 md:px-3 min-h-[44px] touch-manipulation leading-tight whitespace-normal text-center"
            >
              <span className="sm:hidden">Баланс</span>
              <span className="hidden sm:inline">Баланс и оплата</span>
            </TabsTrigger>
            <TabsTrigger
              value="credits"
              className="rounded-lg sm:rounded-xl text-[11px] min-[400px]:text-xs sm:text-sm font-medium data-[state=active]:shadow py-2.5 sm:py-1.5 px-0.5 min-[400px]:px-1 sm:px-2 md:px-3 min-h-[44px] touch-manipulation leading-tight whitespace-normal text-center"
            >
              Пополнения
            </TabsTrigger>
            <TabsTrigger
              value="debits"
              className="rounded-lg sm:rounded-xl text-[11px] min-[400px]:text-xs sm:text-sm font-medium data-[state=active]:shadow py-2.5 sm:py-1.5 px-0.5 min-[400px]:px-1 sm:px-2 md:px-3 min-h-[44px] touch-manipulation leading-tight whitespace-normal text-center"
            >
              Списания
            </TabsTrigger>
          </TabsList>

          <TabsContent value="balance" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
        {/* Текущий баланс */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg md:text-xl">Текущий баланс</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Доступное время для расшифровки и обработки консультаций.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            {isLoadingBalance ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span className="text-sm">Загрузка баланса...</span>
              </div>
            ) : balanceError ? (
              <p className="text-sm text-destructive py-2">
                {(balanceError as { message?: string })?.message || 'Не удалось загрузить баланс.'}
              </p>
            ) : balance != null ? (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2 flex-wrap break-words">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-display font-bold leading-tight">
                    {formatBalanceTime(
                      balance.availableSeconds ?? Math.round((balance.availableMinutes ?? 0) * 60)
                    )}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Осталось для расшифровки и обработки консультаций
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Тарифы */}
        {tariff.length > 0 && (
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                <List className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                Тарифы
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Стоимость минуты зависит от объёма покупки. Чем больше минут — тем выгоднее.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
              <ul className="space-y-1.5 sm:space-y-2">
                {[...tariff]
                  .sort((a, b) => a.minMinutes - b.minMinutes)
                  .map((tier) => (
                    <li
                      key={tier.minMinutes}
                      className="flex items-center justify-between gap-2 sm:gap-4 py-2.5 sm:py-2 px-3 rounded-lg sm:rounded-xl bg-secondary/40 min-h-[44px]"
                    >
                      <span className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">
                        от {tier.minMinutes.toLocaleString('ru-RU')} мин
                      </span>
                      <span className="text-sm md:text-base font-semibold shrink-0">
                        {tier.pricePerMinuteDisplay} ₽/мин
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Калькулятор покупки минут */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg md:text-xl">Калькулятор минут</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Укажите, сколько минут хотите докупить, и увидите ориентировочную стоимость.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Сколько минут хотите купить?
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={minutesToBuy}
                  onChange={(e) => handleChangeMinutes(e.target.value)}
                  className="h-12 sm:h-11 min-h-[44px] rounded-xl sm:rounded-2xl w-full sm:max-w-[180px] text-base"
                  placeholder="Например, 60"
                />
                <div className="flex items-center text-sm text-muted-foreground">
                  мин.
                </div>
              </div>
              {!isValidMinutes && minutesToBuy.trim() !== '' && (
                <p className="text-xs text-destructive">
                  {minMinutesFromTariff > 0
                    ? `Минимальное количество минут: ${minMinutesFromTariff}`
                    : 'Введите корректное число минут больше нуля.'}
                </p>
              )}
            </div>

            <div className="rounded-xl sm:rounded-2xl bg-secondary/50 border border-border/50 p-3 sm:p-4 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm md:text-base gap-2">
                <span className="text-muted-foreground">Цена за 1 минуту</span>
                <span className="font-medium shrink-0">{pricePerMinute} ₽</span>
              </div>
              <div className="flex justify-between text-sm md:text-base gap-2">
                <span className="text-muted-foreground">Вы выбрали</span>
                <span className="font-medium shrink-0">
                  {isValidMinutes ? parsedMinutes : 0} мин.
                </span>
              </div>
              <div className="flex justify-between text-sm md:text-base pt-1 border-t border-border/40 mt-1 gap-2">
                <span className="font-medium">Итого к оплате</span>
                <span className="font-display font-bold text-base sm:text-lg shrink-0">
                  {totalPrice.toFixed(0)} ₽
                </span>
              </div>
            </div>

            <Button
              className="w-full h-12 min-h-[48px] sm:h-11 md:h-12 rounded-xl sm:rounded-2xl text-base font-medium touch-manipulation"
              size="lg"
              onClick={handlePay}
              disabled={!isValidMinutes || isInitiating}
            >
              {isInitiating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Подготовка оплаты...
                </>
              ) : (
                'Оплатить'
              )}
            </Button>

            <p className="text-xs md:text-sm text-muted-foreground">
              В ближайшем обновлении здесь появится выбор способа оплаты.
            </p>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="credits" className="mt-4 sm:mt-6">
        {/* История пополнений — только список */}
        <div className="rounded-2xl sm:rounded-3xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-border/50">
            <h2 className="text-base sm:text-lg font-display font-bold">История пополнений</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Платежи по пополнению баланса минут.</p>
          </div>
          <div className="p-3 sm:p-4">
            {paymentHistoryQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span className="text-sm">Загрузка истории...</span>
              </div>
            ) : paymentHistoryQuery.data && paymentHistoryQuery.data.pages.flatMap((p) => p.data).length > 0 ? (
              <>
                <ul className="space-y-0">
                  {paymentHistoryQuery.data.pages.flatMap((p) => p.data).map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 sm:py-2.5 border-b border-border/50 last:border-0 min-h-[52px] sm:min-h-0"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(item.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                        </span>
                        <span className="text-sm font-medium">
                          +{Math.round(item.secondsPurchased / 60)} мин · {formatRub(item.amount)} ₽
                        </span>
                      </div>
                      {item.paidAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          Оплачено {format(new Date(item.paidAt), 'd MMM yyyy', { locale: ru })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {paymentHistoryQuery.hasNextPage && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl min-h-[44px] touch-manipulation"
                      disabled={paymentHistoryQuery.isFetchingNextPage}
                      onClick={() => paymentHistoryQuery.fetchNextPage()}
                    >
                      {paymentHistoryQuery.isFetchingNextPage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        `Показать ещё ${PAYMENT_HISTORY_PAGE_SIZE}`
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center px-2">
                Пока нет платежей. Пополнения появятся здесь после оплаты.
              </p>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="debits" className="mt-4 sm:mt-6">
        {/* История списаний — только список */}
        <div className="rounded-2xl sm:rounded-3xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-border/50">
            <h2 className="text-base sm:text-lg font-display font-bold">История списаний</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Списание минут за расшифровку и обработку консультаций.</p>
          </div>
          <div className="p-3 sm:p-4">
            {usageHistoryQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span className="text-sm">Загрузка истории...</span>
              </div>
            ) : usageHistoryQuery.data && usageHistoryQuery.data.pages.flatMap((p) => p.data).length > 0 ? (
              <>
                <ul className="space-y-0">
                  {usageHistoryQuery.data.pages.flatMap((p) => p.data).map((item) => {
                    const patientName =
                      item.consultation?.client?.firstName || item.consultation?.client?.lastName
                        ? [item.consultation.client.firstName, item.consultation.client.lastName].filter(Boolean).join(' ')
                        : null;
                    return (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 sm:py-2.5 border-b border-border/50 last:border-0 min-h-[52px] sm:min-h-0"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {format(new Date(item.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                          </span>
                          <span className="text-sm font-medium">
                            −{Math.round(item.secondsUsed / 60)} мин
                            {patientName && (
                              <span className="text-muted-foreground font-normal"> · <span className="truncate max-w-[120px] sm:max-w-none inline-block align-bottom">{patientName}</span></span>
                            )}
                          </span>
                        </div>
                        {item.consultationId ? (
                          <Link
                            href={`/consultation/${item.consultationId}`}
                            className="text-xs text-primary hover:underline shrink-0 py-2 px-1 -my-2 -mx-1 rounded touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-end"
                          >
                            К консультации →
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {usageHistoryQuery.hasNextPage && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl min-h-[44px] touch-manipulation"
                      disabled={usageHistoryQuery.isFetchingNextPage}
                      onClick={() => usageHistoryQuery.fetchNextPage()}
                    >
                      {usageHistoryQuery.isFetchingNextPage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        `Показать ещё ${USAGE_HISTORY_PAGE_SIZE}`
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center px-2">
                Пока нет списаний. Минуты списываются при обработке консультаций.
              </p>
            )}
          </div>
        </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

