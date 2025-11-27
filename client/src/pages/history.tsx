import { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MOCK_CONSULTATIONS } from '@/lib/mock-data';
import { Search, FileText, Calendar, Filter, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unassigned'>('all');

  const filteredConsultations = MOCK_CONSULTATIONS.filter(c => {
    const matchesSearch = 
      (c.patientName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      c.summary.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'unassigned') {
      return matchesSearch && !c.patientId;
    }
    return matchesSearch;
  });

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">История консультаций</h1>
            <p className="text-muted-foreground mt-1">Архив всех записанных сессий и отчетов.</p>
          </div>
          <div className="flex gap-2">
             <Button 
               variant={filter === 'all' ? "default" : "outline"} 
               onClick={() => setFilter('all')}
               className="rounded-xl"
             >
               Все
             </Button>
             <Button 
               variant={filter === 'unassigned' ? "default" : "outline"} 
               onClick={() => setFilter('unassigned')}
               className="rounded-xl"
             >
               Только непривязанные
             </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Поиск по транскрипциям, выжимкам или именам..." 
            className="h-14 pl-12 rounded-2xl bg-white border-border/50 shadow-sm text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {filteredConsultations.map((consultation) => (
            <Link key={consultation.id} href={`/consultation/${consultation.id}`}>
              <Card className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 rounded-3xl overflow-hidden hover:border-primary/20">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                  {/* Date Box */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-secondary/50 rounded-2xl border border-border/50">
                    <span className="text-xs font-bold uppercase text-muted-foreground">{format(new Date(consultation.date), 'MMM', { locale: ru })}</span>
                    <span className="text-xl font-display font-bold">{format(new Date(consultation.date), 'd')}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className={cn("text-lg font-bold", !consultation.patientName && "text-muted-foreground italic")}>
                        {consultation.patientName || "Пациент не назначен"}
                      </h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        consultation.status === 'ready' ? "bg-green-50 text-green-700 border-green-200" : 
                        consultation.status === 'processing' ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        "bg-secondary text-secondary-foreground border-border"
                      )}>
                        {consultation.status === 'ready' ? 'Готово' : 
                         consultation.status === 'processing' ? 'Обработка' : 
                         consultation.status === 'error' ? 'Ошибка' : consultation.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {consultation.summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(consultation.date), 'HH:mm')}
                      </span>
                      <span>Длительность: {consultation.duration}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity self-center">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ArrowUpRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {filteredConsultations.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">Консультации не найдены</h3>
              <p className="text-muted-foreground">Попробуйте изменить фильтры или поисковый запрос.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}