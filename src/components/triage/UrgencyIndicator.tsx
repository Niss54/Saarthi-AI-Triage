import type { TriageResult } from '../../types';
import { Shield, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

const URGENCY_CONFIG = {
  immediate: { icon: Zap, label: 'Immediate', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', pulse: true, time: '0-5 min' },
  urgent: { icon: AlertTriangle, label: 'Urgent', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', pulse: false, time: '10-15 min' },
  'semi-urgent': { icon: Shield, label: 'Semi-Urgent', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', pulse: false, time: '20-30 min' },
  'non-urgent': { icon: CheckCircle, label: 'Non-Urgent', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', pulse: false, time: '30-60 min' },
};

export default function UrgencyIndicator({ level }: { level?: string }) {
  const urgency = level && level in URGENCY_CONFIG
    ? URGENCY_CONFIG[level as keyof typeof URGENCY_CONFIG]
    : URGENCY_CONFIG['non-urgent'];

  const Icon = urgency.icon;

  return (
    <div className={`urgency-indicator ${urgency.pulse ? 'urgency-pulse' : ''}`} style={{ background: urgency.bg, borderColor: urgency.color }}>
      <Icon size={14} color={urgency.color} />
      <span style={{ color: urgency.color, fontWeight: 600, fontSize: '12px' }}>{urgency.label}</span>
      <span style={{ color: '#94a3b8', fontSize: '10px' }}>{urgency.time}</span>
    </div>
  );
}
