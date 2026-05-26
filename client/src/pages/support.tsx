import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, Phone, MessageCircle } from 'lucide-react';

export default function SupportPage() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 space-y-4 sm:space-y-6 pb-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shrink-0">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold tracking-tight">
              Поддержка
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground line-clamp-2">
              Свяжитесь с нами любым удобным способом.
            </p>
          </div>
        </div>

        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg font-display font-bold tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Режим работы
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            <p className="text-sm sm:text-base">
              5/2, с 10:00 до 19:00 по московскому времени
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg font-display font-bold tracking-tight flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Каналы обращения
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-3">
            <div className="space-y-2">
              <a
                href="mailto:drkorostelev@mail.ru"
                className="flex items-center gap-3 text-sm sm:text-base hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                drkorostelev@mail.ru
              </a>
              <a
                href="mailto:ontheknee.dev@gmail.com"
                className="flex items-center gap-3 text-sm sm:text-base hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                ontheknee.dev@gmail.com
              </a>
              <a
                href="tel:+79251547189"
                className="flex items-center gap-3 text-sm sm:text-base hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                +7 (925) 154-71-89
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg font-display font-bold tracking-tight flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            <a
              href="https://t.me/odonta_ai_support"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full h-12 min-h-[48px] rounded-xl sm:rounded-2xl text-base font-medium touch-manipulation">
                <MessageCircle className="w-4 h-4 mr-2" />
                Написать в Telegram
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
