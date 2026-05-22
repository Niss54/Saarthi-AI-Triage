import { QueueItem, TriageResult, Department, Insight, ActivityFeedItem, StatsData } from '../types';
import { mockQueue, mockDepartments, mockInsights, mockFeed, mockStats, generateRandomPatient } from '../data/mockData';
import { performTriage } from '../utils/triageLogic';

const API_BASE = 'http://localhost:8000';
const USE_REAL_API = true; // Toggle to true when backend is ready

// --- Triage ---
export async function triagePatient(data: {
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  duration: string;
  hasCriticalSymptoms: boolean;
  onMedication: boolean;
  isPregnant?: boolean;
}): Promise<TriageResult> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/api/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  }
  // Mock: use local triage logic
  await new Promise(r => setTimeout(r, 2000));
  return performTriage(data);
}

// --- Queue ---
export async function getQueue(): Promise<QueueItem[]> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/api/queue`);
    return res.json();
  }
  return [...mockQueue];
}

export async function addSimulatedPatient(): Promise<QueueItem> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/api/queue/add`, { method: 'POST' });
    return res.json();
  }
  return generateRandomPatient();
}

// --- Departments ---
export async function getDepartments(): Promise<Department[]> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/api/departments`);
    return res.json();
  }
  return [...mockDepartments];
}

// --- Stats ---
export async function getStats(): Promise<StatsData> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/api/stats`);
    return res.json();
  }
  return { ...mockStats };
}

// --- Insights ---
export async function getInsights(): Promise<Insight[]> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/api/insights`);
    return res.json();
  }
  return [...mockInsights];
}

// --- Feed ---
export async function getFeed(): Promise<ActivityFeedItem[]> {
  if (USE_REAL_API) {
    const res = await fetch(`${API_BASE}/api/feed`);
    return res.json();
  }
  return [...mockFeed];
}
