import { useState } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function WalletPage() {
  const { toast } = useToast();

  // Временный фейковый баланс до подключения бэкенда
  const [balanceMinutes] = useState<number>(120);

  // Калькулятор покупки минут
  const [minutesToBuy, setMinutesToBuy] = useState<string>('30');

  // Временная фиксированная цена за минуту
  const PRICE_PER_MINUTE = 10; // ₽ за минуту (пока захардкожено)

  const parsedMinutes = Number(minutesToBuy.replace(',', '.'));
  const isValidMinutes = !isNaN(parsedMinutes) && parsedMinutes > 0;
  const totalPrice = isValidMinutes ? parsedMinutes * PRICE_PER_MINUTE : 0;

  const handleChangeMinutes = (value: string) => {
    // Разрешаем только цифры, точку и запятую
    const cleaned = value.replace(/[^\d.,]/g, '');
    setMinutesToBuy(cleaned);
  };

  const handlePay = () => {
    if (!isValidMinutes) {
      toast({
        title: 'Некорректное количество минут',
        description: 'Введите положительное количество минут, чтобы оформить оплату.',
        variant: 'destructive',
      });
      return;
    }

    // Здесь позже будет реальный вызов бэкенда/платёжного провайдера
    toast({
      title: 'Оплата в разработке',
      description: `Оплата на ${parsedMinutes} мин. (~${totalPrice.toFixed(0)} ₽) пока недоступна. Скоро здесь появится реальная оплата.`,
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Заголовок и баланс */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
            <img
              src="/wallet.png"
              alt="Кошелёк"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Кошелёк</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Покупайте и используйте минуты для расшифровки и AI‑отчётов.
            </p>
          </div>
        </div>

        {/* Текущий баланс */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-3xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg md:text-xl">Текущий баланс</CardTitle>
            <CardDescription>
              Это примерный баланс до подключения реального бэкенда.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-display font-bold">
                {balanceMinutes}
              </span>
              <span className="text-sm md:text-base text-muted-foreground">
                минут
              </span>
            </div>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">
              В будущем здесь будет реальный баланс, который синхронизируется с сервером.
            </p>
          </CardContent>
        </Card>

        {/* Калькулятор покупки минут */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-3xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg md:text-xl">Калькулятор минут</CardTitle>
            <CardDescription>
              Укажите, сколько минут хотите докупить, и увидите ориентировочную стоимость.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Сколько минут хотите купить?
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={minutesToBuy}
                  onChange={(e) => handleChangeMinutes(e.target.value)}
                  className="h-11 rounded-2xl max-w-[180px]"
                  placeholder="Например, 60"
                />
                <div className="flex items-center text-sm text-muted-foreground">
                  мин.
                </div>
              </div>
              {!isValidMinutes && minutesToBuy.trim() !== '' && (
                <p className="text-xs text-destructive">
                  Введите корректное число минут больше нуля.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-secondary/50 border border-border/50 p-3 md:p-4 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-muted-foreground">Цена за 1 минуту</span>
                <span className="font-medium">{PRICE_PER_MINUTE} ₽</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-muted-foreground">Вы выбрали</span>
                <span className="font-medium">
                  {isValidMinutes ? parsedMinutes : 0} мин.
                </span>
              </div>
              <div className="flex justify-between text-sm md:text-base pt-1 border-t border-border/40 mt-1">
                <span className="font-medium">Итого к оплате</span>
                <span className="font-display font-bold text-lg">
                  {totalPrice.toFixed(0)} ₽
                </span>
              </div>
            </div>

            <Button
              className="w-full h-11 md:h-12 rounded-2xl text-base font-medium"
              size="lg"
              onClick={handlePay}
              disabled={!isValidMinutes}
            >
              Оплатить
            </Button>

            <p className="text-xs md:text-sm text-muted-foreground">
              В ближайшем обновлении здесь появится выбор способа оплаты и история пополнений.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

