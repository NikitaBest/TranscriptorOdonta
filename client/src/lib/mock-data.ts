export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  lastVisit: string;
  summary: string;
  avatar?: string;
}

export interface Consultation {
  id: string;
  patientId?: string;
  patientName?: string;
  date: string;
  duration: string;
  status: 'processing' | 'ready' | 'error' | 'recording';
  summary: string;
  complaints: string;
  objective: string;
  plan: string;
  comments: string;
  transcript: string;
  audioUrl?: string;
}

export const MOCK_PATIENTS: Patient[] = [
  {
    id: "1",
    firstName: "Elena",
    lastName: "Volkova",
    phone: "+7 (999) 123-45-67",
    lastVisit: "2023-10-25T14:30:00",
    summary: "Caries treatment on tooth 46. Recommended hygiene.",
    avatar: "EV"
  },
  {
    id: "2",
    firstName: "Alexander",
    lastName: "Petrov",
    phone: "+7 (999) 987-65-43",
    lastVisit: "2023-11-12T10:00:00",
    summary: "Implant consultation. CT scan analysis.",
    avatar: "AP"
  },
  {
    id: "3",
    firstName: "Maria",
    lastName: "Sokolova",
    phone: "+7 (999) 555-01-23",
    lastVisit: "2023-11-20T16:45:00",
    summary: "Routine checkup. No issues found.",
    avatar: "MS"
  },
  {
    id: "4",
    firstName: "Dmitry",
    lastName: "Ivanov",
    phone: "+7 (999) 111-22-33",
    lastVisit: "2023-10-05T09:15:00",
    summary: "Pulpitis treatment. Tooth 24.",
    avatar: "DI"
  }
];

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: "c1",
    patientId: "1",
    patientName: "Elena Volkova",
    date: "2023-10-25T14:30:00",
    duration: "45:12",
    status: "ready",
    summary: "Patient complained of sensitivity to cold in the lower right jaw. Examination revealed deep caries in tooth 46. Local anesthesia administered. Cavity preparation and composite filling placed. Bite checked and polished.",
    complaints: "Sharp pain when drinking cold water, lingering for a few seconds. Located in lower right back tooth.",
    objective: "Tooth 46: Deep carious lesion on occlusal surface. Percussion negative. Thermal test positive (hypersensitivity). No mobility.",
    plan: "1. Infiltration anesthesia (Articaine 4%).\n2. Removal of carious tissue.\n3. Restoration with light-cured composite.\n4. Polishing.\n5. Recommendation: Avoid hard food for 2 hours.",
    comments: "Patient was anxious, handled well. Check contacts next visit.",
    transcript: "Doctor: Hello Elena, how are you feeling today? \nPatient: Hi Doctor, I have this sharp pain when I drink cold water. \nDoctor: Show me where exactly. \nPatient: Here, bottom right. \nDoctor: Okay, let's take a look. Open wide please. \n... [Transcript continues] ... \nDoctor: It looks like deep caries on tooth 46. We need to treat it today to avoid root canal. \nPatient: Is it going to hurt? \nDoctor: Not at all, I'll give you strong anesthesia."
  },
  {
    id: "c2",
    patientId: "2",
    patientName: "Alexander Petrov",
    date: "2023-11-12T10:00:00",
    duration: "30:00",
    status: "ready",
    summary: "Consultation regarding missing tooth 36. Discussed implant options vs bridge.",
    complaints: "Missing tooth on lower left. Difficulty chewing.",
    objective: "Edentulous space in region 36. Bone width appears sufficient on palpation. Adjacent teeth 35 and 37 are intact.",
    plan: "1. CBCT referral.\n2. Next visit: Treatment planning based on 3D image.\n3. Preliminary cost estimation provided.",
    comments: "Patient prefers implant over bridge.",
    transcript: "Doctor: Good morning Alexander. What brings you in? \nPatient: I lost this tooth a year ago and I want to fix it. \nDoctor: Okay, region 36. Have you thought about an implant? \nPatient: Yes, but I'm worried about the surgery."
  },
  {
    id: "c3",
    patientId: undefined, // No patient assigned
    patientName: undefined,
    date: "2023-11-27T08:30:00",
    duration: "05:23",
    status: "processing",
    summary: "Processing...",
    complaints: "Processing...",
    objective: "Processing...",
    plan: "Processing...",
    comments: "Processing...",
    transcript: "Processing..."
  }
];
