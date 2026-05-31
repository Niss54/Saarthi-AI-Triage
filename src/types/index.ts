export type TriageLevel = 'critical' | 'moderate' | 'mild';
export type PatientStatus = 'waiting' | 'called' | 'in-consultation' | 'done';
export type UrgencyLevel = 'immediate' | 'urgent' | 'semi-urgent' | 'non-urgent';

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
  // Enhanced fields
  urgencyLevel?: UrgencyLevel;
  severityScore?: number;
  confidenceScore?: number;
  riskFactors?: string[];
  possibleConditions?: string[];
  priorityScore?: number;
  emergencyFlags?: string[];
  crowdStatus?: string;
  patientsAhead?: number;
  departmentLoad?: string;
  fastTrack?: boolean;
  fastTrackReason?: string;
  followUpNeeded?: boolean;
  // Display helpers (set by frontend)
  name?: string;
  age?: number;
  waitTimeStr?: string;
  queueStr?: string;
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
  priorityScore?: number;
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
  fastTrackCount?: number;
}

export interface WaitTimeResult {
  estimatedWaitMinutes: number;
  queuePosition: number;
  patientsAhead: number;
  crowdStatus: string;
  departmentLoad: string;
}

export interface QueueStatusResult {
  totalInQueue: number;
  byDepartment: Record<string, number>;
  bySeverity: Record<string, number>;
  avgWaitTime: number;
  criticalCount: number;
  fastTrackActive: number;
}
