import { TriageResult } from '../types';

interface TriageInput {
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  duration: string;
  hasCriticalSymptoms: boolean;
  onMedication: boolean;
  isPregnant?: boolean;
}

let queueCounter = 16; // starting after 15 mock patients

export function performTriage(input: TriageInput): TriageResult {
  const token = `APL-${Math.floor(1000 + Math.random() * 9000)}`;
  queueCounter++;

  const complaintLower = input.chiefComplaint.toLowerCase();
  const hasDangerWords = ['chest pain', 'seene', 'dard', 'saans', 'breathing', 'breathless', 'unconscious', 'behosh'].some(w => complaintLower.includes(w));

  // Critical: fever + chest pain + breathing difficulty
  if (input.hasCriticalSymptoms && hasDangerWords) {
    return {
      token,
      triageLevel: 'critical',
      department: 'Emergency',
      waitTimeMinutes: 0,
      queuePosition: 1,
      message: 'Kripya Token le lein aur Emergency OPD counter par turant jaayein. Aapka case critical hai.',
    };
  }

  // Moderate: duration > 1 month OR on medication
  if (input.duration === '1 mahine se zyada' || input.onMedication) {
    const depts = ['Medicine', 'Orthopaedics'];
    if (input.gender === 'Female' && input.isPregnant) {
      depts.unshift('Gynaecology');
    }
    const dept = depts[0];
    const waitTime = Math.floor(Math.random() * 16) + 15; // 15-30 min
    return {
      token,
      triageLevel: 'moderate',
      department: dept,
      waitTimeMinutes: waitTime,
      queuePosition: queueCounter,
      message: `Kripya Token le lein aur ${dept} OPD counter par jaayein. Aapka estimated wait time ${waitTime} minute hai.`,
    };
  }

  // Mild
  const waitTime = Math.floor(Math.random() * 31) + 30; // 30-60 min
  return {
    token,
    triageLevel: 'mild',
    department: 'General OPD',
    waitTimeMinutes: waitTime,
    queuePosition: queueCounter,
    message: `Kripya Token le lein aur General OPD counter par jaayein. Aapka estimated wait time ${waitTime} minute hai.`,
  };
}
