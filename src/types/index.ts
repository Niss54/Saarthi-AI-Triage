export type TriageLevel = 'critical' | 'moderate' | 'mild';
export type PatientStatus = 'waiting' | 'called' | 'in-consultation' | 'done';

export interface Patient {
  id: string;
  token: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  chiefComplaint: string;
  duration: string;
  hasCriticalSymptoms: boolean;
  onMedication: boolean;
  isPregnant?: boolean;
  timestamp: string;
}

export interface TriageResult {
  token: string;
  triageLevel: TriageLevel;
  department: string;
  waitTimeMinutes: number;
  queuePosition: number;
  message: string;
  aiReasoning?: string;
  assignedDoctor?: string;
  roomNumber?: string;
  isEmergency?: boolean;
  urgencyReason?: string;
  recommendedAction?: string;
}

export interface QueueItem {
  id: string;
  token: string;
  name: string;
  age: number;
  triageLevel: TriageLevel;
  chiefComplaint: string;
  department: string;
  waitTime: number;
  status: PatientStatus;
  timestamp: string;
  assignedDoctor?: string;
  roomNumber?: string;
  isEmergency?: boolean;
}

export interface Department {
  name: string;
  patientCount: number;
  avgWaitMinutes: number;
  capacity: number;
  status: 'normal' | 'busy' | 'critical';
}

export interface Insight {
  icon: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ActivityFeedItem {
  time: string;
  token: string;
  name: string;
  triageLevel: TriageLevel;
  department: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: string;
  isTriageResult?: boolean;
  triageResult?: TriageResult;
}

export interface StatsData {
  totalToday: number;
  avgWaitTime: number;
  criticalCount: number;
  activeDepartments: number;
}
