import { Link, useParams } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MOCK_PATIENTS, MOCK_CONSULTATIONS } from '@/lib/mock-data';
import { Mic, ArrowLeft, Phone, Calendar, FileText, Play, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

export default function PatientProfile() {
  const { id } = useParams();
  const patient = MOCK_PATIENTS.find(p => p.id === id);
  const consultations = MOCK_CONSULTATIONS.filter(c => c.patientId === id);

  if (!patient) return <div>Patient not found</div>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Navigation & Header */}
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary mb-4 gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Patients
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-6 md:p-8 rounded-[2rem] border border-border/50 shadow-sm">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 rounded-[1.5rem] text-2xl font-bold bg-secondary">
                <AvatarFallback className="rounded-[1.5rem]">{patient.avatar}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-display font-bold tracking-tight mb-2">{patient.firstName} {patient.lastName}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 border border-border/50">
                    <Phone className="w-3 h-3" /> {patient.phone}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 border border-border/50">
                    <Calendar className="w-3 h-3" /> Since {format(new Date(patient.lastVisit), 'MMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
               <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-12 border-border/50">
                Edit Profile
              </Button>
              <Link href={`/record?patientId=${patient.id}`}>
                <Button className="flex-1 md:flex-none rounded-xl h-12 gap-2 shadow-lg shadow-primary/20">
                  <Mic className="w-4 h-4" />
                  New Consultation
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - History */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-display font-bold">Consultation History</h2>
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
                            <div className="font-bold">Consultation</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(consultation.date), 'MMMM d, yyyy • HH:mm')}
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
                           View Report <ArrowLeft className="w-3 h-3 rotate-180" />
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              
              {consultations.length === 0 && (
                <div className="text-center py-12 bg-secondary/20 rounded-3xl border border-dashed border-border">
                  <p className="text-muted-foreground">No consultations recorded yet.</p>
                  <Link href={`/record?patientId=${patient.id}`}>
                    <Button variant="link" className="mt-2">Start first consultation</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Notes */}
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold">Doctor's Notes</h2>
            <Card className="border-border/50 rounded-3xl shadow-sm">
              <CardContent className="p-4">
                <Textarea 
                  placeholder="Add private notes about this patient..." 
                  className="min-h-[200px] border-none resize-none focus-visible:ring-0 bg-transparent p-0 text-sm leading-relaxed"
                  defaultValue="Patient has high anxiety regarding dental procedures. Prefers detailed explanations before any action. Allergic to Penicillin."
                />
              </CardContent>
              <div className="p-4 border-t border-border/50 bg-secondary/20 flex justify-end">
                <Button size="sm" variant="ghost" className="gap-2 text-xs">
                  <Edit className="w-3 h-3" /> Save Notes
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}