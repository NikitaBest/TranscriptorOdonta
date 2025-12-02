import { Link, useParams } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getConsultationsByPatient, getPatientById } from '@/lib/mock-data';
import { Mic, ArrowLeft, Phone, Calendar, FileText, Play, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';

export default function PatientProfile() {
  const { id } = useParams();
  const patient = getPatientById(id);
  const consultations = getConsultationsByPatient(id);

  if (!patient) return <div>Пациент не найден</div>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Navigation & Header */}
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary mb-4 gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              К списку пациентов
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-card p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-[2rem] border border-border/50 shadow-sm">
            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
              <Avatar className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] text-xl md:text-2xl font-bold bg-secondary shrink-0">
                <AvatarFallback className="rounded-2xl md:rounded-[1.5rem]">{patient.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight mb-2 truncate">{patient.firstName} {patient.lastName}</h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full bg-secondary/50 border border-border/50 whitespace-nowrap">
                    <Phone className="w-3 h-3" /> <span className="truncate">{patient.phone}</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full bg-secondary/50 border border-border/50 whitespace-nowrap">
                    <Calendar className="w-3 h-3" /> С {format(new Date(patient.lastVisit), 'MMM yyyy', { locale: ru })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 w-full md:w-auto">
               <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-11 md:h-12 border-border/50 text-sm md:text-base">
                Редактировать
              </Button>
              <Link href={`/record?patientId=${patient.id}`} className="flex-1 md:flex-none">
                <Button className="w-full md:w-auto rounded-xl h-11 md:h-12 gap-2 shadow-lg shadow-primary/20 text-sm md:text-base">
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Новая консультация</span>
                  <span className="sm:hidden">Консультация</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content - History */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-display font-bold">История консультаций</h2>
            <div className="space-y-4">
              {consultations.map(consultation => (
                <Link key={consultation.id} href={`/consultation/${consultation.id}`}>
                  <Card className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 rounded-3xl overflow-hidden hover:border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold">Консультация</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(consultation.date), 'd MMMM yyyy • HH:mm', { locale: ru })}
                            </div>
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-secondary text-xs font-medium">
                          {consultation.duration}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 pl-[3.25rem]">
                        {consultation.summary}
                      </p>
                      <div className="pl-[3.25rem]">
                         <Button variant="link" className="p-0 h-auto text-primary gap-1 group-hover:underline">
                           Открыть отчет <ArrowLeft className="w-3 h-3 rotate-180" />
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {consultations.length === 0 && (
                <div className="text-center py-12 bg-secondary/20 rounded-3xl border border-dashed border-border">
                  <p className="text-muted-foreground">Консультаций пока нет.</p>
                  <Link href={`/record?patientId=${patient.id}`}>
                    <Button variant="link" className="mt-2">Начать первую консультацию</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Notes */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-display font-bold">Заметки врача</h2>
            <Card className="border-border/50 rounded-3xl shadow-sm overflow-hidden">
              <Textarea 
                placeholder="Добавить личные заметки о пациенте..." 
                className="min-h-[200px] w-full border-none resize-none focus-visible:ring-0 bg-transparent p-4 text-sm leading-relaxed break-words"
                defaultValue="У пациента высокая тревожность перед стоматологическими процедурами. Предпочитает подробные объяснения перед любыми действиями. Аллергия на пенициллин."
              />
              <div className="p-4 border-t border-border/50 bg-secondary/20 flex justify-end">
                <Button size="sm" variant="ghost" className="gap-2 text-xs">
                  <Edit className="w-3 h-3" /> Сохранить
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}