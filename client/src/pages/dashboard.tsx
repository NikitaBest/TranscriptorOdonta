import { useState } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Mic, ChevronRight, Calendar, Phone } from 'lucide-react';
import { MOCK_PATIENTS, Patient } from '@/lib/mock-data';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const { toast } = useToast();

  // New patient form state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filteredPatients = patients.filter(p => 
    p.firstName.toLowerCase().includes(search.toLowerCase()) || 
    p.lastName.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  const handleAddPatient = () => {
    if (!newFirstName || !newLastName) return;
    
    const newPatient: Patient = {
      id: Math.random().toString(36).substr(2, 9),
      firstName: newFirstName,
      lastName: newLastName,
      phone: newPhone,
      lastVisit: new Date().toISOString(),
      summary: "New patient registration",
      avatar: `${newFirstName[0]}${newLastName[0]}`.toUpperCase()
    };

    setPatients([newPatient, ...patients]);
    setNewPatientOpen(false);
    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
    
    toast({
      title: "Patient Added",
      description: `${newFirstName} ${newLastName} has been added to your list.`,
    });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Patients</h1>
            <p className="text-muted-foreground mt-1">Manage your patient records and consultations.</p>
          </div>
          <div className="flex gap-3">
             <Link href="/record">
              <Button variant="secondary" className="h-12 rounded-xl px-6 gap-2 font-medium">
                <Mic className="w-4 h-4" />
                Quick Note
              </Button>
            </Link>
            
            <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 rounded-xl px-6 gap-2 font-medium shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" />
                  Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display">New Patient</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={newLastName} onChange={e => setNewLastName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="rounded-xl" placeholder="+1 ..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddPatient} className="w-full rounded-xl h-12">Create Patient Profile</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
            className="h-14 pl-12 rounded-2xl bg-white border-border/50 shadow-sm text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Patient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Link key={patient.id} href={`/patient/${patient.id}`}>
              <Card className="group cursor-pointer hover:shadow-md transition-all duration-300 border-border/50 rounded-3xl overflow-hidden hover:border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg">
                        <AvatarFallback className="rounded-2xl">{patient.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg leading-none mb-1">{patient.firstName} {patient.lastName}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {patient.phone}
                        </div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-secondary/30 p-3 rounded-xl">
                      <p className="text-sm line-clamp-2 text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground mr-1">Last Visit:</span> 
                        {patient.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(patient.lastVisit), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}