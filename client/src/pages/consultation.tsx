import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MOCK_CONSULTATIONS } from '@/lib/mock-data';
import { ArrowLeft, Download, Share2, Copy, Play, Pause, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ConsultationPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const consultation = MOCK_CONSULTATIONS.find(c => c.id === id);
  const [isPlaying, setIsPlaying] = useState(false);
  
  if (!consultation) return <div>Consultation not found</div>;

  const handleCopy = () => {
    toast({ title: "Copied to clipboard" });
  };

  const handleShare = () => {
    toast({ 
      title: "Public Link Created", 
      description: "Link copied to clipboard. This link is read-only for patients." 
    });
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Link href={consultation.patientId ? `/patient/${consultation.patientId}` : '/dashboard'}>
              <Button variant="ghost" className="pl-0 mb-2 hover:bg-transparent hover:text-primary gap-2 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-display font-bold tracking-tight">
              Consultation Report
            </h1>
            <p className="text-muted-foreground">
              {new Date(consultation.date).toLocaleDateString()} • {consultation.duration} • {consultation.patientName || "No Patient Assigned"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2" onClick={handleShare}>
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button variant="outline" className="rounded-xl gap-2">
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>

        {/* Audio Player Card */}
        <Card className="rounded-3xl border-border/50 bg-secondary/30 overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <Button 
              size="icon" 
              className="h-12 w-12 rounded-full shrink-0" 
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current ml-1" />}
            </Button>
            <div className="flex-1">
              <div className="h-12 flex items-center gap-1 opacity-50">
                 {/* Fake Waveform */}
                 {Array.from({ length: 60 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-foreground rounded-full" 
                      style={{ height: `${20 + Math.random() * 60}%` }}
                    />
                 ))}
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{consultation.duration}</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Report */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="report" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-secondary/50 rounded-2xl">
                <TabsTrigger value="report" className="rounded-xl">Medical Report</TabsTrigger>
                <TabsTrigger value="transcript" className="rounded-xl">Raw Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="report" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <ReportSection title="Chief Complaints" content={consultation.complaints} />
                <ReportSection title="Objective Status" content={consultation.objective} />
                <ReportSection title="Treatment Plan" content={consultation.plan} />
                <ReportSection title="Summary" content={consultation.summary} />
                <ReportSection title="Doctor's Comments" content={consultation.comments} isPrivate />
              </TabsContent>

              <TabsContent value="transcript" className="animate-in fade-in slide-in-from-bottom-2">
                <Card className="rounded-3xl border-border/50">
                  <CardContent className="p-6">
                    <div className="flex justify-end mb-4">
                      <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopy}>
                        <Copy className="w-3 h-3" /> Copy Text
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-mono text-sm">
                      {consultation.transcript}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">AI Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="secondary" className="w-full justify-start rounded-xl h-12 gap-3">
                  <RefreshCw className="w-4 h-4" /> Regenerate Report
                </Button>
                <Button variant="secondary" className="w-full justify-start rounded-xl h-12 gap-3">
                  <Check className="w-4 h-4" /> Validate with Protocols
                </Button>
              </CardContent>
            </Card>

            {!consultation.patientId && (
              <Card className="rounded-3xl border-destructive/20 bg-destructive/5">
                <CardHeader>
                   <CardTitle className="text-lg text-destructive">Unassigned</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">This consultation is not linked to any patient record.</p>
                  <Button className="w-full rounded-xl" variant="destructive">Link to Patient</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ReportSection({ title, content, isPrivate = false }: { title: string, content: string, isPrivate?: boolean }) {
  return (
    <Card className={cn("rounded-3xl border-border/50 transition-all hover:border-primary/20", isPrivate && "bg-secondary/20 border-dashed")}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
           <CardTitle className="text-lg font-bold">{title}</CardTitle>
           {isPrivate && <span className="text-[10px] uppercase tracking-wider font-bold bg-secondary px-2 py-1 rounded text-muted-foreground">Private</span>}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea 
          className="min-h-[100px] border-none resize-none focus-visible:ring-0 bg-transparent p-0 text-base leading-relaxed text-muted-foreground focus:text-foreground transition-colors"
          defaultValue={content}
        />
      </CardContent>
    </Card>
  );
}